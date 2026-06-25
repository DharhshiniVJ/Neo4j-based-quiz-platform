from db import get_session

with get_session() as session:
    res = session.run("""
        MATCH (s:Student {userid: 'S001'})-[:HAS_ATTEMPT]->(a:Attempt)-[:HAS_RESPONSE]->(qr:QuestionResponse)-[:FOR_QUESTION]->(q:Question)-[:PART_OF]->(t:Topic)
        RETURN t.name AS topic, qr.behavior AS behavior, qr.is_correct AS is_correct, qr.time_taken AS time_taken, qr.status AS status
    """)
    for record in res:
        print(dict(record))
