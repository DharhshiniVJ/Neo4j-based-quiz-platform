import { useState } from "react";
import TeacherClasses from "./TeacherClasses";
import ClassDetail from "./ClassDetail";
import CreateQuiz from "./CreateQuiz";
import QuizReport from "./QuizReport";
import AttemptList from "../AttemptList";
import AttemptDetail from "../AttemptDetail";

export default function TeacherDashboard({ teacher, onLogout }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [mode, setMode] = useState("classes"); // classes | classDetail | createQuiz | studentAttempts | attemptReview | quizReport

  const goToClasses = () => {
    setSelectedClass(null);
    setSelectedStudent(null);
    setSelectedAttempt(null);
    setSelectedQuiz(null);
    setMode("classes");
  };

  const handleSelectClass = (c) => {
    setSelectedClass(c);
    setMode("classDetail");
  };

  const handleCreateQuiz = () => {
    setMode("createQuiz");
  };

  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    setMode("studentAttempts");
  };

  const handleSelectAttempt = (a) => {
    setSelectedAttempt(a);
    setMode("attemptReview");
  };

  const handleSelectQuizReport = (q) => {
    setSelectedQuiz(q);
    setMode("quizReport");
  };

  if (mode === "attemptReview") {
    return (
      <AttemptDetail
        student={selectedStudent}
        attempt={selectedAttempt}
        onBack={() => {
          setSelectedAttempt(null);
          // If we came from the quiz report (selectedQuiz is set), go back there.
          // Otherwise go back to student attempts.
          if (selectedQuiz) {
            setMode("quizReport");
          } else {
            setMode("studentAttempts");
          }
        }}
        onLogout={onLogout}
      />
    );
  }

  if (mode === "quizReport") {
    return (
      <QuizReport
        selectedClass={selectedClass}
        selectedQuiz={selectedQuiz}
        onSelectAttempt={(student, attempt) => {
          setSelectedStudent(student);
          setSelectedAttempt(attempt);
          setMode("attemptReview");
        }}
        onBack={() => {
          setSelectedQuiz(null);
          setMode("classDetail");
        }}
      />
    );
  }

  if (mode === "studentAttempts") {
    return (
      <AttemptList
        student={selectedStudent}
        selectedClass={selectedClass}
        onSelectAttempt={handleSelectAttempt}
        onBack={() => {
          setSelectedStudent(null);
          setMode("classDetail");
        }}
        onLogout={onLogout}
      />
    );
  }

  if (mode === "createQuiz") {
    return (
      <CreateQuiz
        teacher={teacher}
        selectedClass={selectedClass}
        onBack={() => setMode("classDetail")}
      />
    );
  }

  if (mode === "classDetail") {
    return (
      <ClassDetail
        teacher={teacher}
        selectedClass={selectedClass}
        onSelectStudent={handleSelectStudent}
        onCreateQuiz={handleCreateQuiz}
        onSelectQuizReport={handleSelectQuizReport}
        onBack={goToClasses}
      />
    );
  }

  return (
    <TeacherClasses
      teacher={teacher}
      onSelectClass={handleSelectClass}
      onLogout={onLogout}
    />
  );
}
