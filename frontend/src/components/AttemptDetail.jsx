import { useEffect, useState, useRef } from "react";
import { getTopicScores, getBehavioral } from "../api";
import BehaviorQuadrantChart from "./BehaviorQuadrantChart";

const BEHAVIOR_LABELS = {
  optimal: "Optimal",
  methodical: "Methodical",
  reckless: "Reckless",
  struggling: "Struggling",
  skipped: "Skipped",
};

export default function AttemptDetail({ student, attempt, onBack, onLogout }) {
  const [topics, setTopics] = useState([]);
  const [behavioral, setBehavioral] = useState(null);
  
  const [filter, setFilter] = useState(null);
  const reviewRef = useRef(null);

  useEffect(() => {
    getTopicScores(student.userid, attempt.attemptid).then(setTopics);
    getBehavioral(student.userid, attempt.attemptid).then((data) => {
      // Map old labels to new if hot-reloading kept old states from cache
      const mapped = data.map(q => {
        let b = q.behavior;
        if (b === 'accurate') b = 'optimal';
        if (b === 'careful') b = 'methodical';
        if (b === 'overconfident') b = 'reckless';
        return { ...q, behavior: b };
      });
      setBehavioral(mapped);
    });
  }, [student, attempt]);

  useEffect(() => {
    if (filter && reviewRef.current) {
      reviewRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filter]);

  const filteredQuestions = behavioral ? behavioral.filter(q => {
    if (!filter) return false;
    if (filter.type === 'all') return true;
    if (filter.type === 'topic') return q.topic === filter.value;
    if (filter.type === 'behavior') return q.behavior === filter.value || (filter.value === 'skipped' && q.status === 'skipped');
    return true;
  }) : [];

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <button className="brutal-btn brutal-btn-white" onClick={onBack} style={{ marginBottom: "32px" }}>&larr; Back</button>

      <div className="brutal-card" style={{ borderTop: "8px solid var(--secondary)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: "32px", textTransform: "uppercase" }}>Quiz Review</h1>
          <div className="brutal-badge">
            {student.name} &middot; {attempt.quiz_title || attempt.attemptid}
          </div>
        </div>
        {onLogout && (
          <button className="brutal-btn brutal-btn-white" onClick={onLogout}>Log out</button>
        )}
      </div>

      <div style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "24px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
          Topic Performance
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {topics.length === 0 && (
            <div className="brutal-card" style={{ background: "#f1f5f9" }}>
              <p style={{ margin: 0, fontWeight: "600" }}>Loading topics...</p>
            </div>
          )}
          {topics.map((t, i) => (
            <div 
              key={i} 
              onClick={() => setFilter({ type: 'topic', value: t.topic })}
              className="brutal-card brutal-card-hoverable" 
              style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: "8px solid " + (t.score_pct >= 70 ? "var(--secondary)" : t.score_pct >= 40 ? "var(--accent)" : "var(--primary)") }}
            >
              <strong style={{ fontSize: "18px", textTransform: "uppercase" }}>{t.topic}</strong>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div className="brutal-badge" style={{ background: "var(--white)" }}>
                  {t.score_pct}%
                </div>
                <span style={{ fontWeight: "700", fontSize: "14px", color: "#475569" }}>
                  {t.correct}/{t.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {behavioral && (
        <div style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "24px", textTransform: "uppercase", margin: 0, paddingBottom: "12px", borderBottom: "4px solid var(--border)", flexGrow: 1, marginRight: "24px" }}>
              Behavioral Analysis
            </h2>
            <div style={{ display: "flex", gap: "16px" }}>
              <div className="brutal-card" style={{ padding: "12px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "#64748b", marginBottom: "4px" }}>Avg Time/Question</span>
                <strong style={{ fontSize: "20px" }}>
                  {behavioral.length > 0 ? Math.round(behavioral.reduce((acc, q) => acc + q.time_taken, 0) / behavioral.length) : 0}s
                </strong>
              </div>
              <div 
                className="brutal-card brutal-card-hoverable" 
                onClick={() => setFilter({ type: 'behavior', value: 'skipped' })}
                style={{ cursor: "pointer", padding: "12px 20px", display: "flex", flexDirection: "column", alignItems: "center", borderLeft: "4px solid var(--border)" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "#64748b", marginBottom: "4px" }}>Questions Skipped</span>
                <strong style={{ fontSize: "20px" }}>
                  {behavioral.filter((q) => q.status === "skipped").length}
                </strong>
              </div>
            </div>
          </div>
          <BehaviorQuadrantChart responses={behavioral} onSelectBehavior={(b) => setFilter({ type: 'behavior', value: b })} />
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <button className="brutal-btn" onClick={() => setFilter(filter?.type === 'all' ? null : { type: 'all', value: 'all' })}>
          {filter?.type === 'all' ? "Hide Question-wise Answers" : "See Question-wise Answers"}
        </button>
      </div>

      {filter && filteredQuestions.length > 0 && (
        <div ref={reviewRef}>
          <h2 style={{ fontSize: "24px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
            Question Review ({filter.type === 'all' ? 'All' : (BEHAVIOR_LABELS[filter.value] || filter.value)})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {filteredQuestions.map((q, idx) => (
              <div key={idx} className="brutal-card" style={{ borderLeft: q.is_correct ? "8px solid var(--secondary)" : q.status === 'skipped' ? "8px solid var(--border)" : "8px solid var(--primary)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div className="brutal-badge">{q.topic}</div>
                  <div className="brutal-badge" style={{ background: "var(--white)" }}>{BEHAVIOR_LABELS[q.behavior] || q.behavior}</div>
                </div>
                <h3 style={{ margin: "0 0 16px", fontSize: "20px" }}>{q.question_text}</h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ padding: "12px", background: q.is_correct ? "#dcfce7" : "#fee2e2", border: "2px solid var(--border)", borderRadius: "var(--radius)", fontWeight: "600" }}>
                    Student Answer: {q.status === 'skipped' ? 'SKIPPED' : q.student_answer || 'N/A'}
                  </div>
                  {!q.is_correct && (
                    <div style={{ padding: "12px", background: "#f1f5f9", border: "2px solid var(--border)", borderRadius: "var(--radius)", fontWeight: "600" }}>
                      Correct Answer: {q.correct_answer || 'N/A'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {filter && filteredQuestions.length === 0 && (
        <div className="brutal-card" style={{ background: "#f1f5f9", textAlign: "center" }}>
          <p style={{ margin: 0, fontWeight: "600", color: "#ef4444" }}>No questions match this category. Click on a different quadrant to review questions.</p>
        </div>
      )}
    </div>
  );
}
