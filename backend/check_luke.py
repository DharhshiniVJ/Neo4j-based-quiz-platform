from db import get_session

with get_session() as session:
    # Delete the later duplicate (the one 738ms after the first)
    result = session.run("""
        MATCH (s:Student {userid: 'S003'})-[:HAS_ATTEMPT]->(a:Attempt)-[:FOR_QUIZ]->(q:Quiz {quizid: 'MATH-Q2'})
        WITH a ORDER BY a.timestamp ASC
        WITH collect(a) AS attempts
        // Keep the first, delete the rest
        WITH attempts[1..] AS duplicates
        UNWIND duplicates AS dup
        MATCH (dup)-[:HAS_RESPONSE]->(qr:QuestionResponse)
        DETACH DELETE dup, qr
        RETURN count(dup) AS deleted
    """)
    print("Deleted duplicate attempts:", result.single()["deleted"])

    # Verify
    res = session.run("""
        MATCH (s:Student {name: 'Luke Dunphy'})-[:HAS_ATTEMPT]->(a:Attempt)-[:FOR_QUIZ]->(q:Quiz)
        RETURN q.title AS quiz, a.attemptid AS attempt_id, a.timestamp AS ts
        ORDER BY q.title, a.timestamp
    """)
    print("\nLuke's attempts after cleanup:")
    for r in res:
        print(dict(r))
