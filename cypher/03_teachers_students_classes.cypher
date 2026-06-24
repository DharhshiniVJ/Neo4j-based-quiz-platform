// ============================================
// 03 - TEACHERS, STUDENTS, CLASSES
// ============================================

// --- Teachers ---
CREATE (:Teacher {userid: "T001", name: "Holly Flax", email: "holly.flax@school.edu"});
CREATE (:Teacher {userid: "T002", name: "Holt", email: "holt@school.edu"});

// --- Classes (linked to Subject) ---
MATCH (math:Subject {name: "Math"})
MATCH (sci:Subject {name: "Science"})
CREATE (:Class {classid: "C7SCI-H"})-[:BELONGS_TO]->(sci)
CREATE (:Class {classid: "C7SCI-D"})-[:BELONGS_TO]->(sci)
CREATE (:Class {classid: "C7MATH-H"})-[:BELONGS_TO]->(math);

// --- Teacher -> Class (TEACHES) ---
MATCH (h:Teacher {userid: "T001"})
MATCH (d:Teacher {userid: "T002"})
MATCH (c1:Class {classid: "C7SCI-H"})
MATCH (c2:Class {classid: "C7SCI-D"})
MATCH (c3:Class {classid: "C7MATH-H"})
CREATE (h)-[:TEACHES]->(c1)
CREATE (d)-[:TEACHES]->(c2)
CREATE (h)-[:TEACHES]->(c3);

// --- Students ---
CREATE (:Student {userid: "S001", name: "Jake Peralta", email: "jake.peralta@student.edu", language: "English"});
CREATE (:Student {userid: "S002", name: "Phoebe Buffay", email: "phoebe.buffay@student.edu", language: "Hindi"});
CREATE (:Student {userid: "S003", name: "Luke Dunphy", email: "luke.dunphy@student.edu", language: "Hindi"});

// --- Student -> Class (ENROLLED_IN) ---
MATCH (s1:Student {userid: "S001"})
MATCH (s3:Student {userid: "S003"})
MATCH (c1:Class {classid: "C7SCI-H"})
MATCH (c3:Class {classid: "C7MATH-H"})
CREATE (s1)-[:ENROLLED_IN]->(c1)
CREATE (s1)-[:ENROLLED_IN]->(c3)
CREATE (s3)-[:ENROLLED_IN]->(c3);

MATCH (s2:Student {userid: "S002"})
MATCH (c1:Class {classid: "C7SCI-H"})
CREATE (s2)-[:ENROLLED_IN]->(c1);

// Verify:
// MATCH (t:Teacher)-[:TEACHES]->(c:Class)<-[:ENROLLED_IN]-(s:Student)
// RETURN t.name, c.classid, s.name;
