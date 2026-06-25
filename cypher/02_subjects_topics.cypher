// ============================================
// 02 - SUBJECTS AND TOPICS
// NCERT Class 7, Math (Ganita Prakash) + Science
// ============================================

// --- Subjects ---
CREATE (:Subject {name: "Math"});
CREATE (:Subject {name: "Science"});

// --- Math Topics (15, matching Ganita Prakash chapters 1-15) ---
MATCH (math:Subject {name: "Math"})
CREATE (:Topic {topicid: "M01", name: "Large Numbers Around Us"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M02", name: "Arithmetic Expressions"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M03", name: "A Peek Beyond the Point"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M04", name: "Expressions Using Letter-Numbers"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M05", name: "Parallel and Intersecting Lines"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M06", name: "Number Play"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M07", name: "A Tale of Three Intersecting Lines"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M08", name: "Working with Fractions"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M09", name: "Geometric Twins"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M10", name: "Operations with Integers"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M11", name: "Finding Common Ground"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M12", name: "Another Peek Beyond the Point"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M13", name: "Connecting the Dots"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M14", name: "Constructions and Tilings"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M15", name: "Finding the Unknown"})-[:PART_OF]->(math);

// --- Science Topics (12 chapters) ---
MATCH (sci:Subject {name: "Science"})
CREATE (:Topic {topicid: "S01", name: "The Ever-Evolving World of Science"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S02", name: "Exploring Substances: Acidic, Basic, and Neutral"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S03", name: "Electricity: Circuits and their Components"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S04", name: "The World of Metals and Non-metals"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S05", name: "Changes Around Us: Physical and Chemical"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S06", name: "Adolescence: A Stage of Growth and Change"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S07", name: "Heat Transfer in Nature"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S08", name: "Measurement of Time and Motion"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S09", name: "Life Processes in Animals"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S10", name: "Life Processes in Plants"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S11", name: "Light: Shadows and Reflections"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S12", name: "Earth, Moon, and the Sun"})-[:PART_OF]->(sci);

// Verify:
// MATCH (t:Topic)-[:PART_OF]->(s:Subject) RETURN s.name AS subject, count(t) AS topic_count;
