# Quiz Graph Platform

A graph-database-backed platform connecting students, topics, questions, and
performance data — built to surface *which specific topics* are pulling down
a student's performance, and to support behavioral analysis (not just scores).

NCERT Class 7, Math + Science. Built as a portfolio project using Neo4j +
FastAPI (Python) + React, with a planned MCP client/server + LLM integration
layer on top.

## Schema

### Nodes

```
(:Teacher {userid, email, name})
(:Student {userid, email, name, language})
(:Class {classid})
(:Subject {name})
(:Topic {topicid, name, area})
(:Quiz {quizid, title, time_limit_minutes})
(:Question {questionid, text, difficulty, question_type, options, correct_answer})
(:Attempt {attemptid, timestamp, right_count, wrong_count, questions_attempted, time_spent, ended_reason})
(:QuestionResponse {time_taken, status, first_answer, final_answer, is_correct, revision_count})
```

### Relationships

```
(:Teacher)-[:TEACHES]->(:Class)
(:Student)-[:ENROLLED_IN]->(:Class)
(:Class)-[:BELONGS_TO]->(:Subject)
(:Topic)-[:PART_OF]->(:Subject)
(:Question)-[:PART_OF]->(:Topic)
(:Teacher)-[:POSTED]->(:Quiz)
(:Quiz)-[:CONTAINS]->(:Question)
(:Student)-[:HAS_ATTEMPT]->(:Attempt)
(:Attempt)-[:FOR_QUIZ]->(:Quiz)
(:Attempt)-[:HAS_RESPONSE]->(:QuestionResponse)
(:QuestionResponse)-[:FOR_QUESTION]->(:Question)
```

### Derived, not stored

These are intentionally **not** stored as edges/properties — they're computed
via traversal/aggregation whenever needed, to avoid two sources of truth that
can drift out of sync:

- **Teacher's students**: `(:Teacher)-[:TEACHES]->(:Class)<-[:ENROLLED_IN]-(:Student)`
- **Topic-wise score for an attempt**: aggregated from `Attempt -> QuestionResponse -> Question -> Topic`
- **Subject-wise score**: same, one hop further, through `Topic -> Subject`
- **Behavioral labels** (accurate / overconfident / struggling / careful): computed
  from `time_taken` + `is_correct` on QuestionResponse, relative to a baseline
  (e.g. average time for that question), grouped by Student, Topic, Subject, or
  any combination. Nothing here is stored as a static label — it's always a query.

## Key design decisions (and why)

- **Topics are global**, not scoped per class/teacher — multiple sections of
  the same subject (e.g. two different teachers both teaching Science 7)
  share the same Topic nodes, since the syllabus is identical.
- **Each chapter = one Topic**, with a unique `area` per topic (no shared
  areas across topics) — a deliberate simplification; cross-topic rollups
  by area aren't supported as a result.
- **QuestionResponse is a node, not a relationship property bag** — it
  connects three things conceptually (Student, via Attempt; Question; Attempt
  itself) and is queried/aggregated as a first-class unit constantly, which
  is the test for "this deserves to be a node."
- **Only one attempt per quiz** — no retry modeling. Mid-quiz answer revisions
  ARE tracked, but as summary fields (`revision_count`, `first_answer` vs
  `final_answer`) rather than a full event log, to keep QuestionResponse simple.
- **Language preference lives on Student only** (fixed, not per-attempt) —
  a deliberate simplification. This means you can correlate language with
  performance, but can't analyze "did switching language for one quiz change
  performance," since that scenario doesn't exist in the data.
- **Quiz timer is at the quiz level, not per-question** (`time_limit_minutes`
  on Quiz). `Attempt.ended_reason` records whether it ended by normal
  submission or because time ran out.
- **MCQ vs short-answer questions** share one `correct_answer` field for
  comparison; `options` (a list) only exists on MCQ questions for rendering.

## Folder structure

```
study-db/
├── cypher/              # Seed scripts (run in order) + reference queries
├── backend/             # FastAPI + Neo4j driver + business logic
├── frontend/            # React (Vite) + CSS (Tech Brutalist design)
├── .gitignore
└── README.md
```

## How to Run

### 1. Database (Neo4j)
Make sure you have Neo4j running locally on port `7687` with no auth, or update `backend/db.py` to match your credentials.
If starting fresh, run the seed scripts located in `cypher/` in numerical order, then run `python backend/scratch/seed_passwords.py` to hash the passwords. All default users have the password `studydb123`.

### 2. Backend (FastAPI)
Navigate to the `backend/` directory:
```bash
cd backend
pip install fastapi uvicorn neo4j pydantic python-jose[cryptography] passlib[bcrypt]
uvicorn main:app --reload
```
The backend will run on `http://127.0.0.1:8000`.

### 3. Frontend (React)
Open a new terminal and navigate to the `frontend/` directory:
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`.

## Architecture & Implementation

- **Backend**: FastAPI (Python), Neo4j Python driver. JWT authentication using bcrypt.
- **Frontend**: React (Vite). Pure Vanilla CSS used to craft a vibrant, responsive "Tech Brutalist" user interface.
- **Auth**: Application-layer. Strict guards ensure students only access their own records, and teachers only access data for classes they teach. JWT tokens are verified on every request.
- **Analytics Engine**: Pure Cypher. Behavioral metrics (Struggling, Overconfident, Careful, Accurate) are calculated in real-time by analyzing question correctness against expected completion times.
