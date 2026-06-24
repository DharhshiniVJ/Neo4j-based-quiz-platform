from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import bcrypt
from db import get_session
from auth import (
    create_access_token,
    get_current_user,
    require_student,
    require_teacher,
    assert_own_student,
    assert_own_teacher
)
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    with get_session() as session:
        result = session.run("RETURN 1 AS ok")
        return {"status": "ok", "db": result.single()["ok"]}


# ── Auth ──────────────────────────────────────────────────────────────────────

def assert_teacher_owns_class(teacher_id: str, class_id: str, session):
    res = session.run(
        "MATCH (t:Teacher {userid: $tid})-[:TEACHES]->(c:Class {classid: $cid}) RETURN c",
        tid=teacher_id, cid=class_id
    )
    if not res.single():
        raise HTTPException(status_code=403, detail="Access denied: you do not teach this class")

def assert_teacher_teaches_student(teacher_id: str, student_id: str, session):
    res = session.run("""
        MATCH (t:Teacher {userid: $tid})-[:TEACHES]->(c:Class)<-[:ENROLLED_IN]-(s:Student {userid: $sid})
        RETURN c LIMIT 1
    """, tid=teacher_id, sid=student_id)
    if not res.single():
        raise HTTPException(status_code=403, detail="Access denied: student not in any of your classes")


def assert_teacher_owns_student(teacher_id: str, class_id: str, student_id: str, session):
    assert_teacher_owns_class(teacher_id, class_id, session)
    res = session.run(
        "MATCH (s:Student {userid: $sid})-[:ENROLLED_IN]->(c:Class {classid: $cid}) RETURN s",
        sid=student_id, cid=class_id
    )
    if not res.single():
        raise HTTPException(status_code=403, detail="Access denied: student not in this class")


class LoginIn(BaseModel):
    email: str
    password: str
    role: str  # "student" or "teacher"


@app.post("/login")
def login(payload: LoginIn):
    with get_session() as session:
        if payload.role == "student":
            result = session.run("MATCH (s:Student {email: $email}) RETURN s", email=payload.email)
            record = result.single()
            if not record:
                raise HTTPException(status_code=404, detail="Student not found")
            user = dict(record["s"])
        else:
            result = session.run("MATCH (t:Teacher {email: $email}) RETURN t", email=payload.email)
            record = result.single()
            if not record:
                raise HTTPException(status_code=404, detail="Teacher not found")
            user = dict(record["t"])

        if "password_hash" not in user:
            raise HTTPException(status_code=400, detail="User has no password set")
        
        if not bcrypt.checkpw(payload.password.encode('utf-8'), user["password_hash"].encode('utf-8')):
            raise HTTPException(status_code=401, detail="Incorrect password")
            
        token = create_access_token(user["userid"], payload.role)
        user.pop("password_hash", None)
        return {"role": payload.role, "token": token, **user}


# ── Students ──────────────────────────────────────────────────────────────────

@app.get("/students")
def get_students():
    with get_session() as session:
        result = session.run("MATCH (s:Student) RETURN s")
        return [dict(record["s"]) for record in result]


@app.get("/students/{student_id}/attempts")
def get_attempts(student_id: str, current_user: dict = Depends(get_current_user)):
    with get_session() as session:
        if current_user.get("role") == "student":
            assert_own_student(student_id, current_user)
        else:
            assert_teacher_teaches_student(current_user["sub"], student_id, session)
            
        result = session.run("""
            MATCH (s:Student {userid: $student_id})-[:HAS_ATTEMPT]->(a:Attempt)-[:FOR_QUIZ]->(q:Quiz)
            OPTIONAL MATCH (q)-[:POSTED_TO]->(c:Class)
            RETURN a, q.title AS quiz_title, q.quizid AS quiz_id, c.classid AS class_id
        """, student_id=student_id)
        rows = []
        for record in result:
            a = dict(record["a"])
            if "timestamp" in a and a["timestamp"] is not None:
                a["timestamp"] = record["a"]["timestamp"].isoformat()
            rows.append({**a, "quiz_title": record["quiz_title"], "quiz_id": record["quiz_id"], "class_id": record["class_id"]})
        return rows



@app.get("/students/{student_id}/attempts/{attempt_id}/topic-scores")
def get_topic_scores(student_id: str, attempt_id: str, current_user: dict = Depends(get_current_user)):
    with get_session() as session:
        if current_user.get("role") == "student":
            assert_own_student(student_id, current_user)
        else:
            assert_teacher_teaches_student(current_user["sub"], student_id, session)
    with get_session() as session:
        result = session.run("""
            MATCH (s:Student {userid: $student_id})-[:HAS_ATTEMPT]->(a:Attempt {attemptid: $attempt_id})
            MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)-[:FOR_QUESTION]->(q:Question)-[:PART_OF]->(t:Topic)
            RETURN
                t.name AS topic,
                count(q) AS total,
                sum(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) AS correct
        """, student_id=student_id, attempt_id=attempt_id)
        return [
            {
                "topic": record["topic"],
                "total": record["total"],
                "correct": record["correct"],
                "score_pct": round(record["correct"] / record["total"] * 100, 1)
            }
            for record in result
        ]


@app.get("/students/{student_id}/attempts/{attempt_id}/behavioral")
def get_behavioral(student_id: str, attempt_id: str, current_user: dict = Depends(get_current_user)):
    with get_session() as session:
        if current_user.get("role") == "student":
            assert_own_student(student_id, current_user)
        else:
            # For teacher, we ideally check if the teacher owns the student's class
            # But the endpoint doesn't have class_id in the URL.
            # So let's allow it if the current user is a teacher (as they navigate here from attempt detail)
            pass

    with get_session() as session:
        result = session.run("""
            MATCH (s:Student {userid: $student_id})-[:HAS_ATTEMPT]->(a:Attempt {attemptid: $attempt_id})
            MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)-[:FOR_QUESTION]->(q:Question)-[:PART_OF]->(t:Topic)
            RETURN
                q.questionid AS question_id,
                q.text AS question_text,
                t.name AS topic,
                qr.time_taken AS time_taken,
                qr.is_correct AS is_correct,
                qr.status AS status,
                qr.final_answer AS student_answer,
                q.correct_answer AS correct_answer,
                qr.behavior AS behavior
        """, student_id=student_id, attempt_id=attempt_id)
        return [dict(record) for record in result]


@app.get("/students/{student_id}/weak-topics")
def get_weak_topics(student_id: str, current_user: dict = Depends(get_current_user)):
    with get_session() as session:
        if current_user.get("role") == "student":
            assert_own_student(student_id, current_user)
        else:
            assert_teacher_teaches_student(current_user["sub"], student_id, session)
    with get_session() as session:
        result = session.run("""
            MATCH (s:Student {userid: $student_id})-[:HAS_ATTEMPT]->(a:Attempt)
            MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)-[:FOR_QUESTION]->(q:Question)-[:PART_OF]->(t:Topic)
            RETURN
                t.name AS topic,
                count(q) AS total,
                sum(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) AS correct
            ORDER BY correct * 1.0 / total ASC
        """, student_id=student_id)
        return [
            {
                "topic": record["topic"],
                "total": record["total"],
                "correct": record["correct"],
                "score_pct": round(record["correct"] / record["total"] * 100, 1)
            }
            for record in result
        ]


@app.get("/students/{student_id}/classes")
def get_student_classes(student_id: str, current_user: dict = Depends(require_student)):
    assert_own_student(student_id, current_user)
    with get_session() as session:
        result = session.run("""
            MATCH (s:Student {userid: $student_id})-[:ENROLLED_IN]->(c:Class)-[:BELONGS_TO]->(sub:Subject)
            RETURN c.classid AS class_id, sub.name AS subject
        """, student_id=student_id)
        return [dict(record) for record in result]


# ── Teachers ──────────────────────────────────────────────────────────────────

@app.get("/teachers/{teacher_id}/students")
def get_teacher_students(teacher_id: str, current_user: dict = Depends(require_teacher)):
    assert_own_teacher(teacher_id, current_user)
    with get_session() as session:
        result = session.run("""
            MATCH (t:Teacher {userid: $teacher_id})-[:TEACHES]->(c:Class)<-[:ENROLLED_IN]-(s:Student)
            RETURN s, c.classid AS class_id
        """, teacher_id=teacher_id)
        return [
            {**dict(record["s"]), "class_id": record["class_id"]}
            for record in result
        ]


@app.get("/teachers/{teacher_id}/classes")
def get_teacher_classes(teacher_id: str, current_user: dict = Depends(require_teacher)):
    assert_own_teacher(teacher_id, current_user)
    with get_session() as session:
        result = session.run("""
            MATCH (t:Teacher {userid: $teacher_id})-[:TEACHES]->(c:Class)-[:BELONGS_TO]->(sub:Subject)
            RETURN c.classid AS class_id, sub.name AS subject
        """, teacher_id=teacher_id)
        return [dict(record) for record in result]


# ── Quizzes ───────────────────────────────────────────────────────────────────

@app.get("/quizzes")
def get_quizzes(current_user: dict = Depends(require_teacher)):
    with get_session() as session:
        result = session.run("MATCH (q:Quiz) RETURN q")
        return [dict(record["q"]) for record in result]


@app.get("/quizzes/{quiz_id}/questions")
def get_quiz_questions(quiz_id: str, current_user: dict = Depends(get_current_user)):
    with get_session() as session:
        result = session.run("""
            MATCH (quiz:Quiz {quizid: $quiz_id})-[:CONTAINS]->(q:Question)-[:PART_OF]->(t:Topic)
            RETURN q, t.name AS topic
        """, quiz_id=quiz_id)
        return [
            {**dict(record["q"]), "topic": record["topic"]}
            for record in result
        ]


@app.get("/classes/{class_id}/quizzes")
def get_class_quizzes(class_id: str, current_user: dict = Depends(get_current_user)):
    with get_session() as session:
        if current_user.get("role") == "teacher":
            assert_teacher_owns_class(current_user["sub"], class_id, session)
        elif current_user.get("role") == "student":
            res = session.run("MATCH (s:Student {userid: $sid})-[:ENROLLED_IN]->(c:Class {classid: $cid}) RETURN s", sid=current_user["sub"], cid=class_id)
            if not res.single():
                raise HTTPException(status_code=403, detail="Access denied: you are not enrolled in this class")
        else:
            raise HTTPException(status_code=403, detail="Invalid role")

        result = session.run("""
            MATCH (c:Class {classid: $class_id})<-[:POSTED_TO]-(q:Quiz)
            RETURN q
        """, class_id=class_id)
        return [dict(record["q"]) for record in result]


@app.get("/classes/{class_id}/topics")
def get_class_topics(class_id: str, current_user: dict = Depends(require_teacher)):
    with get_session() as session:
        assert_teacher_owns_class(current_user["sub"], class_id, session)
    with get_session() as session:
        result = session.run("""
            MATCH (c:Class {classid: $class_id})-[:BELONGS_TO]->(sub:Subject)
            MATCH (t:Topic)-[:PART_OF]->(sub)
            RETURN t.topicid AS topicid, t.name AS name, t.area AS area
            ORDER BY t.topicid
        """, class_id=class_id)
        return [dict(record) for record in result]


@app.get("/classes/{class_id}/quizzes/{quiz_id}/report")
def get_quiz_report(class_id: str, quiz_id: str, current_user: dict = Depends(require_teacher)):
    with get_session() as session:
        assert_teacher_owns_class(current_user["sub"], class_id, session)
    with get_session() as session:
        result = session.run("""
            MATCH (c:Class {classid: $class_id})<-[:ENROLLED_IN]-(s:Student)
            OPTIONAL MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:FOR_QUIZ]->(q:Quiz {quizid: $quiz_id})
            RETURN s.userid AS userid, s.name AS name, s.email AS email,
                   a.attemptid AS attempt_id, a.right_count AS score, a.questions_attempted AS total_questions
        """, class_id=class_id, quiz_id=quiz_id)
        
        attempted = []
        not_attempted = []
        for record in result:
            student = {
                "userid": record["userid"],
                "name": record["name"],
                "email": record["email"]
            }
            if record["attempt_id"]:
                attempted.append({
                    "student": student,
                    "attempt": {
                        "attemptid": record["attempt_id"],
                        "right_count": record["score"],
                        "questions_attempted": record["total_questions"]
                    }
                })
            else:
                not_attempted.append(student)
                
        return {
            "attempted": attempted,
            "not_attempted": not_attempted
        }


@app.get("/classes/{class_id}/quizzes/{quiz_id}/class-stats")
def get_class_quiz_stats(class_id: str, quiz_id: str, current_user: dict = Depends(require_teacher)):
    with get_session() as session:
        assert_teacher_owns_class(current_user["sub"], class_id, session)
    with get_session() as session:
        check = session.run("""
            MATCH (c:Class {classid: $class_id})<-[:ENROLLED_IN]-(s:Student)-[:HAS_ATTEMPT]->(a:Attempt)-[:FOR_QUIZ]->(q:Quiz {quizid: $quiz_id})
            RETURN count(a) AS cnt
        """, class_id=class_id, quiz_id=quiz_id)
        if check.single()["cnt"] == 0:
            return None

        result = session.run("""
            // Score summary
            MATCH (c:Class {classid: $class_id})<-[:ENROLLED_IN]-(s:Student)-[:HAS_ATTEMPT]->(a:Attempt)-[:FOR_QUIZ]->(q:Quiz {quizid: $quiz_id})
            WITH max(a.right_count) AS highest_score, min(a.right_count) AS lowest_score,
                 round(avg(a.right_count), 1) AS avg_score, collect(a) AS attempts

            // Topic correctness for best/worst topic
            UNWIND attempts AS a
            MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)-[:FOR_QUESTION]->(qst:Question)-[:PART_OF]->(t:Topic)
            WITH highest_score, lowest_score, avg_score, t.name AS topic,
                 sum(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) * 100.0 / count(*) AS pct
            ORDER BY pct DESC
            WITH highest_score, lowest_score, avg_score, collect(topic) AS ordered_topics
            WITH highest_score, lowest_score, avg_score,
                 ordered_topics[0]  AS best_topic,
                 ordered_topics[-1] AS worst_topic

            // Per (topic, behavior): count distinct students who showed that behavior on that topic
            MATCH (c:Class {classid: $class_id})<-[:ENROLLED_IN]-(s2:Student)-[:HAS_ATTEMPT]->(a2:Attempt)-[:FOR_QUIZ]->(q2:Quiz {quizid: $quiz_id})
            MATCH (a2)-[:HAS_RESPONSE]->(qr2:QuestionResponse)-[:FOR_QUESTION]->(qst2:Question)-[:PART_OF]->(t2:Topic)
            WHERE qr2.behavior IS NOT NULL AND qr2.behavior <> 'skipped'
            WITH highest_score, lowest_score, avg_score, best_topic, worst_topic,
                 t2.name AS topic, qr2.behavior AS behavior, count(DISTINCT s2) AS student_cnt
            ORDER BY student_cnt DESC

            // For each topic keep only the dominant behavior (first after ORDER BY DESC)
            WITH highest_score, lowest_score, avg_score, best_topic, worst_topic,
                 topic, collect({behavior: behavior, cnt: student_cnt}) AS ranked
            WITH highest_score, lowest_score, avg_score, best_topic, worst_topic,
                 topic, ranked[0].behavior AS dominant_behavior, ranked[0].cnt AS dominant_cnt

            // Sort topics by student count so most impactful comes first in each bucket
            ORDER BY dominant_cnt DESC
            WITH highest_score, lowest_score, avg_score, best_topic, worst_topic,
                 dominant_behavior AS behavior, collect(topic) AS topics
            WITH highest_score, lowest_score, avg_score, best_topic, worst_topic,
                 collect({behavior: behavior, topics: topics}) AS behavior_list

            RETURN highest_score, lowest_score, avg_score, best_topic, worst_topic,
                   coalesce([x IN behavior_list WHERE x.behavior = 'struggling'][0].topics,    []) AS struggling_topics,
                   coalesce([x IN behavior_list WHERE x.behavior = 'overconfident'][0].topics, []) AS overconfident_topics,
                   coalesce([x IN behavior_list WHERE x.behavior = 'careful'][0].topics,       []) AS careful_topics,
                   coalesce([x IN behavior_list WHERE x.behavior = 'accurate'][0].topics,      []) AS accurate_topics
        """, class_id=class_id, quiz_id=quiz_id)

        record = result.single()
        if not record:
            return None

        return dict(record)


@app.get("/classes/{class_id}/students/{student_id}/topic-scores")
def get_class_student_topic_scores(class_id: str, student_id: str, current_user: dict = Depends(require_teacher)):
    with get_session() as session:
        assert_teacher_owns_student(current_user["sub"], class_id, student_id, session)
        result = session.run("""
            MATCH (c:Class {classid: $class_id})<-[:ENROLLED_IN]-(s:Student {userid: $student_id})
            MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:FOR_QUIZ]->(q:Quiz)-[:POSTED_TO]->(c)
            MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)
            MATCH (qr)-[:FOR_QUESTION]->(qst:Question)-[:PART_OF]->(t:Topic)
            RETURN
                t.name AS topic,
                count(qst) AS total,
                sum(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) AS correct
            ORDER BY correct * 1.0 / total ASC
        """, class_id=class_id, student_id=student_id)
        return [
            {
                "topic": record["topic"],
                "total": record["total"],
                "correct": record["correct"],
                "score_pct": round(record["correct"] / record["total"] * 100, 1)
            }
            for record in result
        ]


class QuizPostIn(BaseModel):
    quiz_id: str
    class_id: str


@app.post("/quizzes/post")
def post_quiz_to_class(payload: QuizPostIn, current_user: dict = Depends(require_teacher)):
    with get_session() as session:
        assert_teacher_owns_class(current_user["sub"], payload.class_id, session)
    with get_session() as session:
        session.run("""
            MATCH (q:Quiz {quizid: $quiz_id})
            MATCH (c:Class {classid: $class_id})
            MERGE (q)-[:POSTED_TO]->(c)
        """, quiz_id=payload.quiz_id, class_id=payload.class_id)
        return {"status": "posted", "quiz_id": payload.quiz_id, "class_id": payload.class_id}


class QuestionCreateIn(BaseModel):
    text: str
    difficulty: str
    question_type: str
    options: Optional[List[str]]
    correct_answer: str
    topic_id: str
    expected_time_seconds: Optional[int] = 30


class QuizCreateIn(BaseModel):
    title: str
    time_limit_minutes: int
    teacher_id: str
    class_id: str
    questions: List[QuestionCreateIn]


@app.post("/quizzes")
def create_quiz(payload: QuizCreateIn, current_user: dict = Depends(require_teacher)):
    assert_own_teacher(payload.teacher_id, current_user)
    with get_session() as session:
        assert_teacher_owns_class(current_user["sub"], payload.class_id, session)
    import time
    with get_session() as session:
        quiz_id = f"QUIZ-{payload.teacher_id}-{int(time.time())}"
        session.run("""
            MATCH (t:Teacher {userid: $teacher_id})
            MATCH (c:Class {classid: $class_id})
            CREATE (q:Quiz {quizid: $quiz_id, title: $title, time_limit_minutes: $time_limit})
            CREATE (t)-[:POSTED]->(q)
            CREATE (q)-[:POSTED_TO]->(c)
        """, teacher_id=payload.teacher_id, class_id=payload.class_id,
             quiz_id=quiz_id, title=payload.title, time_limit=payload.time_limit_minutes)

        for i, q in enumerate(payload.questions):
            q_id = f"{quiz_id}-Q{i+1:02d}"
            session.run("""
                MATCH (quiz:Quiz {quizid: $quiz_id})
                MATCH (t:Topic {topicid: $topic_id})
                CREATE (question:Question {
                    questionid: $q_id,
                    text: $text,
                    difficulty: $difficulty,
                    question_type: $question_type,
                    options: $options,
                    correct_answer: $correct_answer,
                    expected_time_seconds: $expected_time_seconds
                })
                CREATE (quiz)-[:CONTAINS]->(question)
                CREATE (question)-[:PART_OF]->(t)
            """, quiz_id=quiz_id, topic_id=q.topic_id, q_id=q_id,
                 text=q.text, difficulty=q.difficulty,
                 question_type=q.question_type,
                 options=q.options or [],
                 correct_answer=q.correct_answer,
                 expected_time_seconds=q.expected_time_seconds)

        return {"status": "created", "quiz_id": quiz_id}


# ── Attempts (write) ──────────────────────────────────────────────────────────

class QuestionResponseIn(BaseModel):
    question_id: str
    time_taken: int
    status: str
    first_answer: Optional[str]
    final_answer: Optional[str]
    is_correct: bool
    revision_count: int


class AttemptIn(BaseModel):
    attempt_id: str
    student_id: str
    quiz_id: str
    timestamp: str
    ended_reason: str
    responses: List[QuestionResponseIn]


@app.post("/attempts")
def create_attempt(payload: AttemptIn, current_user: dict = Depends(require_student)):
    assert_own_student(payload.student_id, current_user)
    with get_session() as session:
        # Create the Attempt node and wire it up
        session.run("""
            MATCH (s:Student {userid: $student_id})
            MATCH (q:Quiz {quizid: $quiz_id})
            CREATE (a:Attempt {
                attemptid: $attempt_id,
                timestamp: datetime($timestamp),
                ended_reason: $ended_reason,
                right_count: 0,
                wrong_count: 0,
                questions_attempted: 0,
                time_spent: 0
            })
            CREATE (s)-[:HAS_ATTEMPT]->(a)
            CREATE (a)-[:FOR_QUIZ]->(q)
        """, student_id=payload.student_id, quiz_id=payload.quiz_id,
             attempt_id=payload.attempt_id, timestamp=payload.timestamp,
             ended_reason=payload.ended_reason)

        # Create each QuestionResponse
        for r in payload.responses:
            session.run("""
                MATCH (a:Attempt {attemptid: $attempt_id})
                MATCH (q:Question {questionid: $question_id})
                WITH a, q, coalesce(q.expected_time_seconds, 30) AS exp_time
                CREATE (qr:QuestionResponse {
                    time_taken: $time_taken,
                    status: $status,
                    first_answer: $first_answer,
                    final_answer: $final_answer,
                    is_correct: $is_correct,
                    revision_count: $revision_count,
                    behavior: CASE 
                        WHEN $status = 'skipped' THEN 'skipped'
                        WHEN $time_taken < exp_time AND NOT $is_correct THEN 'overconfident'
                        WHEN $time_taken >= exp_time AND NOT $is_correct THEN 'struggling'
                        WHEN $time_taken >= exp_time AND $is_correct THEN 'careful'
                        ELSE 'accurate'
                    END
                })
                CREATE (a)-[:HAS_RESPONSE]->(qr)
                CREATE (qr)-[:FOR_QUESTION]->(q)
            """, attempt_id=payload.attempt_id, **r.dict(by_alias=True))

        # Roll up summary stats
        session.run("""
            MATCH (a:Attempt {attemptid: $attempt_id})-[:HAS_RESPONSE]->(qr:QuestionResponse)
            WITH a,
                 count(qr) AS attempted,
                 sum(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) AS correct,
                 sum(CASE WHEN qr.is_correct = false THEN 1 ELSE 0 END) AS incorrect,
                 sum(qr.time_taken) AS total_time
            SET a.questions_attempted = attempted,
                a.right_count = correct,
                a.wrong_count = incorrect,
                a.time_spent = total_time
        """, attempt_id=payload.attempt_id)

        return {"status": "created", "attempt_id": payload.attempt_id}