import { useEffect, useState } from "react";
import { getStudentAttempts, getClassStudentTopicScores, getClassStudentBehavioralStats } from "../api";

export default function AttemptList({ student, selectedClass, onSelectAttempt, onBack, onLogout }) {
  const [attempts, setAttempts] = useState([]);
  const [topicStats, setTopicStats] = useState([]);
  const [behavioralStats, setBehavioralStats] = useState(null);

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
      getClassStudentBehavioralStats(selectedClass.class_id, student.userid).then(setBehavioralStats);
    }
  }, [student, selectedClass]);

  const getRankedTopics = (behaviorType) => {
    if (!behavioralStats || !behavioralStats.behavioral) return [];
    const filtered = behavioralStats.behavioral.filter(q => q.behavior === behaviorType);
    const counts = {};
    filtered.forEach(q => {
      counts[q.topic] = (counts[q.topic] || 0) + 1;
    });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  };

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

            {selectedClass && behavioralStats && behavioralStats.behavioral && (
        <>
          <h2 style={{ fontSize: "28px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
            Overall Behavioral Performance ({selectedClass.subject})
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "48px" }}>
            <div 
              className="brutal-card"
              style={{ display: "flex", justifyContent: "space-between", padding: "16px", borderLeft: "8px solid #ef4444" }}>
              <div>
                <div style={{ fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Struggling</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px", lineHeight: "1.4" }}>
                  Topics under struggling suggest the student is spending a lot of time but still arriving at the wrong answer.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {getRankedTopics('struggling').map(t => <span key={t} className="brutal-badge" style={{ fontSize: "12px" }}>{t}</span>)}
                </div>
              </div>
              <span className="brutal-badge" style={{ background: "var(--white)", height: "fit-content" }}>
                {behavioralStats.behavioral.filter((q) => q.behavior === "struggling").length}
              </span>
            </div>
            
            <div 
              className="brutal-card"
              style={{ display: "flex", justifyContent: "space-between", padding: "16px", borderLeft: "8px solid var(--accent)" }}>
              <div>
                <div style={{ fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Reckless</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px", lineHeight: "1.4" }}>
                  Topics under reckless suggest the student is rushing through questions and answering incorrectly.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {getRankedTopics('reckless').map(t => <span key={t} className="brutal-badge" style={{ fontSize: "12px" }}>{t}</span>)}
                </div>
              </div>
              <span className="brutal-badge" style={{ background: "var(--white)", height: "fit-content" }}>
                {behavioralStats.behavioral.filter((q) => q.behavior === "reckless").length}
              </span>
            </div>

            <div 
              className="brutal-card"
              style={{ display: "flex", justifyContent: "space-between", padding: "16px", borderLeft: "8px solid #3b82f6" }}>
              <div>
                <div style={{ fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Methodical</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px", lineHeight: "1.4" }}>
                  Topics under methodical suggest that in these topics the student takes a little bit of time but arrives at the correct answer.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {getRankedTopics('methodical').map(t => <span key={t} className="brutal-badge" style={{ fontSize: "12px" }}>{t}</span>)}
                </div>
              </div>
              <span className="brutal-badge" style={{ background: "var(--white)", height: "fit-content" }}>
                {behavioralStats.behavioral.filter((q) => q.behavior === "methodical").length}
              </span>
            </div>

            <div 
              className="brutal-card"
              style={{ display: "flex", justifyContent: "space-between", padding: "16px", borderLeft: "8px solid #22c55e" }}>
              <div>
                <div style={{ fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Optimal</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px", lineHeight: "1.4" }}>
                  Topics under optimal suggest the student is efficiently and quickly arriving at the correct answers.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {getRankedTopics('optimal').map(t => <span key={t} className="brutal-badge" style={{ fontSize: "12px" }}>{t}</span>)}
                </div>
              </div>
              <span className="brutal-badge" style={{ background: "var(--white)", height: "fit-content" }}>
                {behavioralStats.behavioral.filter((q) => q.behavior === "optimal").length}
              </span>
            </div>
          </div>
        </>
      )}

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
            <h3 style={{ margin: "0 0 16px", fontSize: "20px", textTransform: "uppercase" }}>{a.quiz_title || a.attemptid}</h3>
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
