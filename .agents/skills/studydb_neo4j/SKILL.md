---
name: studydb_neo4j
description: >
  Activates when working on the StudyDB quiz platform's Neo4j database — its schema,
  Cypher queries, seed scripts, behavioral matrix logic, or any node/relationship/property
  specific to this application.
---

# StudyDB — Neo4j Schema Reference

## Connection

- **URI:** `bolt://localhost:7687` (local) or `bolt://neo4j_db:7687` (Docker service name)
- **Username:** `neo4j`
- **Password (local):** `Hemalatha3015!` (from `backend/.env`)
- **Password (Docker):** `password` (from `docker-compose.yaml`)
- **Database:** `neo4j` (default)
- **Driver:** Python `neo4j` package via `backend/db.py` → `get_session()`

---

## Node Labels & Properties

### `Student`
| Property | Type | Notes |
|---|---|---|
| `userid` | String | Unique. Format: `S001`, `S002` |
| `name` | String | Full name |
| `email` | String | Login credential |
| `password_hash` | String | bcrypt hash. Set by `seed.py` / signup endpoint |
| `language` | String | Seeded but currently unused by any endpoint |

### `Teacher`
| Property | Type | Notes |
|---|---|---|
| `userid` | String | Unique. Format: `T001`, `T002` |
| `name` | String | Full name |
| `email` | String | Login credential |
| `password_hash` | String | bcrypt hash. Set by `seed.py` / signup endpoint |

### `Class`
| Property | Type | Notes |
|---|---|---|
| `classid` | String | Unique. Format: `C7SCI-H`, `C7MATH-H` |
| `join_code` | String | Unique 6-char code students use to join |

### `Subject`
| Property | Type | Notes |
|---|---|---|
| `name` | String | Unique. Values: `"Math"`, `"Science"` |

### `Topic`
| Property | Type | Notes |
|---|---|---|
| `topicid` | String | Unique. Format: `M01`–`M15` (Math), `S01`–`S12` (Science) |
| `name` | String | Indexed. E.g. `"Large Numbers Around Us"` |

### `Quiz`
| Property | Type | Notes |
|---|---|---|
| `quizid` | String | Unique. Seeded: `MATH-Q1`, `MATH-Q2`, `SCI-Q1`, `SCI-Q2`. AI-generated: `QUIZ-T001-<timestamp>` |
| `title` | String | Display title |
| `time_limit_minutes` | Integer | Default: 20 |

### `Question`
| Property | Type | Notes |
|---|---|---|
| `questionid` | String | Unique. Format: `MATH-Q1-01`, `SCI-Q1-01` |
| `text` | String | The question text |
| `question_type` | String | `"mcq"` or `"short_answer"` |
| `options` | String (JSON) | MCQ only. JSON array e.g. `'["A","B","C","D"]'` |
| `correct_answer` | String | The correct answer string |
| `difficulty` | String | `"easy"`, `"medium"`, `"hard"` |
| `expected_time_seconds` | Integer | Set by `06_backfill_expected_time.cypher`. Used in behavior calc |

### `Attempt`
| Property | Type | Notes |
|---|---|---|
| `attemptid` | String | Unique. Format: `ATT-XXXXXXXX` (8 random chars) |
| `timestamp` | DateTime | When the attempt was started |
| `ended_reason` | String | `"submitted"` or `"timeout"` |
| `right_count` | Integer | Rolled up after submission |
| `wrong_count` | Integer | Rolled up after submission |
| `questions_attempted` | Integer | Rolled up after submission |
| `time_spent` | Integer | Total seconds. Rolled up after submission |

### `QuestionResponse`
| Property | Type | Notes |
|---|---|---|
| `time_taken` | Integer | Seconds taken on this question |
| `status` | String | `"answered"` or `"skipped"` |
| `first_answer` | String | The student's first typed/selected answer |
| `final_answer` | String | Their last answer (may differ if revised) |
| `is_correct` | Boolean | Whether `final_answer` matches `correct_answer` |
| `revision_count` | Integer | How many times the student changed their answer |
| `behavior` | String | `"optimal"`, `"methodical"`, `"reckless"`, `"struggling"`, `"skipped"` |

### `Document` (runtime-only, created on PDF upload)
| Property | Type | Notes |
|---|---|---|
| `docid` | String | UUID |
| `filename` | String | Original filename |
| `filepath` | String | Server path to stored file |
| `uploaded_at` | DateTime | Upload timestamp |

### `Chunk` (runtime-only, created by PDF processor)
| Property | Type | Notes |
|---|---|---|
| `chunkid` | String | `<docid>_chunk_<index>` |
| `text` | String | The chunk text content |
| `index` | Integer | Position in the document |

---

## Relationships

| Relationship | From → To | Properties | Notes |
|---|---|---|---|
| `[:TEACHES]` | `Teacher → Class` | none | A teacher can teach multiple classes |
| `[:ENROLLED_IN]` | `Student → Class` | none | A student can be in multiple classes |
| `[:BELONGS_TO]` | `Class → Subject` | none | Each class belongs to one subject |
| `[:PART_OF]` | `Topic → Subject` | none | Topic belongs to subject |
| `[:PART_OF]` | `Question → Topic` | none | Question belongs to topic |
| `[:PART_OF]` | `Chunk → Document` | none | Chunk belongs to document |
| `[:CONTAINS]` | `Quiz → Question` | none | Quiz contains many questions |
| `[:POSTED]` | `Teacher → Quiz` | none | Teacher who created the quiz |
| `[:POSTED_TO]` | `Quiz → Class` | none | Quiz is assigned to a class |
| `[:HAS_ATTEMPT]` | `Student → Attempt` | none | Student's quiz attempts |
| `[:FOR_QUIZ]` | `Attempt → Quiz` | none | Which quiz this attempt is for |
| `[:HAS_RESPONSE]` | `Attempt → QuestionResponse` | none | One per question in the quiz |
| `[:FOR_QUESTION]` | `QuestionResponse → Question` | none | Which question this response is for |
| `[:UPLOADED_TO]` | `Document → Class` | none | PDF uploaded to a class |

---

## Behavioral Matrix Logic

The `behavior` property on `QuestionResponse` is computed at attempt submission time:

```cypher
behavior: CASE
    WHEN status = 'skipped'                              THEN 'skipped'
    WHEN time_taken < expected_time AND NOT is_correct   THEN 'reckless'
    WHEN time_taken >= expected_time AND NOT is_correct  THEN 'struggling'
    WHEN time_taken >= expected_time AND is_correct      THEN 'methodical'
    ELSE                                                      'optimal'   -- fast + correct
END
```

**Skipped** definition: `time_taken < 1` second (frontend sends `status: "skipped"`).

| Quadrant | Speed | Accuracy | Meaning |
|---|---|---|---|
| `optimal` | Fast (< expected) | Correct | True mastery |
| `methodical` | Slow (≥ expected) | Correct | Understands, needs confidence |
| `reckless` | Fast (< expected) | Incorrect | Guessing / rushing |
| `struggling` | Slow (≥ expected) | Incorrect | Deep knowledge gap |

---

## Seeded Data Summary

| Entity | IDs |
|---|---|
| Teachers | `T001` (Holly Flax), `T002` (Holt) |
| Students | `S001` (Jake Peralta), `S002` (Phoebe Buffay), `S003` (Luke Dunphy) |
| Classes | `C7SCI-H` (Holly's Science), `C7SCI-D` (Holt's Science), `C7MATH-H` (Holly's Math) |
| Quizzes | `SCI-Q1`, `SCI-Q2`, `MATH-Q1`, `MATH-Q2` |
| Sample Attempt | `ATT-001` — Jake Peralta on `MATH-Q1` |
| Default Password | `studydb123` for all seeded users |

---

## Seed Script Pipeline (`backend/seed.py`)

Run in this order:
1. `01_constraints.cypher` — uniqueness constraints + indexes
2. `02_subjects_topics.cypher` — Subject + Topic nodes
3. `03_teachers_students_classes.cypher` — Teacher, Student, Class nodes + relationships
4. `04a–04d` — Quiz + Question nodes (one file per quiz)
5. `05_sample_attempt.cypher` — Jake's sample attempt + 20 QuestionResponse nodes + rollup
6. `06_backfill_expected_time.cypher` — Sets `expected_time_seconds` on all Questions
7. `07_post_quizzes_to_classes.cypher` — Creates `[:POSTED_TO]` for all 4 seeded quizzes
8. `08_backfill_behavior.cypher` — Sets `behavior` on all seeded QuestionResponse nodes
9. `seed_passwords()` in Python — bcrypt-hashes all Student + Teacher nodes (`studydb123`)

---

## Common Query Patterns Used in This App

### Get all attempts for a student across all classes
```cypher
MATCH (s:Student {userid: $student_id})-[:HAS_ATTEMPT]->(a:Attempt)-[:FOR_QUIZ]->(q:Quiz)
RETURN a, q
```

### Get behavioral data for a specific attempt
```cypher
MATCH (s:Student {userid: $student_id})-[:HAS_ATTEMPT]->(a:Attempt {attemptid: $attempt_id})
MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)-[:FOR_QUESTION]->(q:Question)-[:PART_OF]->(t:Topic)
RETURN qr.behavior, t.name, qr.time_taken, q.expected_time_seconds, qr.is_correct
```

### Get all students in a class with their attempt stats
```cypher
MATCH (c:Class {classid: $class_id})<-[:ENROLLED_IN]-(s:Student)
OPTIONAL MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:FOR_QUIZ]->(q:Quiz)-[:POSTED_TO]->(c)
RETURN s, collect(a) AS attempts
```

### Navigate from Attempt to Class (used in overall stats)
```cypher
MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:FOR_QUIZ]->(q:Quiz)-[:POSTED_TO]->(c:Class {classid: $class_id})
```
Note: The shorthand `[:POSTED_TO|FOR_QUIZ*1..2]` is used in some endpoints — this is equivalent but requires the quiz to be posted to the class.
