// ============================================
// 08 - BACKFILL BEHAVIOR ON QUESTION RESPONSES
// Computes and sets the 'behavior' property on all
// QuestionResponse nodes that were seeded via Cypher
// (which don't have behavior set automatically).
// Safe to re-run — it overwrites with the correct value.
// ============================================

MATCH (qr:QuestionResponse)-[:FOR_QUESTION]->(q:Question)
WITH qr, q,
     coalesce(q.expected_time_seconds,
       CASE q.difficulty
         WHEN 'easy' THEN 15
         WHEN 'medium' THEN 30
         WHEN 'hard' THEN 60
         ELSE 30
       END) AS exp_time
SET qr.behavior = CASE
    WHEN qr.status = 'skipped' THEN 'skipped'
    WHEN qr.time_taken < exp_time AND NOT qr.is_correct THEN 'reckless'
    WHEN qr.time_taken >= exp_time AND NOT qr.is_correct THEN 'struggling'
    WHEN qr.time_taken >= exp_time AND qr.is_correct THEN 'methodical'
    ELSE 'optimal'
END;
