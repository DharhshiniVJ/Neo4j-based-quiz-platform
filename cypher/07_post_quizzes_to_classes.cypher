// ============================================
// 07 - POST QUIZZES TO CLASSES
// Links each quiz to the appropriate class via POSTED_TO.
// ============================================

MATCH (q1:Quiz {quizid: "SCI-Q1"}), (c:Class {classid: "C7SCI-H"})
MERGE (q1)-[:POSTED_TO]->(c);

MATCH (q2:Quiz {quizid: "SCI-Q2"}), (c:Class {classid: "C7SCI-H"})
MERGE (q2)-[:POSTED_TO]->(c);

MATCH (q3:Quiz {quizid: "MATH-Q1"}), (c:Class {classid: "C7MATH-H"})
MERGE (q3)-[:POSTED_TO]->(c);

MATCH (q4:Quiz {quizid: "MATH-Q2"}), (c:Class {classid: "C7MATH-H"})
MERGE (q4)-[:POSTED_TO]->(c);

// Verify:
// MATCH (q:Quiz)-[:POSTED_TO]->(c:Class) RETURN q.quizid, c.classid;
