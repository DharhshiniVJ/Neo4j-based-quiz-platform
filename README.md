# StudyDB: MCP-Powered Cognitive Assessment Platform

StudyDB is an intelligent educational platform that uses a Neo4j graph database, an LLM-powered Model Context Protocol (MCP) Assistant, and a React frontend to analyze student performance.

Rather than just grading students based on right or wrong answers, StudyDB implements a **Cognitive Assessment Framework** that categorizes how a student solves problems based on their *behavior*.

## Architecture

StudyDB consists of three main layers:

1. **Graph Database (Neo4j)**: Stores the highly interconnected educational graph: `(Teacher)-[:TEACHES]->(Class)<-[:ENROLLED_IN]-(Student)`. Quizzes and questions are linked to specific topics, and student `QuestionResponses` are mapped back to those questions, allowing for complex traversal (e.g., "Find all topics this student struggles with across all classes").
2. **Backend Engine (FastAPI + MCP)**: A Python FastAPI backend that serves standard REST endpoints for the UI, but also acts as an **MCP Client**. When a user talks to the AI, the backend provides the LLM (Cerebras) with a suite of graph-aware tools. The AI can reason about the database, fetch topics, generate quizzes, and even trigger UI events directly.
3. **Frontend (React + Vite)**: A dynamic "Neo-Brutalist" UI that renders dashboards for teachers and students. It listens for `_mcp_action` payloads from the backend to automatically open drawers, spawn quiz creators, or navigate pages based entirely on the AI's natural language understanding.

## The Cognitive Assessment Framework (Behavioral Evaluation Matrix)

The core innovation of StudyDB is the **Behavioral Evaluation Matrix**. It categorizes how a student solves problems by measuring two primary variables:
1. **Response Time (Speed)**: How long the student took compared to the question's expected baseline time.
2. **Accuracy (Correctness)**: Whether the final answer was right or wrong.

By plotting these two variables, every single question attempt is instantly classified into one of four distinct behavioral quadrants:

| Accuracy \ Speed | Fast ( < Expected Time ) | Slow ( >= Expected Time ) |
| :--- | :--- | :--- |
| **Incorrect** | ⚠️ **Reckless**<br>Rushing through questions and guessing. | 🆘 **Struggling**<br>Spending a lot of time but still getting it wrong. Needs intervention. |
| **Correct** | ⚡ **Optimal**<br>Efficiently and accurately arriving at the right answer. | 🧠 **Methodical**<br>Taking their time to carefully think through the problem and getting it right. |

### Why this matters
Traditional grading tells a teacher a student got a "70%". The Behavioral Matrix tells the teacher *why*:
- Are they failing because they are **Reckless** (need to slow down and check their work)?
- Or are they failing because they are **Struggling** (need foundational reteaching)?

The AI Assistant uses this graph structure to answer complex natural language queries like, *"Which topics are my math students struggling with?"* and immediately drafts targeted quizzes to address those exact behavioral gaps.

## Setup Instructions

### 1. Prerequisites
- Python 3.9+
- Node.js (v18+)
- Neo4j Desktop or Docker (Running locally on `127.0.0.1:7687`)
- Cerebras API Key (for the LLM Assistant)

### 2. Database Setup
1. Start your Neo4j instance.
2. The backend is configured to use `neo4j` / `password`. If your credentials differ, update them in `backend/db.py`.

### 3. Backend Setup
```bash
cd backend
python -m venv venv
# Activate venv:
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

pip install -r requirements.txt

# Create a .env file and add your API key:
echo "CEREBRAS_API_KEY=your_api_key_here" > .env

# Run the FastAPI server (starts on http://localhost:8000)
uvicorn main:app --reload
```

*(Note: If you need to seed the database with test data, you can run `python seed.py` before starting the server).*

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
4. Click the floating chat button in the bottom right to talk to the MCP Assistant. Try asking: *"Draft a 10 question math quiz"* or *"Show me the performance of my math class."*
