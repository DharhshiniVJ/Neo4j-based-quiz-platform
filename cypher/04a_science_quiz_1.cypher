// ============================================
// 04a - SCIENCE QUIZ SET 1 (SCI-Q1)
// 18 MCQ + 2 short answer, all 12 Science topics
// ============================================

MATCH (teacher:Teacher {userid: "T001"})
CREATE (quiz:Quiz {quizid: "SCI-Q1", title: "Class 7 Science Quiz - Set 1", time_limit_minutes: 20})
CREATE (teacher)-[:POSTED]->(quiz);

MATCH (t:Topic {topicid: "S01"})
CREATE (:Question {questionid: "SCI-Q1-01", text: "The first step of scientific investigation is:", difficulty: "easy", question_type: "MCQ", options: ["Drawing conclusions", "Observation", "Experimentation", "Verification"], correct_answer: "Observation"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S02"})
CREATE (:Question {questionid: "SCI-Q1-02", text: "Which natural indicator turns red in a basic solution?", difficulty: "medium", question_type: "MCQ", options: ["Litmus", "Turmeric", "China rose indicator", "Vinegar"], correct_answer: "China rose indicator"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q1-03", text: "Which of the following turns blue litmus paper red?", difficulty: "easy", question_type: "MCQ", options: ["Soap solution", "Baking soda solution", "Lemon juice", "Lime water"], correct_answer: "Lemon juice"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q1-04", text: "Neutralisation is a reaction between:", difficulty: "easy", question_type: "MCQ", options: ["Acid and metal", "Acid and base", "Metal and non-metal", "Salt and water"], correct_answer: "Acid and base"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S03"})
CREATE (:Question {questionid: "SCI-Q1-05", text: "An electric bulb glows only when the circuit is:", difficulty: "easy", question_type: "MCQ", options: ["Open", "Closed", "Broken", "Insulated"], correct_answer: "Closed"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q1-06", text: "The heating effect of electric current is used in:", difficulty: "easy", question_type: "MCQ", options: ["Electric iron", "Compass", "Magnifying glass", "Thermometer"], correct_answer: "Electric iron"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S04"})
CREATE (:Question {questionid: "SCI-Q1-07", text: "The property that allows metals to be drawn into wires is:", difficulty: "medium", question_type: "MCQ", options: ["Sonority", "Malleability", "Ductility", "Lustre"], correct_answer: "Ductility"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q1-08", text: "Which of these is a non-metal?", difficulty: "easy", question_type: "MCQ", options: ["Iron", "Copper", "Sulphur", "Aluminium"], correct_answer: "Sulphur"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S05"})
CREATE (:Question {questionid: "SCI-Q1-09", text: "Rusting of iron is a:", difficulty: "easy", question_type: "MCQ", options: ["Physical change", "Chemical change", "Reversible change", "Temporary change"], correct_answer: "Chemical change"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q1-10", text: "Which of the following is a physical change?", difficulty: "easy", question_type: "MCQ", options: ["Burning paper", "Cooking food", "Melting ice", "Rusting iron"], correct_answer: "Melting ice"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S06"})
CREATE (:Question {questionid: "SCI-Q1-11", text: "Adolescence generally extends from:", difficulty: "easy", question_type: "MCQ", options: ["5-10 years", "11-19 years", "20-25 years", "25-30 years"], correct_answer: "11-19 years"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S07"})
CREATE (:Question {questionid: "SCI-Q1-12", text: "Heat transfer by direct contact is called:", difficulty: "easy", question_type: "MCQ", options: ["Radiation", "Convection", "Conduction", "Reflection"], correct_answer: "Conduction"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q1-13", text: "Heat from the Sun reaches Earth mainly through:", difficulty: "easy", question_type: "MCQ", options: ["Conduction", "Convection", "Radiation", "Evaporation"], correct_answer: "Radiation"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S08"})
CREATE (:Question {questionid: "SCI-Q1-14", text: "Speed is equal to:", difficulty: "easy", question_type: "MCQ", options: ["Distance x Time", "Distance / Time", "Time / Distance", "Distance + Time"], correct_answer: "Distance / Time"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S09"})
CREATE (:Question {questionid: "SCI-Q1-15", text: "Digestion in humans begins in the:", difficulty: "easy", question_type: "MCQ", options: ["Stomach", "Small intestine", "Mouth", "Liver"], correct_answer: "Mouth"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S10"})
CREATE (:Question {questionid: "SCI-Q1-16", text: "Which gas is used by plants during photosynthesis?", difficulty: "easy", question_type: "MCQ", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], correct_answer: "Carbon dioxide"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q1-19", text: "What is transpiration?", difficulty: "medium", question_type: "short_answer", correct_answer: "Transpiration is the loss of water vapour from the leaves through stomata."})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S11"})
CREATE (:Question {questionid: "SCI-Q1-17", text: "Light travels in:", difficulty: "easy", question_type: "MCQ", options: ["Curved lines", "Zig-zag paths", "Straight lines", "Circular paths"], correct_answer: "Straight lines"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q1-20", text: "State the law of reflection.", difficulty: "medium", question_type: "short_answer", correct_answer: "The angle of incidence is equal to the angle of reflection."})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S12"})
CREATE (:Question {questionid: "SCI-Q1-18", text: "Day and night occur because of Earth's:", difficulty: "easy", question_type: "MCQ", options: ["Revolution around the Sun", "Rotation on its axis", "Movement of the Moon", "Tilt alone"], correct_answer: "Rotation on its axis"})-[:PART_OF]->(t);

// Link quiz to all its questions
MATCH (q:Quiz {quizid: "SCI-Q1"})
MATCH (question:Question)
WHERE question.questionid STARTS WITH "SCI-Q1-"
CREATE (q)-[:CONTAINS]->(question);

// Verify: MATCH (q:Quiz {quizid: "SCI-Q1"})-[:CONTAINS]->(question:Question) RETURN count(question);
