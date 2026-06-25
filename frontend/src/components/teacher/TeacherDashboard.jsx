import { useState, useEffect } from "react";
import TeacherClasses from "./TeacherClasses";
import ClassDetail from "./ClassDetail";
import ClassPerformance from "./ClassPerformance";
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
  const [draftQuizPayload, setDraftQuizPayload] = useState(null);
  const [isRequestingClass, setIsRequestingClass] = useState(false);
  const [pendingQuizPrompt, setPendingQuizPrompt] = useState('');

  useEffect(() => {
    const handleSpawnQuiz = (e) => {
      const payload = e.detail;
      setDraftQuizPayload(payload);
      setIsRequestingClass(false);
      // selectedClass is already set (teacher clicked a class before AI started generating),
      // so the useEffect below will immediately open the Quiz Creator.
    };
    
    const handleRequestClass = (e) => {
      const originalPrompt = e.detail?.original_prompt || '';
      setIsRequestingClass(true);
      setPendingQuizPrompt(originalPrompt);
      setMode("classes");
    };

    window.addEventListener("SPAWN_QUIZ", handleSpawnQuiz);
    window.addEventListener("REQUEST_CLASS_SELECTION", handleRequestClass);
    return () => {
      window.removeEventListener("SPAWN_QUIZ", handleSpawnQuiz);
      window.removeEventListener("REQUEST_CLASS_SELECTION", handleRequestClass);
    };
  }, []);

  // Effect to automatically open CreateQuiz if we receive a payload and have a class selected.
  useEffect(() => {
    if (draftQuizPayload && selectedClass) {
      setMode("createQuiz");
    }
  }, [draftQuizPayload, selectedClass]);

  const goToClasses = () => {
    setSelectedClass(null);
    setSelectedStudent(null);
    setSelectedAttempt(null);
    setSelectedQuiz(null);
    setMode("classes");
  };

  const handleSelectClass = (c) => {
    setSelectedClass(c);
    if (isRequestingClass) {
      const resumeMsg = pendingQuizPrompt
        ? `I have selected class ${c.class_id} (Subject: ${c.subject}). My original request was: "${pendingQuizPrompt}". Please now execute that request fully without asking any further questions.`
        : `I have selected class ${c.class_id} (Subject: ${c.subject}). Please generate the quiz now.`;
      window.dispatchEvent(new CustomEvent('SEND_CHAT_MESSAGE', { detail: resumeMsg }));
      setIsRequestingClass(false);
      setPendingQuizPrompt('');
      setMode("classDetail");
    } else if (draftQuizPayload) {
      setMode("createQuiz");
    } else {
      setMode("classDetail");
    }
  };

  const handleViewPerformance = () => {
    setMode("classPerformance");
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
        draftQuiz={draftQuizPayload}
        onBack={() => {
          setDraftQuizPayload(null);
          setMode("classDetail");
        }}
      />
    );
  }

  
  if (mode === "classPerformance") {
    return (
      <ClassPerformance
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
        onViewPerformance={handleViewPerformance}
        onBack={goToClasses}
      />
    );
  }

  return (
    <TeacherClasses
      teacher={teacher}
      onSelectClass={handleSelectClass}
      onLogout={onLogout}
      isAssigningQuiz={isRequestingClass}
    />
  );
}
