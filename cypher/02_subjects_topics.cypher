// ============================================
// 02 - SUBJECTS AND TOPICS
// NCERT Class 7, Math (Ganita Prakash) + Science
// ============================================

// --- Subjects ---
CREATE (:Subject {name: "Math"});
CREATE (:Subject {name: "Science"});

// --- Math Topics (15, matching Ganita Prakash chapters 1-15) ---
MATCH (math:Subject {name: "Math"})
CREATE (:Topic {topicid: "M01", name: "Large Numbers Around Us", area: "Number System"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M02", name: "Arithmetic Expressions", area: "Arithmetic"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M03", name: "A Peek Beyond the Point", area: "Decimals"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M04", name: "Expressions Using Letter-Numbers", area: "Algebraic Expressions"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M05", name: "Parallel and Intersecting Lines", area: "Angles and Lines"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M06", name: "Number Play", area: "Number Theory"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M07", name: "A Tale of Three Intersecting Lines", area: "Triangles"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M08", name: "Working with Fractions", area: "Fractions"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M09", name: "Geometric Twins", area: "Congruence"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M10", name: "Operations with Integers", area: "Integers"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M11", name: "Finding Common Ground", area: "HCF and LCM"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M12", name: "Another Peek Beyond the Point", area: "Decimals and Fractions"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M13", name: "Connecting the Dots", area: "Data Handling"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M14", name: "Constructions and Tilings", area: "Practical Geometry"})-[:PART_OF]->(math)
CREATE (:Topic {topicid: "M15", name: "Finding the Unknown", area: "Linear Equations"})-[:PART_OF]->(math);

// --- Science Topics (12 chapters) ---
MATCH (sci:Subject {name: "Science"})
CREATE (:Topic {topicid: "S01", name: "The Ever-Evolving World of Science", area: "Scientific Method and Inquiry"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S02", name: "Exploring Substances: Acidic, Basic, and Neutral", area: "Acids, Bases, and Indicators"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S03", name: "Electricity: Circuits and their Components", area: "Electrical Physics"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S04", name: "The World of Metals and Non-metals", area: "Materials Chemistry"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S05", name: "Changes Around Us: Physical and Chemical", area: "Chemical Reactions"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S06", name: "Adolescence: A Stage of Growth and Change", area: "Human Biology"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S07", name: "Heat Transfer in Nature", area: "Thermodynamics"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S08", name: "Measurement of Time and Motion", area: "Kinematics and Mechanics"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S09", name: "Life Processes in Animals", area: "Animal Physiology"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S10", name: "Life Processes in Plants", area: "Plant Physiology"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S11", name: "Light: Shadows and Reflections", area: "Optics and Light Physics"})-[:PART_OF]->(sci)
CREATE (:Topic {topicid: "S12", name: "Earth, Moon, and the Sun", area: "Astronomy and Space Science"})-[:PART_OF]->(sci);

// Verify:
// MATCH (t:Topic)-[:PART_OF]->(s:Subject) RETURN s.name AS subject, count(t) AS topic_count;
