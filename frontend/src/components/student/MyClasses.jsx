import { useEffect, useState } from "react";
import { getStudentClasses } from "../../api";

export default function MyClasses({ student, onSelectClass, onLogout }) {
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    getStudentClasses(student.userid).then(setClasses);
  }, [student]);

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <div className="brutal-card" style={{ marginBottom: "48px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "40px", borderTop: "8px solid var(--secondary)" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: "48px", textTransform: "uppercase", letterSpacing: "-1.5px", fontWeight: "800" }}>
            Student Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: "#475569" }}>
            Welcome back, {student.name}!
          </p>
        </div>
        <button className="brutal-btn brutal-btn-white" onClick={onLogout} style={{ fontSize: "16px", padding: "12px 24px" }}>
          <i className="fa-solid fa-arrow-right-from-bracket" style={{ marginRight: "8px" }}></i> 
          Sign Out
        </button>
      </div>

      <h2 style={{ fontSize: "28px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
        Your Enrolled Classes
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
        {classes.map((c, idx) => {
          const colors = ["var(--secondary)", "var(--primary)", "var(--accent)", "var(--pink)"];
          const stripColor = colors[idx % colors.length];
          return (
            <div
              key={c.class_id}
              onClick={() => onSelectClass(c)}
              className="brutal-card brutal-card-hoverable"
              style={{ cursor: "pointer", borderLeft: `8px solid ${stripColor}` }}
            >
              <h2 style={{ margin: "0 0 12px", fontSize: "28px", textTransform: "uppercase" }}>{c.subject}</h2>
              <div className="brutal-badge" style={{ background: stripColor, color: "#fff" }}>Class {c.class_id}</div>
            </div>
          );
        })}
        {classes.length === 0 && (
          <div className="brutal-card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", background: "#f1f5f9" }}>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>You are not enrolled in any classes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
