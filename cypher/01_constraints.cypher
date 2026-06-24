// ============================================
// 01 - CONSTRAINTS
// Run this first. Safe to re-run (IF NOT EXISTS).
// ============================================

CREATE CONSTRAINT student_id IF NOT EXISTS FOR (s:Student) REQUIRE s.userid IS UNIQUE;
CREATE CONSTRAINT teacher_id IF NOT EXISTS FOR (t:Teacher) REQUIRE t.userid IS UNIQUE;
CREATE CONSTRAINT class_id IF NOT EXISTS FOR (c:Class) REQUIRE c.classid IS UNIQUE;
CREATE CONSTRAINT subject_name IF NOT EXISTS FOR (s:Subject) REQUIRE s.name IS UNIQUE;
CREATE CONSTRAINT topic_id IF NOT EXISTS FOR (t:Topic) REQUIRE t.topicid IS UNIQUE;
CREATE CONSTRAINT quiz_id IF NOT EXISTS FOR (q:Quiz) REQUIRE q.quizid IS UNIQUE;
CREATE CONSTRAINT question_id IF NOT EXISTS FOR (q:Question) REQUIRE q.questionid IS UNIQUE;
CREATE CONSTRAINT attempt_id IF NOT EXISTS FOR (a:Attempt) REQUIRE a.attemptid IS UNIQUE;

// Verify:
// SHOW CONSTRAINTS;
