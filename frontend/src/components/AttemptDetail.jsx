import { useEffect, useState, useRef } from "react";
import { getTopicScores, getBehavioral } from "../api";

export default function AttemptDetail({ student, attempt, onBack, onLogout }) {
  const [topics, setTopics] = useState([]);
  const [behavioral, setBehavioral] = useState(null);
  
  // filter object: { type: 'topic' | 'behavior' | 'all', value: string }
  const [filter, setFilter] = useState(null);
  const reviewRef = useRef(null);

  useEffect(() => {
    getTopicScores(student.userid, attempt.attemptid).then(setTopics);
    getBehavioral(student.userid, attempt.attemptid).then(setBehavioral);
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
      <button className="brutal-btn brutal-btn-white" onClick={onBack} style={{ marginBottom: "32px" }}>← Back</button>

      <div className="brutal-card" style={{ borderTop: "8px solid var(--secondary)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: "32px", textTransform: "uppercase" }}>Quiz Review</h1>
          <div className="brutal-badge">
            {student.name} · {attempt.quiz_title || attempt.attemptid}
          </div>
        </div>
        {onLogout && (
          <button className="brutal-btn brutal-btn-white" onClick={onLogout}>Log out</button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "start", marginBottom: "40px" }}>
        <div>
          <h2 style={{ fontSize: "24px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
            Topic Performance
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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

        <div>
          <h2 style={{ fontSize: "24px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
            Behavioral Profile
          </h2>
          {behavioral ? (
            <div className="brutal-card" style={{ borderLeft: "8px solid var(--accent)", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "2px solid var(--border)" }}>
                <span style={{ fontWeight: "700", textTransform: "uppercase" }}>Avg Time/Question</span>
                <span className="brutal-badge" style={{ background: "var(--white)" }}>
                  {behavioral.length > 0 ? Math.round(behavioral.reduce((acc, q) => acc + q.time_taken, 0) / behavioral.length) : 0}s
                </span>
              </div>
              <div 
                className="brutal-card-hoverable"
                onClick={() => setFilter({ type: 'behavior', value: 'skipped' })}
                style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "2px solid var(--border)" }}>
                <div>
                  <div style={{ fontWeight: "700", textTransform: "uppercase", marginBottom: "8px" }}>Questions Skipped</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {[...new Set(behavioral.filter(q => q.status === 'skipped').map(q => q.topic))].map(t => <span key={t} className="brutal-badge" style={{ fontSize: "12px" }}>{t}</span>)}
                  </div>
                </div>
                <span className="brutal-badge" style={{ background: "var(--white)", height: "fit-content" }}>
                  {behavioral.filter((q) => q.status === "skipped").length}
                </span>
              </div>
              <div 
                className="brutal-card-hoverable"
                onClick={() => setFilter({ type: 'behavior', value: 'struggling' })}
                style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "2px solid var(--border)" }}>
                <div>
                  <div style={{ fontWeight: "700", textTransform: "uppercase", marginBottom: "8px" }}>Struggling (Slow & Wrong)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {[...new Set(behavioral.filter(q => q.behavior === 'struggling').map(q => q.topic))].map(t => <span key={t} className="brutal-badge" style={{ fontSize: "12px" }}>{t}</span>)}
                  </div>
                </div>
                <span className="brutal-badge" style={{ background: "var(--white)", height: "fit-content" }}>
                  {behavioral.filter((q) => q.behavior === "struggling").length}
                </span>
              </div>
              <div 
                className="brutal-card-hoverable"
                onClick={() => setFilter({ type: 'behavior', value: 'overconfident' })}
                style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "2px solid var(--border)" }}>
                <div>
                  <div style={{ fontWeight: "700", textTransform: "uppercase", marginBottom: "8px" }}>Overconfident (Fast & Wrong)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {[...new Set(behavioral.filter(q => q.behavior === 'overconfident').map(q => q.topic))].map(t => <span key={t} className="brutal-badge" style={{ fontSize: "12px" }}>{t}</span>)}
                  </div>
                </div>
                <span className="brutal-badge" style={{ background: "var(--white)", height: "fit-content" }}>
                  {behavioral.filter((q) => q.behavior === "overconfident").length}
                </span>
              </div>
              <div 
                className="brutal-card-hoverable"
                onClick={() => setFilter({ type: 'behavior', value: 'careful' })}
                style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "2px solid var(--border)" }}>
                <div>
                  <div style={{ fontWeight: "700", textTransform: "uppercase", marginBottom: "8px" }}>Careful (Slow & Right)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {[...new Set(behavioral.filter(q => q.behavior === 'careful').map(q => q.topic))].map(t => <span key={t} className="brutal-badge" style={{ fontSize: "12px" }}>{t}</span>)}
                  </div>
                </div>
                <span className="brutal-badge" style={{ background: "var(--white)", height: "fit-content" }}>
                  {behavioral.filter((q) => q.behavior === "careful").length}
                </span>
              </div>
              <div 
                className="brutal-card-hoverable"
                onClick={() => setFilter({ type: 'behavior', value: 'accurate' })}
                style={{ cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: "700", textTransform: "uppercase", marginBottom: "8px" }}>Accurate (Fast & Right)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {[...new Set(behavioral.filter(q => q.behavior === 'accurate').map(q => q.topic))].map(t => <span key={t} className="brutal-badge" style={{ fontSize: "12px" }}>{t}</span>)}
                  </div>
                </div>
                <span className="brutal-badge" style={{ background: "var(--white)", height: "fit-content" }}>
                  {behavioral.filter((q) => q.behavior === "accurate").length}
                </span>
              </div>
            </div>
          ) : (
            <div className="brutal-card" style={{ background: "#f1f5f9" }}>
              <p style={{ margin: 0, fontWeight: "600" }}>Loading behavioral data...</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <button className="brutal-btn" onClick={() => setFilter(filter?.type === 'all' ? null : { type: 'all', value: 'all' })}>
          {filter?.type === 'all' ? "Hide Question-wise Answers" : "See Question-wise Answers"}
        </button>
      </div>

      {filter && filteredQuestions.length > 0 && (
        <div ref={reviewRef}>
          <h2 style={{ fontSize: "24px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
            Question Review ({filter.type === 'all' ? 'All' : filter.value})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {filteredQuestions.map((q, idx) => (
              <div key={idx} className="brutal-card" style={{ borderLeft: q.is_correct ? "8px solid var(--secondary)" : q.status === 'skipped' ? "8px solid var(--border)" : "8px solid var(--primary)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div className="brutal-badge">{q.topic}</div>
                  <div className="brutal-badge" style={{ background: "var(--white)" }}>{q.behavior}</div>
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
          <p style={{ margin: 0, fontWeight: "600" }}>No questions match this filter.</p>
        </div>
      )}
    </div>
  );
}
