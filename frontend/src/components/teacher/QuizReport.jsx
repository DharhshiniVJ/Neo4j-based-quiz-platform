import { useEffect, useState } from "react";
import { getQuizReport, getClassQuizStats } from "../../api";

export default function QuizReport({ selectedClass, selectedQuiz, onSelectAttempt, onBack }) {
  const [report, setReport] = useState(null);
  const [stats, setStats] = useState(null);
  const [viewStats, setViewStats] = useState(false);

  useEffect(() => {
    getQuizReport(selectedClass.class_id, selectedQuiz.quizid).then(setReport);
    getClassQuizStats(selectedClass.class_id, selectedQuiz.quizid).then(setStats);
  }, [selectedClass, selectedQuiz]);

  if (!report) {
    return (
      <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
        <button className="brutal-btn brutal-btn-white" onClick={onBack} style={{ marginBottom: "32px" }}>← Back to Class</button>
        <div className="brutal-card">
          <p style={{ margin: 0, fontWeight: "600", fontSize: "18px" }}>Loading report...</p>
        </div>
      </div>
    );
  }

  const { attempted, not_attempted } = report;
  const total = attempted.length + not_attempted.length;

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <button className="brutal-btn brutal-btn-white" onClick={onBack} style={{ marginBottom: "32px" }}>← Back to Class</button>
      
      <div className="brutal-card" style={{ marginBottom: "40px", borderTop: "8px solid var(--primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: "0 0 16px", fontSize: "36px", textTransform: "uppercase" }}>{selectedQuiz.title}</h1>
          <div className="brutal-badge" style={{ fontSize: "16px", padding: "8px 16px" }}>
            {attempted.length} of {total} students attempted
          </div>
        </div>
        <button className="brutal-btn" onClick={() => setViewStats(!viewStats)}>
          <i className="fa-solid fa-chart-pie" style={{ marginRight: "8px" }}></i>
          {viewStats ? "View Student List" : "View Overall Class Performance"}
        </button>
      </div>

      {viewStats ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <h2 style={{ fontSize: "28px", textTransform: "uppercase", marginBottom: "8px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
            Class Performance Stats
          </h2>
          {!stats ? (
            <div className="brutal-card" style={{ background: "#f1f5f9" }}><p>No stats available or loading...</p></div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
                <div className="brutal-card" style={{ borderLeft: "8px solid var(--primary)" }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: "16px", color: "#475569", textTransform: "uppercase" }}>Class Average</h3>
                  <div style={{ fontSize: "40px", fontWeight: "800" }}>{stats.avg_score}</div>
                </div>
                <div className="brutal-card" style={{ borderLeft: "8px solid var(--secondary)" }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: "16px", color: "#475569", textTransform: "uppercase" }}>Highest Score</h3>
                  <div style={{ fontSize: "40px", fontWeight: "800" }}>{stats.highest_score}</div>
                </div>
                <div className="brutal-card" style={{ borderLeft: "8px solid var(--accent)" }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: "16px", color: "#475569", textTransform: "uppercase" }}>Lowest Score</h3>
                  <div style={{ fontSize: "40px", fontWeight: "800" }}>{stats.lowest_score}</div>
                </div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "16px" }}>
                <div className="brutal-card">
                  <h3 style={{ margin: "0 0 16px", fontSize: "20px", textTransform: "uppercase" }}>Topic Performance</h3>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "12px", borderBottom: "2px solid var(--border)" }}>
                    <strong>Best Topic:</strong> <span>{stats.best_topic || "N/A"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>Weakest Topic:</strong> <span>{stats.worst_topic || "N/A"}</span>
                  </div>
                </div>
                
                <div className="brutal-card">
                  <h3 style={{ margin: "0 0 16px", fontSize: "20px", textTransform: "uppercase" }}>Behavioral Focus Areas</h3>
                  {[
                    { label: "Struggling", description: "Students take a long time but still get the answer wrong.", key: "struggling_topics", accent: "var(--primary)" },
                    { label: "Reckless", description: "Students answer very quickly but often get it wrong.", key: "reckless_topics", accent: "var(--accent)" },
                    { label: "Methodical", description: "Students take their time and carefully arrive at the correct answer.", key: "methodical_topics", accent: "var(--secondary)" },
                    { label: "Optimal", description: "Students quickly and accurately arrive at the correct answer.", key: "optimal_topics", accent: "var(--secondary)" },
                  ].map(({ label, description, key, accent }, i, arr) => (
                    <div key={key} style={{ marginBottom: i < arr.length - 1 ? "12px" : 0, paddingBottom: i < arr.length - 1 ? "12px" : 0, borderBottom: i < arr.length - 1 ? "2px solid var(--border)" : "none" }}>
                      <strong style={{ display: "block", marginBottom: "4px", color: accent, fontSize: "18px" }}>{label}</strong>
                      <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#64748b" }}>{description}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {stats[key] && stats[key].length > 0
                          ? stats[key].map(topic => (
                              <span key={topic} className="brutal-badge" style={{ fontSize: "12px" }}>{topic}</span>
                            ))
                          : <span style={{ color: "#94a3b8", fontWeight: "600" }}>None</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "300px" }}>
            <h2 style={{ fontSize: "24px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
              Attempted ({attempted.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {attempted.length === 0 && (
                <div className="brutal-card" style={{ background: "#f1f5f9" }}>
                  <p style={{ margin: 0, fontWeight: "600" }}>No attempts yet.</p>
                </div>
              )}
              {attempted.map((item) => (
                <div
                  key={item.student.userid}
                  onClick={() => onSelectAttempt(item.student, item.attempt)}
                  className="brutal-card brutal-card-hoverable"
                  style={{ cursor: "pointer", borderLeft: "8px solid var(--secondary)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong style={{ fontSize: "20px" }}>{item.student.name}</strong>
                    <div className="brutal-badge">
                      {item.attempt.right_count}/{item.attempt.questions_attempted} correct
                    </div>
                  </div>
                  <p style={{ margin: 0, fontWeight: "600", color: "#475569" }}>{item.student.email}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: "300px" }}>
            <h2 style={{ fontSize: "24px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
              Not Attempted ({not_attempted.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {not_attempted.length === 0 && (
                <div className="brutal-card" style={{ background: "#f1f5f9" }}>
                  <p style={{ margin: 0, fontWeight: "600" }}>Everyone has attempted!</p>
                </div>
              )}
              {not_attempted.map((student) => (
                <div key={student.userid} className="brutal-card" style={{ borderLeft: "8px solid var(--border)" }}>
                  <strong style={{ fontSize: "20px", display: "block", marginBottom: "8px" }}>{student.name}</strong>
                  <p style={{ margin: 0, fontWeight: "600", color: "#475569" }}>{student.email}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
