// ============================================
// 04b - SCIENCE QUIZ SET 2 (SCI-Q2)
// 17 MCQ + 3 short answer, all 12 Science topics
// ============================================

MATCH (teacher:Teacher {userid: "T001"})
CREATE (quiz:Quiz {quizid: "SCI-Q2", title: "Class 7 Science Quiz - Set 2", time_limit_minutes: 20})
CREATE (teacher)-[:POSTED]->(quiz);

MATCH (t:Topic {topicid: "S01"})
CREATE (:Question {questionid: "SCI-Q2-01", text: "A hypothesis is:", difficulty: "medium", question_type: "MCQ", options: ["A random statement", "A possible explanation based on observations", "A law", "A conclusion"], correct_answer: "A possible explanation based on observations"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S02"})
CREATE (:Question {questionid: "SCI-Q2-02", text: "Soap solution is:", difficulty: "easy", question_type: "MCQ", options: ["Acidic", "Neutral", "Basic", "Salty"], correct_answer: "Basic"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q2-03", text: "Which substance can neutralize an ant bite (formic acid)?", difficulty: "medium", question_type: "MCQ", options: ["Vinegar", "Lemon juice", "Baking soda solution", "Salt solution"], correct_answer: "Baking soda solution"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S03"})
CREATE (:Question {questionid: "SCI-Q2-04", text: "Which symbol represents an electric cell?", difficulty: "easy", question_type: "MCQ", options: ["Two parallel lines of unequal length", "A circle", "A zig-zag line", "A rectangle"], correct_answer: "Two parallel lines of unequal length"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S04"})
CREATE (:Question {questionid: "SCI-Q2-05", text: "Which property allows metals to be beaten into sheets?", difficulty: "medium", question_type: "MCQ", options: ["Ductility", "Malleability", "Sonority", "Hardness"], correct_answer: "Malleability"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q2-06", text: "Which metal is liquid at room temperature?", difficulty: "easy", question_type: "MCQ", options: ["Iron", "Copper", "Mercury", "Aluminium"], correct_answer: "Mercury"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S05"})
CREATE (:Question {questionid: "SCI-Q2-07", text: "Burning magnesium ribbon forms:", difficulty: "medium", question_type: "MCQ", options: ["Water", "White ash", "Carbon dioxide", "Hydrogen gas"], correct_answer: "White ash"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S06"})
CREATE (:Question {questionid: "SCI-Q2-08", text: "Hormones are secreted by:", difficulty: "easy", question_type: "MCQ", options: ["Muscles", "Bones", "Endocrine glands", "Skin"], correct_answer: "Endocrine glands"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S07"})
CREATE (:Question {questionid: "SCI-Q2-09", text: "Sea breeze is caused by:", difficulty: "medium", question_type: "MCQ", options: ["Radiation", "Convection currents", "Conduction", "Reflection"], correct_answer: "Convection currents"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q2-20", text: "Name the three modes of heat transfer.", difficulty: "easy", question_type: "short_answer", correct_answer: "Conduction, convection and radiation."})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S08"})
CREATE (:Question {questionid: "SCI-Q2-10", text: "Which of the following shows uniform motion?", difficulty: "medium", question_type: "MCQ", options: ["A bus moving at constant speed", "A cyclist accelerating", "A falling stone", "A football kicked by a player"], correct_answer: "A bus moving at constant speed"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q2-11", text: "A sundial measures time using:", difficulty: "easy", question_type: "MCQ", options: ["Water flow", "Sound", "Shadow of the Sun", "Pendulum"], correct_answer: "Shadow of the Sun"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S09"})
CREATE (:Question {questionid: "SCI-Q2-12", text: "Which blood vessels carry blood away from the heart?", difficulty: "medium", question_type: "MCQ", options: ["Veins", "Capillaries", "Arteries", "Venules"], correct_answer: "Arteries"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q2-18", text: "What is the function of saliva in digestion?", difficulty: "medium", question_type: "short_answer", correct_answer: "Saliva moistens food and begins the digestion of starch."})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S10"})
CREATE (:Question {questionid: "SCI-Q2-13", text: "Water and minerals are transported by:", difficulty: "easy", question_type: "MCQ", options: ["Phloem", "Xylem", "Stomata", "Chlorophyll"], correct_answer: "Xylem"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q2-14", text: "Food prepared in leaves is transported by:", difficulty: "easy", question_type: "MCQ", options: ["Xylem", "Root hairs", "Phloem", "Stomata"], correct_answer: "Phloem"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S11"})
CREATE (:Question {questionid: "SCI-Q2-15", text: "The image formed by a plane mirror is:", difficulty: "medium", question_type: "MCQ", options: ["Real and inverted", "Virtual and erect", "Real and erect", "Magnified only"], correct_answer: "Virtual and erect"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "S12"})
CREATE (:Question {questionid: "SCI-Q2-16", text: "The Moon shines because:", difficulty: "easy", question_type: "MCQ", options: ["It produces its own light", "It reflects sunlight", "It is very hot", "It contains fire"], correct_answer: "It reflects sunlight"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q2-17", text: "Earth completes one revolution around the Sun in:", difficulty: "medium", question_type: "MCQ", options: ["24 hours", "30 days", "365.25 days", "12 hours"], correct_answer: "365.25 days"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "SCI-Q2-19", text: "Why do we observe different phases of the Moon?", difficulty: "medium", question_type: "short_answer", correct_answer: "As the Moon revolves around Earth, different portions of its illuminated half become visible to us."})-[:PART_OF]->(t);

// Link quiz to all its questions
MATCH (q:Quiz {quizid: "SCI-Q2"})
MATCH (question:Question)
WHERE question.questionid STARTS WITH "SCI-Q2-"
CREATE (q)-[:CONTAINS]->(question);

// Verify: MATCH (q:Quiz {quizid: "SCI-Q2"})-[:CONTAINS]->(question:Question) RETURN count(question);
