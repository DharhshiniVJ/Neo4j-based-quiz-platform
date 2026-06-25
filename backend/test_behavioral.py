from db import get_session

with get_session() as session:
    res = session.run("""
        MATCH (c:Class {classid: 'C7MATH-H'})<-[:ENROLLED_IN]-(s:Student {name: 'Luke Dunphy'})
        MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:POSTED_TO|FOR_QUIZ*1..2]->(c)
        MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)-[:FOR_QUESTION]->(qst:Question)-[:PART_OF]->(t:Topic)
        RETURN qr.behavior AS behavior, t.name AS topic, qr.status AS status
    """)
    records = [dict(r) for r in res]
    print(f"Total behavioral records returned: {len(records)}")
    
    # Let's count them grouped by behavior
    from collections import Counter
    c = Counter(r['behavior'] for r in records)
    print("Counts by behavior:", c)
    
    # Total questions attempted in math quiz?
    res2 = session.run("""
        MATCH (c:Class {classid: 'C7MATH-H'})<-[:ENROLLED_IN]-(s:Student {name: 'Luke Dunphy'})
        MATCH (s)-[:HAS_ATTEMPT]->(a:Attempt)-[:POSTED_TO|FOR_QUIZ*1..2]->(c)
        MATCH (a)-[:HAS_RESPONSE]->(qr:QuestionResponse)
        RETURN count(qr) as total_responses
    """)
    print("Total QuestionResponses on this path:", res2.single()['total_responses'])
    
    # Wait, does Quiz have POSTED_TO Class?
    res3 = session.run("""
        MATCH (a:Attempt)-[:FOR_QUIZ]->(q:Quiz)
        OPTIONAL MATCH (q)-[r]->(x)
        RETURN q.title, type(r), labels(x) limit 5
    """)
    for r in res3:
        print(dict(r))
