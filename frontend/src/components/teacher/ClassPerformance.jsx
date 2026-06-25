import { useEffect, useState } from "react";
import { getClassOverallStats } from "../../api";

export default function ClassPerformance({ selectedClass, onBack }) {
  const [classStats, setClassStats] = useState(null);
  const [filter, setFilter] = useState(null);

  useEffect(() => {
    getClassOverallStats(selectedClass.class_id).then(setClassStats);
  }, [selectedClass]);

  if (!classStats) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Loading class performance...</div>;
  }

  const { summary, behavioral, best_topics, weakest_topics } = classStats;

  const getRankedTopics = (behaviorType) => {
    if (!behavioral) return [];
    const filtered = behavioral.filter(q => q.behavior === behaviorType);
    const counts = {};
    filtered.forEach(q => {
      counts[q.topic] = (counts[q.topic] || 0) + 1;
    });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <button className="brutal-btn brutal-btn-white" onClick={onBack} style={{ marginBottom: "32px" }}>← Back to Class</button>

      <div className="brutal-card" style={{ borderTop: "8px solid var(--primary)", marginBottom: "40px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "32px", textTransform: "uppercase" }}>Overall Class Performance</h1>
        <div className="brutal-badge">{selectedClass.subject} ({selectedClass.class_id})</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "start", marginBottom: "40px" }}>
        <div className="brutal-card" style={{ borderLeft: "8px solid #22c55e", background: "#f0fdf4" }}>
          <h2 style={{ fontSize: "20px", color: "#166534", textTransform: "uppercase", marginBottom: "16px" }}>Strongest Topics</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {best_topics.length === 0 && <span>No data</span>}
            {best_topics.map(t => (
              <div key={t.topic} style={{ display: "flex", justifyContent: "space-between", fontWeight: "600" }}>
                <span>{t.topic}</span>
                <span style={{ color: "#166534" }}>{t.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="brutal-card" style={{ borderLeft: "8px solid #ef4444", background: "#fef2f2" }}>
          <h2 style={{ fontSize: "20px", color: "#b91c1c", textTransform: "uppercase", marginBottom: "16px" }}>Weakest Topics</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {weakest_topics.length === 0 && <span>No data</span>}
            {weakest_topics.map(t => (
              <div key={t.topic} style={{ display: "flex", justifyContent: "space-between", fontWeight: "600" }}>
                <span>{t.topic}</span>
                <span style={{ color: "#b91c1c" }}>{t.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: "28px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
        Behavioral Analysis
      </h2>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div 
            className="brutal-card-hoverable"
            style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", padding: "16px", border: "4px solid var(--border)", borderLeft: "8px solid #ef4444", background: "var(--white)" }}>
            <div>
              <div style={{ fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Struggling</div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px", lineHeight: "1.4" }}>
                Topics under struggling suggest the class is spending a lot of time but still arriving at the wrong answer.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {getRankedTopics('struggling').slice(0, 5).map(t => <span key={t} className="brutal-badge" style={{ fontSize: "12px" }}>{t}</span>)}
              </div>
            </div>
            <span className="brutal-badge" style={{ background: "var(--white)", height: "fit-content" }}>
              {behavioral.filter((q) => q.behavior === "struggling").length}
            </span>
          </div>
          <div 
            className="brutal-card-hoverable"
            style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", padding: "16px", border: "4px solid var(--border)", borderLeft: "8px solid var(--accent)", background: "var(--white)" }}>
            <div>
              <div style={{ fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Reckless</div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px", lineHeight: "1.4" }}>
                Topics under reckless suggest the class is rushing through questions and answering incorrectly.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {getRankedTopics('reckless').slice(0, 5).map(t => <span key={t} className="brutal-badge" style={{ fontSize: "12px" }}>{t}</span>)}
              </div>
            </div>
            <span className="brutal-badge" style={{ background: "var(--white)", height: "fit-content" }}>
              {behavioral.filter((q) => q.behavior === "reckless").length}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div 
            className="brutal-card-hoverable"
            style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", padding: "16px", border: "4px solid var(--border)", borderLeft: "8px solid #3b82f6", background: "var(--white)" }}>
            <div>
              <div style={{ fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Methodical</div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px", lineHeight: "1.4" }}>
                Topics under methodical suggest that in these topics the class takes a little bit of time but arrives at the correct answer.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {getRankedTopics('methodical').slice(0, 5).map(t => <span key={t} className="brutal-badge" style={{ fontSize: "12px" }}>{t}</span>)}
              </div>
            </div>
            <span className="brutal-badge" style={{ background: "var(--white)", height: "fit-content" }}>
              {behavioral.filter((q) => q.behavior === "methodical").length}
            </span>
          </div>
          <div 
            className="brutal-card-hoverable"
            style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", padding: "16px", border: "4px solid var(--border)", borderLeft: "8px solid #22c55e", background: "var(--white)" }}>
            <div>
              <div style={{ fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Optimal</div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px", lineHeight: "1.4" }}>
                Topics under optimal suggest the class is efficiently and quickly arriving at the correct answers.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {getRankedTopics('optimal').slice(0, 5).map(t => <span key={t} className="brutal-badge" style={{ fontSize: "12px" }}>{t}</span>)}
              </div>
            </div>
            <span className="brutal-badge" style={{ background: "var(--white)", height: "fit-content" }}>
              {behavioral.filter((q) => q.behavior === "optimal").length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
