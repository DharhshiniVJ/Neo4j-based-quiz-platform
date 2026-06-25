from db import get_session

with get_session() as session:
    res = session.run("MATCH (sub:Subject)-[r]-(t:Topic) RETURN type(r) AS rel_type LIMIT 1")
    for record in res:
        print(dict(record))
