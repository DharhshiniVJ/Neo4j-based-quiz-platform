from db import get_session

with get_session() as session:
    print("--- TEACHERS ---")
    teachers = session.run("MATCH (t:Teacher) RETURN t.name AS name, t.email AS email LIMIT 2")
    for t in teachers:
        print(dict(t))
        
    print("\n--- STUDENTS ---")
    students = session.run("MATCH (s:Student) RETURN s.name AS name, s.email AS email LIMIT 2")
    for s in students:
        print(dict(s))
