from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import traceback
import bcrypt
import io
import pypdf
import os
import json
import uuid
from datetime import datetime
from cerebras.cloud.sdk import Cerebras
from db import get_session
from auth import (
    create_access_token,
    get_current_user,
    get_download_user,
    require_student,
    require_teacher,
    assert_own_student,
    assert_own_teacher
)
from pydantic import BaseModel
from typing import List, Optional
from mcp_server import mcp

app = FastAPI()

# Uploaded PDF storage directory
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/mcp", mcp.sse_app())

import asyncio
from mcp_client import mcp_manager

@app.on_event("startup")
async def startup_event():
    # Start the persistent MCP connection manager in the background
    # It will silently retry until the SSE server is fully booted and ready.
    asyncio.create_task(mcp_manager.start())

@app.on_event("shutdown")
async def shutdown_event():
    await mcp_manager.close()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    print(f"GLOBAL ERROR: {error_msg}")
    return JSONResponse(status_code=500, content={"detail": str(exc), "traceback": error_msg})

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



class SignupIn(BaseModel):
    name: str
    email: str
    password: str
    role: str

class ClassCreateIn(BaseModel):
    subject: str

class ClassJoinIn(BaseModel):
    join_code: str

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
                coalesce(q.expected_time_seconds, CASE q.difficulty WHEN 'hard' THEN 120 WHEN 'medium' THEN 60 ELSE 30 END) AS expected_time_seconds,
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
            OPTIONAL MATCH (t:Teacher)-[:TEACHES]->(c)
            RETURN c.classid AS class_id, sub.name AS subject, t.name AS teacher_name
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
            RETURN c.classid AS class_id, sub.name AS subject, c.join_code AS join_code
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
            RETURN t.topicid AS topicid, t.name AS name
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
                   coalesce([x IN behavior_list WHERE x.behavior = 'reckless'][0].topics, []) AS reckless_topics,
                   coalesce([x IN behavior_list WHERE x.behavior = 'methodical'][0].topics,       []) AS methodical_topics,
                   coalesce([x IN behavior_list WHERE x.behavior = 'optimal'][0].topics,      []) AS optimal_topics
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
    expected_time_seconds: Optional[int] = None  # if not given, derived from difficulty at insert time


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
            exp_time = q.expected_time_seconds
            if exp_time is None:
                exp_time = {"easy": 15, "medium": 30, "hard": 60}.get(q.difficulty, 30)
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
                 expected_time_seconds=exp_time)

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
        # Guard: reject if student already has a completed attempt for this quiz
        existing = session.run("""
            MATCH (s:Student {userid: $student_id})-[:HAS_ATTEMPT]->(a:Attempt)-[:FOR_QUIZ]->(q:Quiz {quizid: $quiz_id})
            WHERE a.ended_reason IN ['submitted', 'timeout']
            RETURN a.attemptid AS existing_id LIMIT 1
        """, student_id=payload.student_id, quiz_id=payload.quiz_id).single()

        if existing:
            raise HTTPException(status_code=409, detail={
                "error": "duplicate_attempt",
                "message": "You have already submitted an attempt for this quiz.",
                "existing_attempt_id": existing["existing_id"]
            })
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
                WITH a, q, coalesce(q.expected_time_seconds,
                    CASE q.difficulty
                        WHEN 'easy' THEN 15
                        WHEN 'medium' THEN 30
                        WHEN 'hard' THEN 60
                        ELSE 30
                    END) AS exp_time
                CREATE (qr:QuestionResponse {
                    time_taken: $time_taken,
                    status: $status,
                    first_answer: $first_answer,
                    final_answer: $final_answer,
                    is_correct: $is_correct,
                    revision_count: $revision_count,
                    behavior: CASE 
                        WHEN $status = 'skipped' THEN 'skipped'
                        WHEN $time_taken < exp_time AND NOT $is_correct THEN 'reckless'
                        WHEN $time_taken >= exp_time AND NOT $is_correct THEN 'struggling'
                        WHEN $time_taken >= exp_time AND $is_correct THEN 'methodical'
                        ELSE 'optimal'
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

# --- New Endpoints ---

@app.get("/subjects")
def get_subjects():
    with get_session() as session:
        result = session.run("MATCH (s:Subject) RETURN s.name AS name")
        return [{"name": record["name"]} for record in result]

@app.post("/signup")
def signup(payload: SignupIn):
    if payload.role not in ["student", "teacher"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    with get_session() as session:
        # Check if email exists
        res = session.run("MATCH (n) WHERE n.email = $email RETURN n LIMIT 1", email=payload.email)
        if res.single():
            raise HTTPException(status_code=400, detail="Email already registered")
            
        import uuid
        
        userid = ("S" if payload.role == "student" else "T") + str(uuid.uuid4())[:8].upper()
        hashed = bcrypt.hashpw(payload.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        if payload.role == "student":
            session.run("CREATE (s:Student {userid: $uid, name: $name, email: $email, password_hash: $pw})",
                        uid=userid, name=payload.name, email=payload.email, pw=hashed)
        else:
            session.run("CREATE (t:Teacher {userid: $uid, name: $name, email: $email, password_hash: $pw})",
                        uid=userid, name=payload.name, email=payload.email, pw=hashed)
        
        token = create_access_token(userid, payload.role)
        return {"role": payload.role, "token": token, "userid": userid, "name": payload.name, "email": payload.email}

import string
import random

@app.post("/classes/create")
def create_class(payload: ClassCreateIn, current_user: dict = Depends(require_teacher)):
    with get_session() as session:
        res = session.run("MATCH (s:Subject {name: $name}) RETURN s", name=payload.subject)
        if not res.single():
            raise HTTPException(status_code=400, detail="Subject not found")
            
        t_res = session.run("MATCH (t:Teacher {userid: $tid}) RETURN t.name AS name", tid=current_user["sub"])
        t_record = t_res.single()
        # Use the first word of the teacher's name
        teacher_name = t_record["name"].split()[0].upper() if t_record and t_record["name"] else "T"
        
        # Map Math to MATH and Science to SCI, otherwise fallback to first 3 letters
        subject_map = {"Math": "MATH", "Science": "SCI"}
        subject_code = subject_map.get(payload.subject, payload.subject[:3].upper())
        base_id = f"C7{subject_code}"
        
        classid = None
        for i in range(1, len(teacher_name) + 1):
            candidate = f"{base_id}-{teacher_name[:i]}"
            check_res = session.run("MATCH (c:Class {classid: $cid}) RETURN c", cid=candidate)
            if not check_res.single():
                classid = candidate
                break
                
        if not classid:
            import uuid
            classid = f"{base_id}-{teacher_name}-{str(uuid.uuid4())[:4].upper()}"

        join_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        session.run("""
            MATCH (t:Teacher {userid: $tid})
            MATCH (s:Subject {name: $subj})
            CREATE (c:Class {classid: $cid, join_code: $code})
            CREATE (c)-[:BELONGS_TO]->(s)
            CREATE (t)-[:TEACHES]->(c)
        """, tid=current_user["sub"], subj=payload.subject, cid=classid, code=join_code)
        
        return {"class_id": classid, "join_code": join_code, "subject": payload.subject}

@app.post("/classes/join")
def join_class(payload: ClassJoinIn, current_user: dict = Depends(require_student)):
    with get_session() as session:
        res = session.run("""
            MATCH (c:Class {join_code: $code})
            RETURN c.classid AS cid
        """, code=payload.join_code)
        
        record = res.single()
        if not record:
            raise HTTPException(status_code=404, detail="Invalid join code")
            
        session.run("""
            MATCH (s:Student {userid: $sid})
            MATCH (c:Class {join_code: $code})
            MERGE (s)-[:ENROLLED_IN]->(c)
        """, sid=current_user["sub"], code=payload.join_code)
        
        return {"success": True, "class_id": record["cid"]}

def process_pdf_background(class_id: str, doc_id: str, chunks: list):
    api_key = os.environ.get("CEREBRAS_API_KEY")
    if not api_key:
        print("CEREBRAS_API_KEY not set for background task")
        return
    client = Cerebras(api_key=api_key)

    with get_session() as session:
        res = session.run("MATCH (c:Class {classid: $class_id})-[:BELONGS_TO]->(s:Subject)<-[:PART_OF]-(t:Topic) RETURN t.name AS name", class_id=class_id)
        existing_topics = [r["name"] for r in res]

        for i, chunk_text in enumerate(chunks):
            prompt = f"Here is a chunk from a syllabus or textbook. Read it and determine which of the following existing topics it best relates to.\nExisting Topics: {', '.join(existing_topics)}\nYou must strictly map it ONLY to the topics in this list. Do NOT create new topics.\n\nText: {chunk_text}"
            try:
                response = client.chat.completions.create(
                    model="zai-glm-4.7",
                    messages=[{"role": "user", "content": prompt}],
                    tools=[{
                        "type": "function",
                        "function": {
                            "name": "system_map_to_topics",
                            "description": "Save the existing topics that match this text.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "matched_topics": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                        "description": "The exact topic names from the existing topics list that relate to the text."
                                    }
                                },
                                "required": ["matched_topics"]
                            }
                        }
                    }],
                    tool_choice={"type": "function", "function": {"name": "system_map_to_topics"}}
                )
                
                tool_call = response.choices[0].message.tool_calls[0]
                args = json.loads(tool_call.function.arguments)
                topics_json = args.get("matched_topics", [])
            except Exception as e:
                print(f"Error classifying chunk {i}: {e}")
                topics_json = []

            if not isinstance(topics_json, list):
                topics_json = []

            chunk_id = f"{doc_id}-chunk-{i}"

            session.run("""
                MATCH (d:Document {docid: $doc_id})
                CREATE (ch:Chunk {chunkid: $chunk_id, text: $text, index: $index})
                CREATE (ch)-[:PART_OF]->(d)
            """, doc_id=doc_id, chunk_id=chunk_id, text=chunk_text, index=i)

            from mcp_server import system_map_to_topics
            system_map_to_topics(class_id, chunk_id, topics_json)

@app.post("/classes/{class_id}/upload")
async def upload_class_material(class_id: str, background_tasks: BackgroundTasks, file: UploadFile = File(...), current_user: dict = Depends(require_teacher)):
    assert_own_teacher(current_user["sub"], current_user)
    content = await file.read()
    try:
        pdf_reader = pypdf.PdfReader(io.BytesIO(content))
        text = ""
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF.")

    chunk_size = 1000
    chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
    
    doc_id = str(uuid.uuid4())
    filename = file.filename

    # Save the raw PDF to disk so students can download it
    safe_filename = f"{doc_id}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    with open(file_path, "wb") as f:
        f.write(content)

    with get_session() as session:
        session.run("""
            MATCH (c:Class {classid: $class_id})
            CREATE (d:Document {docid: $doc_id, filename: $filename, filepath: $filepath, uploaded_at: datetime()})
            CREATE (d)-[:UPLOADED_TO]->(c)
        """, class_id=class_id, doc_id=doc_id, filename=filename, filepath=file_path)

    background_tasks.add_task(process_pdf_background, class_id, doc_id, chunks)

    return {"status": "success", "message": "Document uploaded and is processing in the background."}

@app.get("/classes/{class_id}/materials")
def get_class_materials(class_id: str, current_user: dict = Depends(get_current_user)):
    with get_session() as session:
        res = session.run("""
            MATCH (d:Document)-[:UPLOADED_TO]->(c:Class {classid: $class_id})
            RETURN d.docid AS doc_id, d.filename AS filename, d.filepath AS filepath, toString(d.uploaded_at) AS uploaded_at
            ORDER BY d.uploaded_at DESC
        """, class_id=class_id)
        results = []
        for r in res:
            item = dict(r)
            # Only expose downloadable flag, not the raw server path
            item["downloadable"] = bool(item.get("filepath") and os.path.exists(item["filepath"]))
            item.pop("filepath", None)
            results.append(item)
        return results

@app.get("/classes/{class_id}/materials/{doc_id}/download")
def download_class_material(class_id: str, doc_id: str, current_user: dict = Depends(get_download_user)):
    """Allows any authenticated user (teacher or student) enrolled/teaching this class to download a material."""
    with get_session() as session:
        res = session.run("""
            MATCH (d:Document {docid: $doc_id})-[:UPLOADED_TO]->(c:Class {classid: $class_id})
            RETURN d.filename AS filename, d.filepath AS filepath
        """, doc_id=doc_id, class_id=class_id)
        record = res.single()
        if not record:
            raise HTTPException(status_code=404, detail="Material not found.")
        filepath = record["filepath"]
        if not filepath or not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="File not available for download. It may have been uploaded before download support was added.")
        return FileResponse(
            path=filepath,
            filename=record["filename"],
            media_type="application/pdf"
        )

@app.delete("/classes/{class_id}/materials/{doc_id}")
def delete_class_material(class_id: str, doc_id: str, current_user: dict = Depends(require_teacher)):
    assert_own_teacher(current_user["sub"], current_user)
    with get_session() as session:
        res = session.run("""
            MATCH (d:Document {docid: $doc_id})-[:UPLOADED_TO]->(c:Class {classid: $class_id})
            RETURN d.filepath AS filepath
        """, doc_id=doc_id, class_id=class_id)
        record = res.single()
        if not record:
            raise HTTPException(status_code=404, detail="Document not found or does not belong to this class")

        filepath = record["filepath"]

        # Delete chunk relationships and chunks, then the document node
        session.run("""
            MATCH (d:Document {docid: $doc_id})
            OPTIONAL MATCH (ch:Chunk)-[:PART_OF]->(d)
            DETACH DELETE ch
            DETACH DELETE d
        """, doc_id=doc_id)

    # Remove the file from disk
    if filepath and os.path.exists(filepath):
        try:
            os.remove(filepath)
        except Exception as e:
            print(f"[delete_material] Could not remove file {filepath}: {e}")

    return {"status": "success", "message": "Document deleted"}

@app.get("/classes/{class_id}/overall-stats")
def get_class_overall_stats(class_id: str, current_user: dict = Depends(require_teacher)):
    with get_session() as session:
        # Summary Stats
        summary_res = session.run("""
            MATCH (c:Class {classid: $class_id})<-[:ENROLLED_IN]-(s:Student)
            MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:POSTED_TO|FOR_QUIZ*1..2]->(c)
            MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)
            RETURN 
                count(qr) AS total_questions,
                avg(qr.time_taken) AS avg_time,
                sum(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) AS total_correct,
                count(DISTINCT a) AS total_attempts,
                count(DISTINCT s) AS active_students
        """, class_id=class_id)
        
        s_record = summary_res.single()
        if not s_record or s_record["total_questions"] == 0:
            return {
                "summary": {"total_attempts": 0, "active_students": 0, "avg_time": 0, "accuracy": 0},
                "behavioral": [], "best_topics": [], "weakest_topics": []
            }
            
        total_q = s_record["total_questions"]
        summary = {
            "total_attempts": s_record["total_attempts"],
            "active_students": s_record["active_students"],
            "avg_time": round(s_record["avg_time"], 1),
            "accuracy": round((s_record["total_correct"] / total_q) * 100, 1)
        }
        
        # Behavioral Topics Mapping
        behavior_res = session.run("""
            MATCH (c:Class {classid: $class_id})<-[:ENROLLED_IN]-(s:Student)
            MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:POSTED_TO|FOR_QUIZ*1..2]->(c)
            MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)-[:FOR_QUESTION]->(qst:Question)-[:PART_OF]->(t:Topic)
            RETURN qr.behavior AS behavior, t.name AS topic, qr.status AS status
        """, class_id=class_id)
        behavioral = [dict(r) for r in behavior_res]
        
        # Topic aggregations for best and weakest
        topic_res = session.run("""
            MATCH (c:Class {classid: $class_id})<-[:ENROLLED_IN]-(s:Student)
            MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:POSTED_TO|FOR_QUIZ*1..2]->(c)
            MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)-[:FOR_QUESTION]->(qst:Question)-[:PART_OF]->(t:Topic)
            RETURN 
                t.name AS topic, count(qst) AS total, sum(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) AS correct
            ORDER BY correct * 1.0 / total DESC
        """, class_id=class_id)
        topics = [{"topic": r["topic"], "accuracy": round(r["correct"] / r["total"] * 100, 1)} for r in topic_res]
        
        best_topics = topics[:3]
        weakest_topics = topics[-3:] if len(topics) > 3 else topics[::-1]
        
        return {
            "summary": summary,
            "behavioral": behavioral,
            "best_topics": best_topics,
            "weakest_topics": weakest_topics
        }

@app.get("/classes/{class_id}/students/{student_id}/behavioral")
def get_class_student_behavioral_stats(class_id: str, student_id: str, current_user: dict = Depends(get_current_user)):
    with get_session() as session:
        # Summary Stats
        summary_res = session.run("""
            MATCH (c:Class {classid: $class_id})<-[:ENROLLED_IN]-(s:Student {userid: $student_id})
            MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:POSTED_TO|FOR_QUIZ*1..2]->(c)
            MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)
            RETURN 
                count(qr) AS total_questions,
                avg(qr.time_taken) AS avg_time,
                sum(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) AS total_correct,
                count(DISTINCT a) AS total_attempts
        """, class_id=class_id, student_id=student_id)
        
        s_record = summary_res.single()
        if not s_record or s_record["total_questions"] == 0:
            return {"summary": {"total_attempts": 0, "avg_time": 0, "accuracy": 0}, "behavioral": []}
            
        total_q = s_record["total_questions"]
        summary = {
            "total_attempts": s_record["total_attempts"],
            "avg_time": round(s_record["avg_time"], 1),
            "accuracy": round((s_record["total_correct"] / total_q) * 100, 1)
        }
        
        # Behavioral Topics Mapping
        behavior_res = session.run("""
            MATCH (c:Class {classid: $class_id})<-[:ENROLLED_IN]-(s:Student {userid: $student_id})
            MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:POSTED_TO|FOR_QUIZ*1..2]->(c)
            MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)-[:FOR_QUESTION]->(qst:Question)-[:PART_OF]->(t:Topic)
            RETURN qr.behavior AS behavior, t.name AS topic, qr.status AS status
        """, class_id=class_id, student_id=student_id)
        behavioral = [dict(r) for r in behavior_res]
        
        return {
            "summary": summary,
            "behavioral": behavioral
        }


class HistoryMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[HistoryMessage] = []

@app.post("/chat")
async def chat_endpoint(payload: ChatRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    role = current_user.get("role")
    
    from mcp_client import run_chat
    try:
        history = [h.dict() for h in payload.history]
        response_text = await run_chat(user_id, role, payload.message, history)
        return {"response": response_text}
    except Exception as e:
        import traceback
        error_msg = "".join(traceback.format_exception(type(e), e, e.__traceback__))
        with open("error.log", "w") as f:
            f.write(error_msg)
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")
