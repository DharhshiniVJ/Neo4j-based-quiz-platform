// ============================================
// 04d - MATH QUIZ SET 2 (MATH-Q2)
// 18 MCQ + 2 short answer, all 15 Math topics
// ============================================

MATCH (teacher:Teacher {userid: "T001"})
CREATE (quiz:Quiz {quizid: "MATH-Q2", title: "Class 7 Math Quiz - Set 2", time_limit_minutes: 20})
CREATE (teacher)-[:POSTED]->(quiz);

MATCH (t:Topic {topicid: "M01"})
CREATE (:Question {questionid: "MATH-Q2-01", text: "Which of the following numbers is the greatest?", difficulty: "medium", question_type: "MCQ", options: ["4,99,99,999", "5,00,00,001", "4,99,99,909", "5,00,00,000"], correct_answer: "5,00,00,001"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M02"})
CREATE (:Question {questionid: "MATH-Q2-02", text: "Find the value of: 36 / 6 x 4 + 8", difficulty: "medium", question_type: "MCQ", options: ["20", "24", "32", "40"], correct_answer: "32"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M03"})
CREATE (:Question {questionid: "MATH-Q2-03", text: "Which decimal is equal to 7 tenths?", difficulty: "easy", question_type: "MCQ", options: ["0.07", "0.7", "7.0", "0.007"], correct_answer: "0.7"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M04"})
CREATE (:Question {questionid: "MATH-Q2-04", text: "If p = 6, find the value of 4p - 3.", difficulty: "easy", question_type: "MCQ", options: ["18", "21", "24", "27"], correct_answer: "21"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M05"})
CREATE (:Question {questionid: "MATH-Q2-05", text: "Two lines that intersect and form four right angles are called:", difficulty: "easy", question_type: "MCQ", options: ["Parallel lines", "Transversal lines", "Perpendicular lines", "Curved lines"], correct_answer: "Perpendicular lines"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M06"})
CREATE (:Question {questionid: "MATH-Q2-06", text: "Which number is divisible by both 2 and 5?", difficulty: "easy", question_type: "MCQ", options: ["145", "250", "363", "427"], correct_answer: "250"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "MATH-Q2-07", text: "Which of the following is a composite number?", difficulty: "medium", question_type: "MCQ", options: ["19", "31", "27", "17"], correct_answer: "27"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M07"})
CREATE (:Question {questionid: "MATH-Q2-08", text: "If one angle of a triangle is 90 degrees and another angle is 35 degrees, the third angle is:", difficulty: "medium", question_type: "MCQ", options: ["45 degrees", "55 degrees", "65 degrees", "75 degrees"], correct_answer: "55 degrees"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M08"})
CREATE (:Question {questionid: "MATH-Q2-09", text: "2/3 x 3/4 = ?", difficulty: "medium", question_type: "MCQ", options: ["1/2", "3/4", "2/3", "5/6"], correct_answer: "1/2"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "MATH-Q2-10", text: "Which fraction is equivalent to 3/5?", difficulty: "medium", question_type: "MCQ", options: ["6/15", "9/15", "12/25", "15/35"], correct_answer: "9/15"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M09"})
CREATE (:Question {questionid: "MATH-Q2-11", text: "If two triangles are congruent, then their corresponding sides are:", difficulty: "easy", question_type: "MCQ", options: ["Parallel", "Unequal", "Equal", "Perpendicular"], correct_answer: "Equal"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M10"})
CREATE (:Question {questionid: "MATH-Q2-12", text: "(-12) + (-7) = ?", difficulty: "easy", question_type: "MCQ", options: ["-19", "19", "-5", "5"], correct_answer: "-19"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "MATH-Q2-13", text: "15 - 23 = ?", difficulty: "medium", question_type: "MCQ", options: ["8", "-8", "38", "-38"], correct_answer: "-8"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M11"})
CREATE (:Question {questionid: "MATH-Q2-14", text: "The HCF of 15 and 20 is:", difficulty: "medium", question_type: "MCQ", options: ["2", "3", "5", "10"], correct_answer: "5"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "MATH-Q2-20", text: "Find the LCM of 9 and 12.", difficulty: "medium", question_type: "short_answer", correct_answer: "36"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M12"})
CREATE (:Question {questionid: "MATH-Q2-15", text: "Which fraction is equal to 0.4?", difficulty: "easy", question_type: "MCQ", options: ["1/5", "2/5", "4/5", "3/5"], correct_answer: "2/5"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M13"})
CREATE (:Question {questionid: "MATH-Q2-16", text: "The average of 10, 12, 18 and 20 is:", difficulty: "medium", question_type: "MCQ", options: ["14", "15", "16", "18"], correct_answer: "15"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M14"})
CREATE (:Question {questionid: "MATH-Q2-17", text: "Which instrument is used to draw arcs during geometric constructions?", difficulty: "easy", question_type: "MCQ", options: ["Scale", "Compass", "Protractor", "Divider"], correct_answer: "Compass"})-[:PART_OF]->(t);

MATCH (t:Topic {topicid: "M15"})
CREATE (:Question {questionid: "MATH-Q2-18", text: "Solve: x - 9 = 14", difficulty: "easy", question_type: "MCQ", options: ["5", "14", "23", "9"], correct_answer: "23"})-[:PART_OF]->(t)
CREATE (:Question {questionid: "MATH-Q2-19", text: "Solve: 5y = 45", difficulty: "easy", question_type: "short_answer", correct_answer: "9"})-[:PART_OF]->(t);

// Link quiz to all its questions
MATCH (q:Quiz {quizid: "MATH-Q2"})
MATCH (question:Question)
WHERE question.questionid STARTS WITH "MATH-Q2-"
CREATE (q)-[:CONTAINS]->(question);

// Verify: MATCH (q:Quiz {quizid: "MATH-Q2"})-[:CONTAINS]->(question:Question) RETURN count(question);
