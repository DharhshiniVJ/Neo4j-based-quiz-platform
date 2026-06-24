import { useEffect, useState } from "react";
import { getClassQuizzes, getStudentAttempts } from "../../api";

export default function ClassQuizzes({ student, selectedClass, onTakeQuiz, onReviewAttempt, onBack }) {
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    getClassQuizzes(selectedClass.class_id).then(setQuizzes);
    getStudentAttempts(student.userid).then(setAttempts);
  }, [selectedClass, student]);

  const attemptedQuizIds = new Set(attempts.map((a) => a.quiz_id));

  const available = quizzes.filter((q) => !attemptedQuizIds.has(q.quizid));
  const completed = quizzes.filter((q) => attemptedQuizIds.has(q.quizid));

  const getAttemptForQuiz = (quizId) => attempts.find((a) => a.quiz_id === quizId);

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <button className="brutal-btn" onClick={onBack} style={{ marginBottom: "32px" }}>← Back to Classes</button>
      
      <div className="brutal-card" style={{ backgroundColor: "var(--pink)", marginBottom: "40px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "36px", textTransform: "uppercase" }}>{selectedClass.subject}</h1>
        <div className="brutal-badge" style={{ background: "var(--white)", fontSize: "14px" }}>Class {selectedClass.class_id}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "start" }}>
        <div>
          <h2 style={{ fontSize: "24px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
            Available Quizzes
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {available.length === 0 && (
              <div className="brutal-card" style={{ background: "#f3f4f6" }}>
                <p style={{ margin: 0, fontWeight: "600" }}>No new quizzes posted.</p>
              </div>
            )}
            {available.map((q) => (
              <div
                key={q.quizid}
                onClick={() => onTakeQuiz(q)}
                className="brutal-card brutal-card-hoverable"
                style={{ cursor: "pointer", backgroundColor: "var(--cyan)" }}
              >
                <h3 style={{ margin: "0 0 12px", fontSize: "20px" }}>{q.title}</h3>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="brutal-badge" style={{ background: "var(--white)" }}>{q.time_limit_minutes} Mins</div>
                  <span style={{ fontWeight: "700", fontSize: "14px", textTransform: "uppercase" }}>Take Quiz →</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: "24px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
            Completed
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {completed.length === 0 && (
              <div className="brutal-card" style={{ background: "#f3f4f6" }}>
                <p style={{ margin: 0, fontWeight: "600" }}>No completed quizzes yet.</p>
              </div>
            )}
            {completed.map((q) => {
              const attempt = getAttemptForQuiz(q.quizid);
              return (
                <div
                  key={q.quizid}
                  onClick={() => onReviewAttempt(attempt, q)}
                  className="brutal-card brutal-card-hoverable"
                  style={{ cursor: "pointer", backgroundColor: "var(--accent)" }}
                >
                  <h3 style={{ margin: "0 0 12px", fontSize: "20px" }}>{q.title}</h3>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="brutal-badge" style={{ background: "var(--white)" }}>
                      Score: {attempt.right_count}/{attempt.questions_attempted}
                    </div>
                    <span style={{ fontWeight: "700", fontSize: "14px", textTransform: "uppercase" }}>Review →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
