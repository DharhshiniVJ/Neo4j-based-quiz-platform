import { useState } from "react";
import MyClasses from "./MyClasses";
import ClassQuizzes from "./ClassQuizzes";
import TakeQuiz from "./TakeQuiz";
import AttemptDetail from "../AttemptDetail";

export default function StudentDashboard({ student, onLogout }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [reviewAttempt, setReviewAttempt] = useState(null);
  const [mode, setMode] = useState("classes"); // classes | quizzes | take | review

  const goToClasses = () => {
    setSelectedClass(null);
    setSelectedQuiz(null);
    setReviewAttempt(null);
    setMode("classes");
  };

  const handleSelectClass = (c) => {
    setSelectedClass(c);
    setMode("quizzes");
  };

  const handleTakeQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setMode("take");
  };

  const handleReviewAttempt = (attempt) => {
    setReviewAttempt(attempt);
    setMode("review");
  };

  const handleQuizDone = () => {
    // After submitting, go back to class quizzes so they can see it under Completed
    setSelectedQuiz(null);
    setMode("quizzes");
  };

  if (mode === "review") {
    return (
      <AttemptDetail
        student={student}
        attempt={reviewAttempt}
        onBack={() => setMode("quizzes")}
        onLogout={onLogout}
      />
    );
  }

  if (mode === "take") {
    return (
      <TakeQuiz
        student={student}
        quiz={selectedQuiz}
        onDone={handleQuizDone}
        onBack={() => setMode("quizzes")}
      />
    );
  }

  if (mode === "quizzes") {
    return (
      <ClassQuizzes
        student={student}
        selectedClass={selectedClass}
        onTakeQuiz={handleTakeQuiz}
        onReviewAttempt={handleReviewAttempt}
        onBack={goToClasses}
      />
    );
  }

  return (
    <MyClasses
      student={student}
      onSelectClass={handleSelectClass}
      onLogout={onLogout}
    />
  );
}
