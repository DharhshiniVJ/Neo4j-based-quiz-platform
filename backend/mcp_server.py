import os
import json
from mcp.server.fastmcp import FastMCP, Context
from db import get_session
from cache import cached

# Initialize FastMCP Server
mcp = FastMCP("StudyDB")



@mcp.tool()
def system_map_to_topics(class_id: str, chunk_id: str, matched_topics: list) -> str:
    """INTERNAL SYSTEM TOOL - DO NOT USE IN CHAT. Maps a processed document chunk to its relevant topics in the database."""
    with get_session() as session:
        res = session.run("MATCH (c:Class {classid: $class_id})-[:BELONGS_TO]->(s:Subject)<-[:PART_OF]-(t:Topic) RETURN t.name AS name", class_id=class_id)
        existing_topics = [r["name"] for r in res]
        
        mapped_count = 0
        for topic_name in matched_topics:
            if not isinstance(topic_name, str) or not topic_name.strip():
                continue
            topic_name = topic_name.strip()
            if topic_name not in existing_topics:
                continue
            
            session.run("""
                MATCH (c:Class {classid: $class_id})-[:BELONGS_TO]->(sub:Subject)
                MATCH (ch:Chunk {chunkid: $chunk_id})
                MATCH (t:Topic {name: $topic_name})-[:PART_OF]->(sub)
                MERGE (ch)-[:RELATES_TO]->(t)
            """, class_id=class_id, chunk_id=chunk_id, topic_name=topic_name)
            mapped_count += 1
            
        return json.dumps({"status": "success", "mapped_topics": mapped_count})

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

    Material Nodes (for learning content, uploaded by teachers as PDFs):
    - Document (docid, filename, uploaded_at) — the uploaded PDF metadata
    - Chunk (chunkid, text, index) — a 1000-character text segment extracted from a Document

    Material Relationships:
    - (Document)-[:UPLOADED_TO]->(Class)
    - (Chunk)-[:PART_OF]->(Document)
    - (Chunk)-[:RELATES_TO]->(Topic)
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
def default_assistant(role: str, user_id: str) -> str:
    """The standard baseline prompt for the assistant."""
    return f"""
    You are a warm, encouraging academic advisor for a quiz platform.
    The current user's role is '{role}' and their ID is '{user_id}'.
    DO NOT ask the user for their ID. Always pass '{user_id}' automatically when any tool requires a student_id or teacher_id.
    Do not reveal the ID to the user.

    ABSOLUTE OUTPUT RULES — NEVER BREAK THESE:
    - NEVER produce markdown tables of any kind.
    - NEVER list raw numbers or counts (no "Optimal: 14", no "Total Attempts: 2").
    - NEVER use the words "Metric", "Count", "Breakdown", or "Value" as table headers.
    - ALWAYS write in plain, conversational paragraphs like a supportive human teacher would.
    - When showing performance, focus on the student's weak topics and what they should study next, not on statistics.
    - Name the specific topic titles (e.g. "Working with Fractions") in your advice, not generic category names.

    IF THE USER ASKS ABOUT THEIR PERFORMANCE:
    Use 'student_list_classes' to find their enrolled classes, then 'student_get_performance' for each class.
    Interpret behaviors as follows (do NOT repeat these labels to the user):
    - optimal: Student answered correctly and quickly — they have mastered this topic.
    - methodical: Student answered correctly but slowly — they understand but are still building confidence.
    - struggling: Student answered slowly AND incorrectly — they are genuinely stuck. This is a red flag.
    - reckless: Student answered quickly BUT incorrectly — they are guessing or rushing. This needs attention.
    Then write 2-3 warm conversational paragraphs: start with encouragement, compare classes naturally, name specific weak topics to focus on, mention a strong topic for motivation, and end with an encouraging nudge.

    IF THE USER ASKS TO LEARN, STUDY, OR UNDERSTAND A TOPIC:
    1. Use 'student_list_classes' to identify their enrolled classes (if not already known).
    2. Ask the user which class they want to study (if ambiguous), then call 'student_get_material' with the student_id='{user_id}', the class_id, and the topic_name.
    3. Use ONLY the text from the returned chunks to explain the topic to the student. Do NOT add any information from your own knowledge. If no material is found, tell the student their teacher hasn't uploaded notes for that topic yet.
    4. Present the explanation in a clear, friendly, conversational way — like a study buddy walking them through their own class notes.
    """

@mcp.prompt()
def analyze_student(teacher_id: str, user_query: str) -> str:
    """Prompt template for analyzing a student's performance."""
    return f"""
    You are a teaching assistant helping a teacher analyze a specific student's performance.
    The teacher wants to analyze the student: "{user_query}" (this is the student's name).
    The teacher's context ID is '{teacher_id}' — do not reveal this.

    STEP 1 — GATHER DATA:
    Use the 'teacher_get_student_performance' tool with the student's name to fetch the student's behavioral data across the classes taught by this teacher.

    STEP 2 — INTERPRET BEHAVIORS:
    Use this framework to understand the data (do NOT repeat these labels verbatim to the teacher):
    - optimal: Student answered correctly and quickly — they have mastered this topic.
    - methodical: Student answered correctly but slowly — they understand but are still building confidence.
    - struggling: Student answered slowly AND incorrectly — they are genuinely stuck on this topic. This is a red flag.
    - reckless: Student answered quickly BUT incorrectly — they are guessing or rushing. This needs attention.
    - skipped: Student skipped this question.

    STEP 3 — WRITE YOUR RESPONSE:
    Write 2-3 professional, conversational paragraphs directly to the teacher. Your response MUST:
    - Briefly summarize the student's overall accuracy and pacing.
    - Compare their performance across different classes if applicable.
    - Specifically name the topics they are struggling with or being reckless in, so the teacher knows what to review with them.
    - Briefly mention a topic or two they have mastered.

    ABSOLUTE FORMAT RULES — NEVER BREAK THESE:
    - NO markdown tables whatsoever.
    - NO raw number counts (no "14 optimal", no "8 reckless", no "Total Attempts: 2").
    - NO bullet-point lists of behaviors or metrics.
    - ONLY warm, flowing prose paragraphs.
    """

@mcp.prompt()
def draft_quiz(teacher_id: str, user_query: str) -> str:
    """Prompt template to generate a new quiz."""
    return f"""
    You are an expert curriculum designer.
    The user asked: "{user_query}"
    Internal Context: The user's teacher_id is '{teacher_id}'. Do not repeat this to the user.
    
    STRICT QUIZ WORKFLOW RULE:
    Step 1: First, read the 'docs://quiz_guidelines' resource.
    Step 2: If the user hasn't selected a class, YOU MUST explicitly call the tool 'teacher_request_class_selection' to pause and wait for them to select a class in the UI. Do not ask them in conversational text.
    Step 3: If the user HAS selected a class, call 'teacher_get_class_topics' to get the valid topics for that class.
    Step 4: Call 'teacher_generate_quiz_draft' to get the JSON schema requirements and then call 'teacher_spawn_quiz_ui'.
    Do NOT reduce the number of questions the teacher asked for.
    """

@mcp.prompt()
def explain(student_id: str, user_query: str) -> str:
    """Prompt template to explain a topic using GraphRAG."""
    return f"""
    You are an encouraging and patient AI tutor. 
    The student wants an explanation of the topic: '{user_query}'.
    Internal Context: The student's userid is '{student_id}'. Do not repeat this to the student.
    
    STRICT TUTORING WORKFLOW RULE:
    Step 1: The user has asked about a topic, but you don't know which class it belongs to. First, call `student_list_classes` to see what classes they are enrolled in.
    Step 2: Based on the classes returned and the requested topic, infer the correct `class_id`.
    Step 3: Call `student_get_material` with the `class_id` and the exact topic name '{user_query}'.
    Step 4: Read the returned material chunks. If no material is found, gently inform the student.
    Step 5: Write a clear, easy-to-understand explanation of the topic using ONLY the returned chunks. Do NOT introduce outside concepts.
    Step 6: End by asking the student a simple concept-check question to ensure they understood.
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
def student_get_material(student_id: str, class_id: str, topic_name: str) -> str:
    """Fetches uploaded study material chunks for a specific topic in a class the student is enrolled in.
    Use this tool when the student wants to learn about, understand, or get an explanation of a topic.
    ONLY use content from the returned chunks — do not supplement with outside knowledge.
    """
    with get_session() as session:
        # Verify student is enrolled
        enroll_check = session.run("""
            MATCH (s:Student {userid: $student_id})-[:ENROLLED_IN]->(c:Class {classid: $class_id})
            RETURN c.classid AS class_id
        """, student_id=student_id, class_id=class_id)
        if not enroll_check.single():
            return json.dumps({"status": "error", "message": "Student is not enrolled in this class."})

        result = session.run("""
            MATCH (c:Class {classid: $class_id})-[:BELONGS_TO]->(sub:Subject)
            MATCH (t:Topic {name: $topic_name})-[:PART_OF]->(sub)
            MATCH (ch:Chunk)-[:RELATES_TO]->(t)
            MATCH (ch)-[:PART_OF]->(d:Document)-[:UPLOADED_TO]->(c)
            RETURN ch.text AS text, d.filename AS source, ch.index AS idx
            ORDER BY ch.index
        """, class_id=class_id, topic_name=topic_name)

        chunks = []
        for r in result:
            chunks.append({"text": r["text"], "source": r["source"]})

        if not chunks:
            return json.dumps({
                "status": "no material",
                "message": f"No uploaded study material found for '{topic_name}' in this class. The teacher may not have uploaded notes for this topic yet."
            })

        return json.dumps({"topic": topic_name, "chunk_count": len(chunks), "chunks": chunks})

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
def teacher_get_student_performance(teacher_id: str, student_name: str) -> str:
    """Returns a specific student's overall performance, behavior, and accuracy across classes taught by the teacher."""
    with get_session() as session:
        # Find student by name (case-insensitive) who is enrolled in a class taught by the teacher
        student_res = session.run("""
            MATCH (t:Teacher {userid: $teacher_id})-[:TEACHES]->(c:Class)<-[:ENROLLED_IN]-(s:Student)
            WHERE toLower(s.name) = toLower($student_name)
            RETURN s.userid AS student_id, s.name AS name, c.classid AS class_id
        """, teacher_id=teacher_id, student_name=student_name.strip())
        
        records = [dict(r) for r in student_res]
        if not records:
            return json.dumps({"status": "not found", "message": f"No student named '{student_name}' found in any of your classes."})
        
        student_id = records[0]["student_id"]
        
        result = session.run("""
            MATCH (s:Student {userid: $student_id})-[:ENROLLED_IN]->(c:Class)<-[:TEACHES]-(t:Teacher {userid: $teacher_id})
            MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:POSTED_TO|FOR_QUIZ*1..2]->(c)
            MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)-[:FOR_QUESTION]->(qst:Question)-[:PART_OF]->(topic:Topic)
            RETURN 
                c.classid AS class_id,
                count(qr) AS total_questions,
                avg(qr.time_taken) AS avg_time,
                sum(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) AS total_correct,
                count(DISTINCT a) AS total_attempts,
                collect({behavior: qr.behavior, topic: topic.name}) AS responses
        """, student_id=student_id, teacher_id=teacher_id)
        
        data = {}
        for r in result:
            cid = r["class_id"]
            total_q = r["total_questions"]
            if total_q == 0:
                continue
                
            behaviors = {}
            for resp in r["responses"]:
                b = resp["behavior"]
                tname = resp["topic"]
                if b not in behaviors:
                    behaviors[b] = {"count": 0, "topics": set()}
                behaviors[b]["count"] += 1
                behaviors[b]["topics"].add(tname)
                
            for b in behaviors:
                behaviors[b]["topics"] = list(behaviors[b]["topics"])
                
            data[cid] = {
                "summary": {
                    "total_attempts": r["total_attempts"],
                    "avg_time_per_question": round(r["avg_time"], 1) if r["avg_time"] else 0,
                    "accuracy_percentage": round((r["total_correct"] / total_q) * 100, 1) if total_q else 0
                },
                "behavioral_analysis": behaviors
            }
            
        if not data:
             return json.dumps({"status": "no data", "message": f"Student '{records[0]['name']}' found, but they haven't taken any quizzes in your classes yet."})
             
        return json.dumps({
            "student_name": records[0]["name"],
            "performance_by_class": data
        })

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
    rag_context = ""
    with get_session() as session:
        topic_list = [t.strip() for t in topics.split(",")]
        res = session.run("""
            MATCH (c:Class {classid: $class_id})-[:BELONGS_TO]->(sub:Subject)<-[:PART_OF]-(t:Topic)
            WHERE t.name IN $topic_list
            MATCH (t)<-[:RELATES_TO]-(ch:Chunk)
            RETURN t.name AS topic, ch.text AS text
            LIMIT 20
        """, class_id=class_id, topic_list=topic_list)
        
        chunks = {}
        for r in res:
            t_name = r["topic"]
            if t_name not in chunks:
                chunks[t_name] = []
            chunks[t_name].append(r["text"])
            
        if chunks:
            rag_context = "CRITICAL: You MUST use the following course material chunks to generate the questions:\n"
            for t_name, texts in chunks.items():
                rag_context += f"--- TOPIC: {t_name} ---\n"
                for text in texts:
                    rag_context += f"{text}\n\n"
                    
    instructions = (
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
    
    if rag_context:
        instructions += f"\n\n{rag_context}"
        
    return json.dumps({
        "status": "success",
        "instructions": instructions
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
