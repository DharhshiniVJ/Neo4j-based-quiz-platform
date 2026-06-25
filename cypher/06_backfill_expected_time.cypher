// ============================================
// 06 - BACKFILL: expected_time_seconds by difficulty
// Run once to fix the flat 30s default on existing Question nodes.
// Only touches questions that don't already have a real value set,
// so it's safe to re-run.
// ============================================

MATCH (q:Question)
WHERE q.expected_time_seconds IS NULL
SET q.expected_time_seconds = CASE q.difficulty
    WHEN "easy" THEN 15
    WHEN "medium" THEN 30
    WHEN "hard" THEN 60
    ELSE 30
END;

// Verify:
// MATCH (q:Question) RETURN q.difficulty AS difficulty, q.expected_time_seconds AS expected_time, count(*) AS n
// ORDER BY difficulty;
