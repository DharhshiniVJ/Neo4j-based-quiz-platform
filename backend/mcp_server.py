import os
import json
from mcp.server.fastmcp import FastMCP, Context
from db import get_session
from cache import cached

# Initialize FastMCP Server
mcp = FastMCP("StudyDB")

# --- RESOURCES ---

@mcp.resource("db://schema")
def get_db_schema() -> str:
    """Read-only resource detailing the Neo4j Graph Schema."""
    return """
    Nodes:
    - Student (userid, name, email, password_hash)
    - Teacher (userid, name, email, password_hash)
    - Class (classid, join_code)
    - Subject (name)
    - Topic (topicid, name, area)
    - Question (questionid, text, difficulty, question_type, options, correct_answer, expected_time_seconds)
    - Quiz (quizid, title, time_limit_minutes)
    - Attempt (attemptid, timestamp, ended_reason, right_count, wrong_count, questions_attempted, time_spent)
    - QuestionResponse (time_taken, status, first_answer, final_answer, is_correct, revision_count, behavior)

    Relationships:
    - (Teacher)-[:TEACHES]->(Class)
    - (Student)-[:ENROLLED_IN]->(Class)
    - (Class)-[:BELONGS_TO]->(Subject)
    - (Topic)-[:PART_OF]->(Subject)
    - (Question)-[:PART_OF]->(Topic)
    - (Teacher)-[:POSTED]->(Quiz)
    - (Quiz)-[:CONTAINS]->(Question)
    - (Quiz)-[:POSTED_TO]->(Class)
    - (Student)-[:HAS_ATTEMPT]->(Attempt)
    - (Attempt)-[:FOR_QUIZ]->(Quiz)
    - (Attempt)-[:HAS_RESPONSE]->(QuestionResponse)
    - (QuestionResponse)-[:FOR_QUESTION]->(Question)

    Notes:
    - An Attempt does not link directly to a Class. To find the class a quiz was posted to,
      traverse (Attempt)-[:FOR_QUIZ]->(Quiz)-[:POSTED_TO]->(Class).
    - QuestionResponse.behavior is precomputed at write time (one of: skipped, reckless,
      struggling, methodical, optimal) by comparing time_taken to the Question's
      expected_time_seconds. Query qr.behavior directly rather than recomputing it.
    - Topic-wise and subject-wise scores are not stored. Compute them by aggregating
      QuestionResponse through Question -> Topic (and -> Subject if needed).
    """

@mcp.resource("docs://quiz_guidelines")
def get_quiz_guidelines() -> str:
    """Static text resource detailing how to write good quiz questions."""
    return """
    StudyDB Quiz Guidelines:
    1. Questions must be clear, concise, and academically rigorous.
    2. Avoid double negatives (e.g. "Which is NOT untrue?").
    3. Always provide exactly 4 options.
    4. The correct answer must exactly match one of the options.
    5. Expected time must be an integer (in seconds) representing how long an average student should take to solve it.
    6. Ensure the 'topics' provided are explicitly covered.
    """

# --- PROMPTS ---

@mcp.prompt()
def analyze_student(student_id: str, class_id: str) -> str:
    """Prompt template for analyzing a student's performance."""
    return f"""
    You are a supportive academic advisor.
    Please use the 'student_get_performance' tool to fetch the performance data for student '{student_id}' in class '{class_id}'.
    Analyze the behavioral data (the internal categories are: skipped, reckless, struggling, methodical, optimal)
    for this student's recent quizzes. For example:
    - struggling -> "struggling"
    - skipped -> "skipped"
    - reckless -> "quick but inaccurate"
    - methodical -> "slow but accurate"
    - optimal -> "accurate"
    Highlight their weakest topics and suggest specific areas to focus on.
    """

@mcp.prompt()
def draft_quiz(teacher_id: str, class_id: str, topics: str, num_questions: int) -> str:
    """Prompt template to generate a new quiz."""
    return f"""
    You are an expert curriculum designer.
    First, read the 'docs://quiz_guidelines' resource.
    Then, use the 'teacher_generate_quiz_draft' tool to get the JSON schema requirements.
    Finally, generate {num_questions} high-quality questions for the topics: {topics}.
    Format your response strictly as the required JSON array so the teacher '{teacher_id}' can review and post it to class '{class_id}'.
    """

# --- STUDENT TOOLS ---

@mcp.tool()
def student_list_classes(student_id: str) -> str:
    """Returns a list of classes the student is enrolled in."""
    with get_session() as session:
        result = session.run("""
            MATCH (s:Student {userid: $student_id})-[:ENROLLED_IN]->(c:Class)-[:BELONGS_TO]->(sub:Subject)
            RETURN c.classid AS class_id, sub.name AS subject
        """, student_id=student_id)
        classes = [dict(record) for record in result]
        return json.dumps({"classes": classes})

@mcp.tool()
@cached(ttl_seconds=300) # L1+L2 caching for analytical queries
def student_get_performance(student_id: str, class_id: str) -> str:
    """Returns the student's overall performance, behavior, and accuracy for a specific class."""
    with get_session() as session:
        result = session.run("""
            MATCH (c:Class {classid: $class_id})<-[:ENROLLED_IN]-(s:Student {userid: $student_id})
            MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:POSTED_TO|FOR_QUIZ*1..2]->(c)
            MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)
            RETURN 
                count(qr) AS total_questions,
                avg(qr.time_taken) AS avg_time,
                sum(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) AS total_correct,
                count(DISTINCT a) AS total_attempts
        """, class_id=class_id, student_id=student_id)
        
        record = result.single()
        if not record or record["total_questions"] == 0:
            return json.dumps({"status": "no data", "message": "No attempts found for this student in this class."})
            
        total_q = record["total_questions"]
        summary = {
            "total_attempts": record["total_attempts"],
            "avg_time_per_question": round(record["avg_time"], 1),
            "accuracy_percentage": round((record["total_correct"] / total_q) * 100, 1)
        }
        
        behavior_res = session.run("""
            MATCH (c:Class {classid: $class_id})<-[:ENROLLED_IN]-(s:Student {userid: $student_id})
            MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:POSTED_TO|FOR_QUIZ*1..2]->(c)
            MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)-[:FOR_QUESTION]->(qst:Question)-[:PART_OF]->(t:Topic)
            RETURN qr.behavior AS behavior, t.name AS topic
        """, class_id=class_id, student_id=student_id)
        
        behavioral = {}
        for r in behavior_res:
            b = r["behavior"]
            t = r["topic"]
            if b not in behavioral:
                behavioral[b] = {"count": 0, "topics": set()}
            behavioral[b]["count"] += 1
            behavioral[b]["topics"].add(t)
            
        for b in behavioral:
            behavioral[b]["topics"] = list(behavioral[b]["topics"])
            
        return json.dumps({"summary": summary, "behavioral_analysis": behavioral})

# --- TEACHER TOOLS ---

@mcp.tool()
def teacher_list_classes(teacher_id: str) -> str:
    """Returns a list of classes the teacher teaches."""
    with get_session() as session:
        result = session.run("""
            MATCH (t:Teacher {userid: $teacher_id})-[:TEACHES]->(c:Class)-[:BELONGS_TO]->(sub:Subject)
            RETURN c.classid AS class_id, sub.name AS subject
        """, teacher_id=teacher_id)
        classes = [dict(record) for record in result]
        return json.dumps({"classes": classes})

@mcp.tool()
@cached(ttl_seconds=300) # L1+L2 caching
def teacher_get_class_performance(teacher_id: str, class_id: str) -> str:
    """Returns the aggregated performance for all students in a class."""
    with get_session() as session:
        result = session.run("""
            MATCH (t:Teacher {userid: $teacher_id})-[:TEACHES]->(c:Class {classid: $class_id})
            MATCH (c)<-[:ENROLLED_IN]-(s:Student)
            MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:POSTED_TO|FOR_QUIZ*1..2]->(c)
            MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)
            RETURN 
                count(qr) AS total_questions,
                avg(qr.time_taken) AS avg_time,
                sum(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) AS total_correct,
                count(DISTINCT a) AS total_attempts,
                count(DISTINCT s) AS active_students
        """, teacher_id=teacher_id, class_id=class_id)
        
        record = result.single()
        if not record or record["total_questions"] == 0:
            return json.dumps({"status": "no data", "message": "No data found or unauthorized."})
            
        total_q = record["total_questions"]
        summary = {
            "total_attempts": record["total_attempts"],
            "active_students": record["active_students"],
            "avg_time": round(record["avg_time"], 1),
            "accuracy": round((record["total_correct"] / total_q) * 100, 1)
        }
        return json.dumps({"class_summary": summary})

@mcp.tool()
def teacher_get_class_topics(teacher_id: str, class_id: str) -> str:
    """Returns the list of valid topics for a given class. Use this before drafting a quiz to ensure you assign valid topics."""
    with get_session() as session:
        result = session.run("""
            MATCH (c:Class {classid: $class_id})-[:BELONGS_TO]->(sub:Subject)
            MATCH (t:Topic)-[:PART_OF]->(sub)
            RETURN t.topicid AS topic_id, t.name AS name
        """, class_id=class_id)
        topics = [dict(record) for record in result]
        return json.dumps({"topics": topics})

@mcp.tool()
def teacher_generate_quiz_draft(teacher_id: str, class_id: str, topics: str, num_questions: int) -> str:
    """Provides a structural schema to generate a quiz. (LLM should use this to format its output)."""
    return json.dumps({
        "status": "success",
        "instructions": (
            f"Generate a JSON array of EXACTLY {num_questions} questions covering topics: {topics}. "
            f"You MUST generate all {num_questions} questions — do not generate fewer. "
            f"Distribute difficulties: roughly 40% easy, 40% medium, 20% hard. "
            f"Mix question types: at least 80% MCQ (4 options each) and up to 20% short_answer. "
            f"Each question MUST have: 'text' (string), 'options' (array of exactly 4 strings, required for MCQ), "
            f"'correct_answer' (exact match from options for MCQ, or a short string for short_answer), "
            f"'expected_time_seconds' (integer, 30-120), 'topic' (string matching an existing topic name), "
            f"'question_type' (either 'MCQ' or 'short_answer'), 'difficulty' (either 'easy', 'medium', or 'hard'). "
            f"Spread questions evenly across all provided topics."
        )
    })

@mcp.tool()
def teacher_request_class_selection(teacher_id: str) -> str:
    """Use this tool if the user asks you to draft a quiz, but they have not specified a class or you do not know which class to assign it to. This tool will pause generation and pop open a UI forcing the teacher to click a class. Once they select a class, they will automatically reply to you with the class_id and subject, and you can resume generating the quiz."""
    return json.dumps({"_mcp_action": "REQUEST_CLASS_SELECTION", "payload": {}})

@mcp.tool()
def teacher_spawn_quiz_ui(teacher_id: str, title: str, time_limit_minutes: int, questions_json_str: str) -> str:
    """Spawns the Create Quiz UI on the frontend, pre-filling it with the provided drafted questions. You MUST call this tool IMMEDIATELY whenever the user asks you to draft or generate a quiz. Do NOT print the JSON and ask for confirmation. Call the tool to seamlessly spawn the UI. `questions_json_str` must be a JSON string of an array of question objects (text, options, correct_answer, expected_time_seconds, topic)."""
    # This tool is intercepted by mcp_client.py, but we provide a fallback response here.
    return json.dumps({"_mcp_action": "SPAWN_QUIZ", "payload": {
        "title": title,
        "time_limit_minutes": time_limit_minutes,
        "questions": questions_json_str
    }})

if __name__ == "__main__":
    mcp.run()
