# StudyDB: MCP-Powered Cognitive Assessment Platform

StudyDB is an intelligent educational platform that uses a Neo4j graph database, an LLM-powered Model Context Protocol (MCP) Assistant, and a React frontend to analyze student performance.

Rather than just grading students based on right or wrong answers, StudyDB implements a **Cognitive Assessment Framework** that categorizes how a student solves problems based on their *behavior*.

---

## 🚀 Setup Instructions

### 1. Prerequisites
- Python 3.9+
- Node.js (v18+)
- Neo4j Desktop (Running locally on `127.0.0.1:7687`)
- Cerebras API Key (for the LLM Assistant)

### 2. Database Setup
1. Start your Neo4j instance.
2. The backend is configured to use `neo4j` / `password`. If your credentials differ, update them in `backend/db.py`.

### 3. Backend Setup
```bash
cd backend
python -m venv venv
# Activate venv: Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt

# Create a .env file and add your API key:
echo "CEREBRAS_API_KEY=your_api_key_here" > .env

# Run the FastAPI server (starts on http://localhost:8000)
uvicorn main:app --reload
```

### 4. Frontend Setup
```bash
cd frontend
npm install
# Start the Vite development server (starts on http://localhost:5173)
npm run dev
```

### 5. Using the App
1. Open `http://localhost:5173` in your browser.
2. **Teacher Login**: `holly.flax@school.edu` / `studydb123`
3. **Student Login**: `jake.peralta@student.edu` / `studydb123`
4. Click the floating chat button in the bottom right to talk to the MCP Assistant.

---

# 🏗️ Architecture Deep Dive

The following sections break down the core engineering and architectural decisions of the platform.

## 1. MCP Layers: Resources, Prompts, and Tools

### Resources (Read-Only Data)
Resources provide static or semi-static context to the LLM:
1. **`db://schema`** — Tells the LLM exactly how our Neo4j database is structured (nodes and relationships) so it understands how to query or interpret the data.
2. **`docs://quiz_guidelines`** — A set of strict rules the LLM must follow when generating a quiz (e.g., formatting, difficulty scaling, JSON structure).

### Prompts (System Instructions)
Prompts are the predefined personas and instructions that tell the AI how to behave:
1. **`default_assistant`** — The standard prompt that runs when a user opens the chat widget. It checks if they are a student or teacher and sets the persona.
2. **`analyze_student`** — Triggered by the `/analyze_student` slash command. Instructs the AI to look up a student's behavioural metrics and write a professional report.
3. **`draft_quiz`** — Triggered by the `/draft_quiz` slash command. Instructs the AI to act as an instructional designer and build a custom JSON quiz.

### Tools (Executable Functions)
Tools allow the AI to actively query the database or trigger UI events.

**System tools (hidden from chat)**
- `system_map_to_topics` — Used silently in the background to map uploaded PDF chunks to the database.

**Student tools**
- `student_list_classes` — Finds the student's enrolled classes.
- `student_get_performance` — Retrieves behavioural quadrants (optimal, struggling, etc.) and accuracy.
- `student_get_material` — Fetches chunks of the teacher's PDFs for the AI to use as a study guide.

**Teacher tools**
- `teacher_list_classes` — Finds the teacher's active classes.
- `teacher_get_student_performance` — Pulls data on a specific student across the teacher's classes.
- `teacher_get_class_performance` — Pulls aggregate data for an entire class.
- `teacher_get_class_topics` — Lists all syllabus topics in a specific class.
- `teacher_generate_quiz_draft` — Calls the LLM to generate a structured JSON quiz.
- `teacher_request_class_selection` — Pops up a UI menu asking the teacher to choose a class.
- `teacher_spawn_quiz_ui` — Spawns the Quiz Editor modal in the React UI.

### Data Tools vs. UI Tools (Action Interception)
The platform uses two different types of tools to achieve different goals:

| Feature | Data tools (e.g., `student_get_performance`) | UI tools (e.g., `teacher_spawn_quiz_ui`) |
| --- | --- | --- |
| Purpose | To fetch read-only data from Neo4j. | To trigger a visual state change in the React frontend. |
| Execution | Runs the Python function in `mcp_server.py`. | Intercepted by `mcp_client.py` before execution. |
| Return value | JSON data from the database. | A UI command payload: `{"_mcp_action": "SPAWN_QUIZ", ...}` |
| LLM output | The LLM receives the DB data and writes a normal paragraph response. | The LLM is bypassed. The Python client immediately forwards the JSON to React. |
| Frontend handling | React displays the text in the chat bubble. | React detects `_mcp_action`, parses the payload, and fires a JavaScript event. |

**How "Action Interception" Works:**
1. **The LLM calls the tool:** The LLM decides it's time to build a quiz, so it asks to call `teacher_spawn_quiz_ui`.
2. **The client intercepts:** `mcp_client.py` sees the requested tool name and instantly aborts the LLM loop.
3. **The JSON payload:** It sends a hardcoded JSON string back to the React UI: `{"_mcp_action": "SPAWN_QUIZ", "payload": {...}}`.
4. **The event trigger:** When `ChatbotWidget.jsx` sees a message starting with `{"_mcp_action"`, it stops it from printing to the screen. Instead, it fires `window.dispatchEvent()`.
5. **The result:** The Teacher Dashboard catches that event and pops open the Quiz Creator modal.

---

## 2. LLM & Cerebras Integration

### The Model & Provider
- **Provider:** Cerebras Systems
- **Model used:** `zai-glm-4.7`
- **Why Cerebras?** Cerebras builds custom AI hardware (the Wafer-Scale Engine). Their cloud inference is orders of magnitude faster than traditional GPU clusters, providing real-time tutoring for students and instant PDF processing for teachers.

### Dependencies & API Usage
- **Package:** `cerebras-cloud-sdk`
- **Method A (Asynchronous):** Used in the Chatbot (`backend/mcp_client.py`). We initialize `AsyncCerebras()` to handle high-concurrency websocket connections so the server doesn't freeze.
- **Method B (Synchronous):** Used in background PDF processing (`backend/main.py`). Since it is in an isolated background thread, it utilizes the synchronous `Cerebras()` client.

### Tool Calling & Structured Outputs
Instead of asking the LLM to format output as JSON, we pass a strict JSON Schema into the API request using the `tools=` parameter. When the LLM needs data, it interrupts its text generation and returns a `tool_calls` array, forcing our backend to execute Python functions and return the data.

---

## 3. Network Architecture: SSE and Persistence

### SSE over HTTP (Not stdio)
We are using **SSE (Server-Sent Events) over HTTP**, not standard I/O.
In `backend/main.py`, we mount the MCP server directly inside our existing FastAPI web server:
`app.mount("/mcp", mcp.sse_app())`
This eliminates the need to run two separate backend programs, making cloud deployment significantly simpler.

### Persistent Connection (`MCPConnectionManager`)
Connecting to an SSE endpoint and downloading the tool list takes time. Instead of doing this on every message, we built `MCPConnectionManager`.
On FastAPI startup, a background task connects to `/mcp/sse`, handshakes, and leaves the connection open using Python's `AsyncExitStack`. When a student asks a question, `run_chat()` uses a pre-warmed connection with zero setup delay.

---

## 4. Multi-Layer Caching Architecture

Analytical graph queries in Neo4j are computationally heavy. To prevent the database from recalculating similar results repeatedly, we use a two-tier cache.

### The `@cached` Decorator
We applied a custom Python decorator (`@cached(ttl_seconds=300)`) to the heaviest MCP tools, caching their results for 5 minutes.

### The L1 / L2 Architecture
- **Level 1 (In-memory):** A Python dictionary (`L1_CACHE = {}`) in FastAPI RAM. Protected by `threading.Lock()`. Speed: Nanoseconds.
- **Level 2 (Redis):** A centralized Redis server (port 6379). If a request misses in L1, it checks Redis, returns the data, and copies it back into L1.

---

## 5. Neo4j Graph Schema & Cypher Queries

### The Complete Relationship Map
- `(Teacher)-[:TEACHES]->(Class)`
- `(Student)-[:ENROLLED_IN]->(Class)`
- `(Class)-[:BELONGS_TO]->(Subject)`
- `(Topic)-[:PART_OF]->(Subject)`
- `(Question)-[:PART_OF]->(Topic)`
- `(Teacher)-[:POSTED]->(Quiz)`
- `(Quiz)-[:CONTAINS]->(Question)`
- `(Quiz)-[:POSTED_TO]->(Class)`
- `(Student)-[:HAS_ATTEMPT]->(Attempt)`
- `(Attempt)-[:FOR_QUIZ]->(Quiz)`
- `(Attempt)-[:HAS_RESPONSE]->(QuestionResponse)`
- `(QuestionResponse)-[:FOR_QUESTION]->(Question)`
- `(Chunk)-[:PART_OF]->(Document)`
- `(Document)-[:POSTED_TO]->(Class)`
- `(Chunk)-[:RELATES_TO]->(Topic)`

### Pre-Computed Behavioral Rules (The "Skipped" Fix)
When a student submits a quiz, the backend assigns a `behavior` string to the `QuestionResponse` node.
**Clarification on "Skipped":** A question is marked as skipped ONLY if the student explicitly clicks the skip button or leaves it completely blank (`status = 'skipped'`). Time does not matter for this calculation!
1. **Skipped:** No answer provided (`status = 'skipped'`).
2. **Reckless:** Answered *faster* than expected time AND *Incorrect*.
3. **Struggling:** Answered *slower* than expected time AND *Incorrect*.
4. **Methodical:** Answered *slower* than expected time AND *Correct*.
5. **Optimal:** Answered *faster* than expected time AND *Correct*.

### Major Cypher Queries
**Fetching a Student's Behavioral Analytics:**
```cypher
MATCH (c:Class {classid: $class_id})<-[:ENROLLED_IN]-(s:Student {userid: $student_id})
MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:POSTED_TO|FOR_QUIZ*1..2]->(c)
MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)-[:FOR_QUESTION]->(qst:Question)-[:PART_OF]->(t:Topic)
RETURN qr.behavior AS behavior, t.name AS topic, qr.status AS status
```

**Aggregating Entire Class Performance:**
```cypher
MATCH (c:Class {classid: $class_id})<-[:ENROLLED_IN]-(s:Student)
MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:POSTED_TO|FOR_QUIZ*1..2]->(c)
MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)
RETURN count(qr) AS total_questions, avg(qr.time_taken) AS avg_time, sum(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) AS total_correct
```

**Graph-RAG Document Mapping:**
```cypher
MATCH (c:Class {classid: $class_id})-[:BELONGS_TO]->(sub:Subject)
MATCH (ch:Chunk {chunkid: $chunk_id})
MATCH (t:Topic {name: $topic_name})-[:PART_OF]->(sub)
MERGE (ch)-[:RELATES_TO]->(t)
```

---

## 6. Authentication & Authorization

### Authentication (Bcrypt & Neo4j)
The bcrypt hashes are stored directly in the Neo4j database on the `(Student)` and `(Teacher)` nodes.
1. The frontend sends the raw password.
2. The backend generates a secure hash using `bcrypt`.
3. During login, `bcrypt.checkpw()` compares the input against the stored `password_hash`. If valid, it generates a JWT.

### The JSON Web Token (JWT)
A brand new, completely unique JWT is generated every single time a user logs in. The token securely encodes:
- `sub` (Subject): The user's unique ID.
- `role`: Their system role (`student` or `teacher`).

### Authorization (FastAPI & MCP RBAC)
We use **FastAPI Dependency Injection** to enforce Role-Based Access Control via `require_student()` and `require_teacher()` guards.
Additionally, when the Chatbot connects, `mcp_client.py` looks at the `role` inside the JWT and physically deletes all tools from the LLM's prompt that do not start with the user's role prefix. This guarantees a student cannot accidentally trick the AI into running `teacher_get_student_performance`!
