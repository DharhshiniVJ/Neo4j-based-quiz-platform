from db import get_session

with get_session() as session:
    res = session.run("""
        MATCH (s:Student {name: 'Luke Dunphy'})-[:HAS_ATTEMPT]->(a:Attempt)-[:HAS_RESPONSE]->(qr:QuestionResponse)
        RETURN qr.behavior AS behavior, count(qr) as c
    """)
    for r in res:
        print(dict(r))
        
    print("\nSkipped vs answered:")
    res2 = session.run("""
        MATCH (s:Student {name: 'Luke Dunphy'})-[:HAS_ATTEMPT]->(a:Attempt)-[:HAS_RESPONSE]->(qr:QuestionResponse)
        RETURN qr.status AS status, count(qr) as c
    """)
    for r in res2:
        print(dict(r))
        
    print("\nCorrect vs Incorrect by topic:")
    res3 = session.run("""
        MATCH (s:Student {name: 'Luke Dunphy'})-[:HAS_ATTEMPT]->(a:Attempt)-[:HAS_RESPONSE]->(qr:QuestionResponse)-[:FOR_QUESTION]->(q:Question)-[:PART_OF]->(t:Topic)
        RETURN t.name as topic, sum(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) as correct, count(qr) as total, qr.behavior as behavior
        ORDER BY topic
    """)
    for r in res3:
        print(dict(r))
