import { useEffect, useState } from "react";
import { getStudentAttempts, getClassStudentTopicScores } from "../api";

export default function AttemptList({ student, selectedClass, onSelectAttempt, onBack, onLogout }) {
  const [attempts, setAttempts] = useState([]);
  const [topicStats, setTopicStats] = useState([]);

  useEffect(() => {
    getStudentAttempts(student.userid).then((allAttempts) => {
      if (selectedClass) {
        setAttempts(allAttempts.filter(a => a.class_id === selectedClass.class_id));
      } else {
        setAttempts(allAttempts);
      }
    });
    if (selectedClass) {
      getClassStudentTopicScores(selectedClass.class_id, student.userid).then(setTopicStats);
    }
  }, [student, selectedClass]);

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <button className="brutal-btn brutal-btn-white" onClick={onBack} style={{ marginBottom: "32px" }}>← Back</button>

      <div className="brutal-card" style={{ borderTop: "8px solid var(--primary)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: "32px", textTransform: "uppercase" }}>{student.name}'s Dashboard</h1>
          <div className="brutal-badge">{student.email}</div>
        </div>
        {onLogout && (
          <button className="brutal-btn brutal-btn-white" onClick={onLogout}>Log out</button>
        )}
      </div>

      <h2 style={{ fontSize: "28px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
        Overall Topic Performance
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "24px", marginBottom: "48px" }}>
        {topicStats.length === 0 ? (
          <div className="brutal-card" style={{ gridColumn: "1 / -1", background: "#f1f5f9" }}>
            <p style={{ margin: 0, fontWeight: "600" }}>No topic data available.</p>
          </div>
        ) : (
          topicStats.map(t => (
            <div key={t.topic} className="brutal-card" style={{ borderLeft: t.score_pct >= 70 ? "8px solid var(--secondary)" : t.score_pct >= 40 ? "8px solid var(--accent)" : "8px solid #ef4444" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "16px", textTransform: "uppercase" }}>{t.topic}</h3>
              <div style={{ fontSize: "32px", fontWeight: "800" }}>{t.score_pct}%</div>
              <div style={{ fontSize: "14px", color: "#475569", fontWeight: "600" }}>{t.correct}/{t.total} Correct</div>
            </div>
          ))
        )}
      </div>

      <h2 style={{ fontSize: "28px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
        Specific Attempts
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
        {attempts.length === 0 && (
          <div className="brutal-card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", background: "#f1f5f9" }}>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>No attempts found for this student.</p>
          </div>
        )}
        {attempts.map((a) => (
          <div
            key={a.attemptid}
            onClick={() => onSelectAttempt(a)}
            className="brutal-card brutal-card-hoverable"
            style={{ cursor: "pointer", borderLeft: "8px solid var(--primary)" }}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: "20px", textTransform: "uppercase" }}>{a.quiz_title}</h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="brutal-badge">
                {a.right_count}/{a.questions_attempted} Correct
              </div>
              <span style={{ fontWeight: "700", fontSize: "14px", color: "#475569" }}>
                {new Date(a.timestamp).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
