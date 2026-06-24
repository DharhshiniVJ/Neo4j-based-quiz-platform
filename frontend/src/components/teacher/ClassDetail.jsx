import { useEffect, useState } from "react";
import { getTeacherStudents, getClassQuizzes } from "../../api";

export default function ClassDetail({ teacher, selectedClass, onSelectStudent, onCreateQuiz, onSelectQuizReport, onBack }) {
  const [students, setStudents] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    getTeacherStudents(teacher.userid).then((allStudents) => {
      setStudents(allStudents.filter((s) => s.class_id === selectedClass.class_id));
    });
    getClassQuizzes(selectedClass.class_id).then(setQuizzes);
  }, [teacher, selectedClass]);

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <button className="brutal-btn" onClick={onBack} style={{ marginBottom: "32px" }}>← Back to Classes</button>
      
      <div className="brutal-card" style={{ borderTop: "8px solid var(--primary)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: "32px", textTransform: "uppercase" }}>{selectedClass.subject}</h1>
          <div className="brutal-badge">Class {selectedClass.class_id}</div>
        </div>
        <button className="brutal-btn" onClick={onCreateQuiz} style={{ fontSize: "18px" }}>
          + Create New Quiz
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "start" }}>
        <div>
          <h2 style={{ fontSize: "24px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
            Students ({students.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {students.length === 0 && (
              <div className="brutal-card" style={{ background: "#f1f5f9" }}>
                <p style={{ margin: 0, fontWeight: "600" }}>No students in this class.</p>
              </div>
            )}
            {students.map((s) => (
              <div
                key={s.userid}
                onClick={() => onSelectStudent(s)}
                className="brutal-card brutal-card-hoverable"
                style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: "8px solid var(--secondary)" }}
              >
                <strong style={{ fontSize: "18px" }}>{s.name}</strong>
                <span className="brutal-badge" style={{ background: "var(--white)" }}>{s.email}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: "24px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
            Posted Quizzes ({quizzes.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {quizzes.length === 0 && (
              <div className="brutal-card" style={{ background: "#f1f5f9" }}>
                <p style={{ margin: 0, fontWeight: "600" }}>No quizzes posted yet.</p>
              </div>
            )}
            {quizzes.map((q) => (
              <div
                key={q.quizid}
                onClick={() => onSelectQuizReport(q)}
                className="brutal-card brutal-card-hoverable"
                style={{ cursor: "pointer", borderLeft: "8px solid var(--accent)" }}
              >
                <h3 style={{ margin: "0 0 8px", fontSize: "20px" }}>{q.title}</h3>
                <div className="brutal-badge" style={{ background: "var(--white)" }}>{q.time_limit_minutes} Mins</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
