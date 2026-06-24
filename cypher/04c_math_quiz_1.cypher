// ============================================
// 04c - MATH QUIZ SET 1 (MATH-Q1)
// 18 MCQ + 2 short answer, all 15 Math topics
// ============================================

MATCH (teacher:Teacher {userid: "T001"})
CREATE (quiz:Quiz {quizid: "MATH-Q1", title: "Class 7 Math Quiz - Set 1", time_limit_minutes: 20})
CREATE (teacher)-[:POSTED]->(quiz);

MATCH (t:Topic {topicid: "M01"})
CREATE (:Question {questionid: "MATH-Q1-01", text: "The number 5,08,07,912 is read as:", difficulty: "easy", question_type: "MCQ", options: ["Five crore eight lakh seven thousand nine hundred twelve", "Fifty crore eight lakh seven thousand nine hundred twelve", "Five crore eighty lakh seven thousand nine hundred twelve", "Five crore eight thousand seven hundred twelve"], correct_answer: "Five crore eight lakh seven thousand nine hundred twelve"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M02"})
CREATE (:Question {questionid: "MATH-Q1-02", text: "Find the value of: 18 + 24 / 6 x 5", difficulty: "medium", question_type: "MCQ", options: ["35", "38", "42", "50"], correct_answer: "38"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M03"})
CREATE (:Question {questionid: "MATH-Q1-03", text: "Which is the smallest decimal?", difficulty: "easy", question_type: "MCQ", options: ["0.02", "0.2", "0.002", "0.22"], correct_answer: "0.002"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M04"})
CREATE (:Question {questionid: "MATH-Q1-04", text: "If a = 8, find the value of 2a + 5.", difficulty: "easy", question_type: "MCQ", options: ["13", "16", "21", "18"], correct_answer: "21"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M05"})
CREATE (:Question {questionid: "MATH-Q1-05", text: "Two lines that never meet are called:", difficulty: "easy", question_type: "MCQ", options: ["Intersecting lines", "Parallel lines", "Perpendicular lines", "Transversal lines"], correct_answer: "Parallel lines"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M06"})
CREATE (:Question {questionid: "MATH-Q1-06", text: "Which of the following numbers is divisible by 9?", difficulty: "medium", question_type: "MCQ", options: ["356", "729", "517", "823"], correct_answer: "729"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "MATH-Q1-07", text: "Which of the following is a prime number?", difficulty: "medium", question_type: "MCQ", options: ["21", "39", "29", "51"], correct_answer: "29"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M07"})
CREATE (:Question {questionid: "MATH-Q1-08", text: "The sum of the angles of a triangle is:", difficulty: "easy", question_type: "MCQ", options: ["90 degrees", "180 degrees", "270 degrees", "360 degrees"], correct_answer: "180 degrees"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "MATH-Q1-09", text: "If two angles of a triangle are 45 degrees and 65 degrees, the third angle is:", difficulty: "medium", question_type: "MCQ", options: ["80 degrees", "70 degrees", "90 degrees", "60 degrees"], correct_answer: "70 degrees"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M08"})
CREATE (:Question {questionid: "MATH-Q1-10", text: "3/4 + 1/8 = ?", difficulty: "medium", question_type: "MCQ", options: ["5/8", "7/8", "9/8", "3/4"], correct_answer: "7/8"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M09"})
CREATE (:Question {questionid: "MATH-Q1-11", text: "Two figures are congruent if they have:", difficulty: "easy", question_type: "MCQ", options: ["Equal areas only", "Same shape only", "Same shape and same size", "Equal perimeters"], correct_answer: "Same shape and same size"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M10"})
CREATE (:Question {questionid: "MATH-Q1-12", text: "(-9) + 14 = ?", difficulty: "easy", question_type: "MCQ", options: ["-5", "5", "-23", "23"], correct_answer: "5"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "MATH-Q1-13", text: "(-8) x (-5) = ?", difficulty: "medium", question_type: "MCQ", options: ["-40", "13", "40", "-13"], correct_answer: "40"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M11"})
CREATE (:Question {questionid: "MATH-Q1-14", text: "The HCF of 24 and 36 is:", difficulty: "medium", question_type: "MCQ", options: ["4", "6", "12", "18"], correct_answer: "12"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "MATH-Q1-15", text: "The LCM of 6 and 8 is:", difficulty: "medium", question_type: "MCQ", options: ["12", "18", "24", "48"], correct_answer: "24"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M12"})
CREATE (:Question {questionid: "MATH-Q1-16", text: "0.625 in fraction form is:", difficulty: "medium", question_type: "MCQ", options: ["5/8", "3/5", "6/25", "7/8"], correct_answer: "5/8"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M13"})
CREATE (:Question {questionid: "MATH-Q1-17", text: "Which graph is most suitable for comparing the number of students in different classes?", difficulty: "easy", question_type: "MCQ", options: ["Pie chart", "Bar graph", "Line segment", "Number line"], correct_answer: "Bar graph"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "MATH-Q1-20", text: "The heights (in cm) of five plants are: 18, 22, 20, 24, 16. Find the average height.", difficulty: "medium", question_type: "short_answer", correct_answer: "20"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M14"})
CREATE (:Question {questionid: "MATH-Q1-18", text: "Which instrument is used to measure an angle?", difficulty: "easy", question_type: "MCQ", options: ["Divider", "Compass", "Protractor", "Scale"], correct_answer: "Protractor"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M15"})
CREATE (:Question {questionid: "MATH-Q1-19", text: "Solve: 3x + 7 = 22", difficulty: "medium", question_type: "short_answer", correct_answer: "5"})-[:PART_OF]->(t);

// Link quiz to all its questions
MATCH (q:Quiz {quizid: "MATH-Q1"})
MATCH (question:Question)
WHERE question.questionid STARTS WITH "MATH-Q1-"
CREATE (q)-[:CONTAINS]->(question);

// Verify: MATCH (q:Quiz {quizid: "MATH-Q1"})-[:CONTAINS]->(question:Question) RETURN count(question);
