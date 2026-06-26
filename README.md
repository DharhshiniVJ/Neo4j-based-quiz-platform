# StudyDB: MCP-Powered Cognitive Assessment Platform

StudyDB is an intelligent educational platform that uses a Neo4j graph database, an LLM-powered Model Context Protocol (MCP) Assistant, and a React frontend to analyze student performance.

Rather than just grading students based on right or wrong answers, StudyDB implements a **Cognitive Assessment Framework** that categorizes how a student solves problems based on their *behavior*.

---

## 🏗️ High-Level Design (HLD)

The platform is designed to run in a containerized environment with strict separation of concerns between the UI, the backend processing, and the AI intelligence layers.

```text
+-----------------------------------------------------------------------------------+
|                                  DOCKER ENVIRONMENT                               |
|                                                                                   |
|  +------------------------+                  +---------------------------------+  |
|  |     REACT FRONTEND     |                  |         FASTAPI BACKEND         |  |
|  |    (Chatbot Widget)    |                  |  (mcp_client.py / mcp_server.py)|  |
|  +-----------+------------+                  +----------------+----------------+  |
|              |                                                |                   |
|              | 1. HTTP Post / User Input                      |                   |
|              +----------------------------------------------->+                   |
|              |                                                |                   |
|              | 2. SSE Stream (Real-time Text tokens)          | 3. Fetches Domain |
|              <------------------------------------------------+    Instructions   |
|              |                                                |    from:          |
|              |                                                |    [/skills/*.md] |
|              |                                                |                   |
|  +-----------v------------+                                   |                   |
|  |    ACTION INTERCEPTOR  |                                   |                   |
|  | (Intercepts _mcp_action|                                   |                   |
|  |  to spawn UI Modals)   |                                   |                   |
|  +------------------------+                                   |                   |
|                                                               |                   |
|              +------------------------------------------------+                   |
|              |                                                |                   |
|              | 4. Tools Execution (Read/Write)                | 5. Ultra-low      |
|              |                                                |    latency chat   |
|              |                                                |    completions    |
|              v                                                v                   |
|    +-------------------+                             +-----------------+          |
|    |   NEO4J GRAPH DB  |                             |  CEREBRAS CLOUD |          |
|    |  (Schema/Metrics) |                             |  (zai-glm-4.7)  |          |
|    +-------------------+                             +-----------------+          |
+-----------------------------------------------------------------------------------+
```

---

## 🧠 The Cognitive Assessment Framework (Behavioral Evaluation Matrix)

The core innovation of StudyDB is the **Behavioral Evaluation Matrix**. It categorizes how a student solves problems by measuring two primary variables:
1. **Response Time (Speed)**: How long the student took compared to the question's expected baseline time.
2. **Accuracy (Correctness)**: Whether the final answer was right or wrong.

| Accuracy \ Speed | Fast ( < Expected Time ) | Slow ( >= Expected Time ) |
| :--- | :--- | :--- |
| **Incorrect** | ⚠️ **Reckless**<br>Rushing through questions and guessing. | 🆘 **Struggling**<br>Spending a lot of time but still getting it wrong. Needs intervention. |
| **Correct** | ⚡ **Optimal**<br>Efficiently and accurately arriving at the right answer. | 🧠 **Methodical**<br>Taking their time to carefully think through the problem and getting it right. |

*(Note: If a student leaves a question entirely blank, the system explicitly categorizes it as **Skipped**).*

---

## 📦 Docker Deployment & Volume Mapping

To ensure the app runs identically across all environments while still allowing for rapid local development, StudyDB uses a `docker-compose.yml` architecture with **Volume Mapping**. 

This maps your local source code into the container, meaning any changes you save on your laptop will instantly hot-reload the container without needing to rebuild the image!

```yaml
version: '3.8'

services:
  # 1. Neo4j Graph Database
  neo4j_db:
    image: neo4j:5.12-community
    ports:
      - "7474:7474" # Browser UI
      - "7687:7687" # Bolt Protocol (Python connection)
    environment:
      - NEO4J_AUTH=neo4j/your_secure_password
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs

  # 2. FastAPI Backend (MCP Server, Client & Cerebras SDK)
  mcp_backend:
    build: ./backend
    ports:
      - "8000:8000" # FastAPI & SSE Port
    environment:
      - CEREBRAS_API_KEY=${CEREBRAS_API_KEY}
      - NEO4J_URI=bolt://neo4j_db:7687
      - NEO4J_PASSWORD=your_secure_password
    volumes:
      - ./backend:/app # Maps local code into the container for live-reloading
    depends_on:
      - neo4j_db

  # 3. React Frontend
  react_frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules # Prevents local node_modules from overriding container
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8000
    depends_on:
      - mcp_backend

volumes:
  neo4j_data:
  neo4j_logs:
```

---

## 🛠️ Skills Architecture (MCP Modularization)

To prevent the LLM from hallucinating database queries and to keep system instructions modular, the backend leverages a **Skills Architecture**. 

Instead of hardcoding massive prompts directly into the Python code, domain-specific rules are pulled into modular markdown files. When the MCP Client starts up, it reads these files to understand its domain limits dynamically.

**Directory Structure:**
```text
backend/
└── skills/
    ├── neo4j_expert/
    │   ├── skill.md
    │   └── cypher_templates.json
    └── student_advisor/
        └── skill.md
```

**Example (`backend/skills/neo4j_expert/skill.md`):**
```markdown
# Skill: Neo4j Query Generation and Validation

## Context
You are a Cypher query optimization engine for the StudyDB graph database. The database uses a strict educational taxonomy.

## Database Schema Model
- Nodes: `(:Student)`, `(:Teacher)`, `(:Class)`, `(:Topic)`, `(:Quiz)`

## Guardrails
1. NEVER execute `MATCH (n) DETACH DELETE n`. If a delete payload is requested, flag it.
2. Always limit database return statements to a maximum of 50 records to prevent buffer bloat.
3. If looking up student behavioral quadrants, query the `behavior` attribute on the `QuestionResponse` node.
```

---

## 🚀 Complete Setup Steps

### Option A: Running via Docker (Recommended)
1. Ensure Docker and Docker Compose are installed.
2. Create a `.env` file in the root of the project:
   ```bash
   CEREBRAS_API_KEY=your_api_key_here
   ```
3. Run the container cluster:
   ```bash
   docker-compose up --build
   ```
4. Access the React Frontend at `http://localhost:3000`

### Option B: Running Locally (Manual)

#### 1. Prerequisites
- Python 3.9+
- Node.js (v18+)
- Neo4j Desktop (Running locally on `127.0.0.1:7687` with credentials `neo4j` / `password`)

#### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Activate venv:
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

pip install -r requirements.txt
echo "CEREBRAS_API_KEY=your_api_key_here" > .env

# Run the FastAPI server (starts on http://localhost:8000)
uvicorn main:app --reload
```

#### 3. Frontend Setup
```bash
cd frontend
npm install

# Start the Vite development server (starts on http://localhost:5173)
npm run dev
```

### Logging In & Using the App
1. Open the frontend in your browser.
2. **Teacher Login**: `holly.flax@school.edu` / `studydb123`
3. **Student Login**: `jake.peralta@student.edu` / `studydb123`
4. Click the floating chat button in the bottom right to talk to the MCP Assistant. 
   - Try asking: *"Draft a 10 question math quiz"* 
   - Or: *"Show me the performance of my math class."*
