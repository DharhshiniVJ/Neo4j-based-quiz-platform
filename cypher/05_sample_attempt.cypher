// ============================================
// 05 - SAMPLE ATTEMPT (end-to-end test data)
// Jake Peralta (S001) attempts Math Quiz Set 1 (MATH-Q1)
// Demonstrates the full path:
// Student -> Attempt -> QuestionResponse -> Question -> Topic -> Subject
// ============================================

MATCH (s:Student {userid: "S001"})
MATCH (q:Quiz {quizid: "MATH-Q1"})
CREATE (a:Attempt {
  attemptid: "ATT-001",
  timestamp: datetime("2026-06-20T10:00:00"),
  right_count: 0,
  wrong_count: 0,
  questions_attempted: 0,
  time_spent: 0,
  ended_reason: "submitted"
})
CREATE (s)-[:HAS_ATTEMPT]->(a)
CREATE (a)-[:FOR_QUIZ]->(q);

// --- QuestionResponses (all 20 questions) ---

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q1:Question {questionid: "MATH-Q1-01"})
CREATE (qr1:QuestionResponse {time_taken: 25, status: "answered", first_answer: "Five crore eight lakh seven thousand nine hundred twelve", final_answer: "Five crore eight lakh seven thousand nine hundred twelve", is_correct: true, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr1)
CREATE (qr1)-[:FOR_QUESTION]->(q1);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q2:Question {questionid: "MATH-Q1-02"})
CREATE (qr2:QuestionResponse {time_taken: 60, status: "answered", first_answer: "35", final_answer: "42", is_correct: false, revision_count: 1})
CREATE (a)-[:HAS_RESPONSE]->(qr2)
CREATE (qr2)-[:FOR_QUESTION]->(q2);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q3:Question {questionid: "MATH-Q1-03"})
CREATE (qr3:QuestionResponse {time_taken: 15, status: "answered", first_answer: "0.002", final_answer: "0.002", is_correct: true, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr3)
CREATE (qr3)-[:FOR_QUESTION]->(q3);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q4:Question {questionid: "MATH-Q1-04"})
CREATE (qr4:QuestionResponse {time_taken: 90, status: "answered", first_answer: "21", final_answer: "21", is_correct: true, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr4)
CREATE (qr4)-[:FOR_QUESTION]->(q4);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q5:Question {questionid: "MATH-Q1-05"})
CREATE (qr5:QuestionResponse {time_taken: 10, status: "skipped", first_answer: null, final_answer: null, is_correct: false, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr5)
CREATE (qr5)-[:FOR_QUESTION]->(q5);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q6:Question {questionid: "MATH-Q1-06"})
CREATE (qr6:QuestionResponse {time_taken: 12, status: "answered", first_answer: "729", final_answer: "729", is_correct: true, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr6)
CREATE (qr6)-[:FOR_QUESTION]->(q6);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q7:Question {questionid: "MATH-Q1-07"})
CREATE (qr7:QuestionResponse {time_taken: 8, status: "answered", first_answer: "51", final_answer: "51", is_correct: false, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr7)
CREATE (qr7)-[:FOR_QUESTION]->(q7);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q8:Question {questionid: "MATH-Q1-08"})
CREATE (qr8:QuestionResponse {time_taken: 20, status: "answered", first_answer: "180 degrees", final_answer: "180 degrees", is_correct: true, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr8)
CREATE (qr8)-[:FOR_QUESTION]->(q8);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q9:Question {questionid: "MATH-Q1-09"})
CREATE (qr9:QuestionResponse {time_taken: 75, status: "answered", first_answer: "80 degrees", final_answer: "70 degrees", is_correct: true, revision_count: 1})
CREATE (a)-[:HAS_RESPONSE]->(qr9)
CREATE (qr9)-[:FOR_QUESTION]->(q9);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q10:Question {questionid: "MATH-Q1-10"})
CREATE (qr10:QuestionResponse {time_taken: 95, status: "answered", first_answer: "5/8", final_answer: "5/8", is_correct: false, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr10)
CREATE (qr10)-[:FOR_QUESTION]->(q10);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q11:Question {questionid: "MATH-Q1-11"})
CREATE (qr11:QuestionResponse {time_taken: 18, status: "answered", first_answer: "Same shape and same size", final_answer: "Same shape and same size", is_correct: true, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr11)
CREATE (qr11)-[:FOR_QUESTION]->(q11);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q12:Question {questionid: "MATH-Q1-12"})
CREATE (qr12:QuestionResponse {time_taken: 10, status: "answered", first_answer: "5", final_answer: "5", is_correct: true, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr12)
CREATE (qr12)-[:FOR_QUESTION]->(q12);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q13:Question {questionid: "MATH-Q1-13"})
CREATE (qr13:QuestionResponse {time_taken: 9, status: "answered", first_answer: "-40", final_answer: "-40", is_correct: false, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr13)
CREATE (qr13)-[:FOR_QUESTION]->(q13);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q14:Question {questionid: "MATH-Q1-14"})
CREATE (qr14:QuestionResponse {time_taken: 70, status: "answered", first_answer: "12", final_answer: "12", is_correct: true, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr14)
CREATE (qr14)-[:FOR_QUESTION]->(q14);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q15:Question {questionid: "MATH-Q1-15"})
CREATE (qr15:QuestionResponse {time_taken: 100, status: "answered", first_answer: "18", final_answer: "24", is_correct: true, revision_count: 1})
CREATE (a)-[:HAS_RESPONSE]->(qr15)
CREATE (qr15)-[:FOR_QUESTION]->(q15);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q16:Question {questionid: "MATH-Q1-16"})
CREATE (qr16:QuestionResponse {time_taken: 22, status: "answered", first_answer: "5/8", final_answer: "5/8", is_correct: true, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr16)
CREATE (qr16)-[:FOR_QUESTION]->(q16);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q17:Question {questionid: "MATH-Q1-17"})
CREATE (qr17:QuestionResponse {time_taken: 14, status: "answered", first_answer: "Bar graph", final_answer: "Bar graph", is_correct: true, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr17)
CREATE (qr17)-[:FOR_QUESTION]->(q17);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q18:Question {questionid: "MATH-Q1-18"})
CREATE (qr18:QuestionResponse {time_taken: 16, status: "answered", first_answer: "Protractor", final_answer: "Protractor", is_correct: true, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr18)
CREATE (qr18)-[:FOR_QUESTION]->(q18);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q19:Question {questionid: "MATH-Q1-19"})
CREATE (qr19:QuestionResponse {time_taken: 110, status: "answered", first_answer: "5", final_answer: "5", is_correct: true, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr19)
CREATE (qr19)-[:FOR_QUESTION]->(q19);

MATCH (a:Attempt {attemptid: "ATT-001"})
MATCH (q20:Question {questionid: "MATH-Q1-20"})
CREATE (qr20:QuestionResponse {time_taken: 35, status: "answered", first_answer: "20", final_answer: "20", is_correct: true, revision_count: 0})
CREATE (a)-[:HAS_RESPONSE]->(qr20)
CREATE (qr20)-[:FOR_QUESTION]->(q20);

// --- Roll up summary stats onto the Attempt node ---
// (Done last, after all QuestionResponses exist, so the numbers are real)
MATCH (a:Attempt {attemptid: "ATT-001"})-[:HAS_RESPONSE]->(qr:QuestionResponse)
WITH a,
     count(qr) AS attempted,
     sum(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) AS correct,
     sum(CASE WHEN qr.is_correct = false THEN 1 ELSE 0 END) AS incorrect,
     sum(qr.time_taken) AS total_time
SET a.questions_attempted = attempted,
    a.right_count = correct,
    a.wrong_count = incorrect,
    a.time_spent = total_time;

// Verify: MATCH (a:Attempt {attemptid: "ATT-001"}) RETURN a.questions_attempted, a.right_count, a.wrong_count, a.time_spent;
// Expected: 20, 15, 5, 814

// Note: time_limit_minutes is set directly on each Quiz at creation time
// (see 04a-04d) - no separate patch step needed when running these scripts
// fresh on an empty database.
