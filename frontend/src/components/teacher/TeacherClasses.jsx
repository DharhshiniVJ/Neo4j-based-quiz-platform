import { useEffect, useState } from "react";
import { getTeacherClasses, getSubjects, createTeacherClass } from "../../api";

export default function TeacherClasses({ teacher, onSelectClass, onLogout, isAssigningQuiz, assigningLabel }) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClasses();
    getSubjects().then(res => {
      setSubjects(res);
      if (res.length > 0) setSelectedSubject(res[0].name);
    });
  }, [teacher]);

  const loadClasses = () => {
    getTeacherClasses(teacher.userid).then(setClasses);
  };

  const handleCreate = async () => {
    if (!selectedSubject) return;
    setLoading(true);
    try {
      const newClass = await createTeacherClass(selectedSubject);
      alert(`Class created successfully!\nJoin Code: ${newClass.join_code}\nShare this code with your students.`);
      setShowCreate(false);
      loadClasses();
    } catch (err) {
      alert("Failed to create class.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <div className="brutal-card" style={{ marginBottom: "48px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "40px", borderTop: "8px solid var(--primary)" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: "48px", textTransform: "uppercase", letterSpacing: "-1.5px", fontWeight: "800" }}>
            {isAssigningQuiz ? "Select a Class" : "Teacher Dashboard"}
          </h1>
          <p style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: "#475569" }}>
            {assigningLabel || (isAssigningQuiz ? "Which class is this quiz for?" : `Welcome back, ${teacher.name}!`)}
          </p>
        </div>
        {!isAssigningQuiz && (
          <button className="brutal-btn brutal-btn-white" onClick={onLogout} style={{ fontSize: "16px", padding: "12px 24px" }}>
            <i className="fa-solid fa-arrow-right-from-bracket" style={{ marginRight: "8px" }}></i> 
            Sign Out
          </button>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)" }}>
        <h2 style={{ fontSize: "28px", textTransform: "uppercase", margin: 0 }}>
          {isAssigningQuiz ? "Select Class" : "Your Classes"}
        </h2>
        {!isAssigningQuiz && (
          <button className="brutal-btn" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "Cancel" : "+ Create Class"}
          </button>
        )}
      </div>

      {showCreate && (
        <div className="brutal-card" style={{ marginBottom: "32px", borderLeft: "8px solid var(--accent)" }}>
          <h3 style={{ margin: "0 0 16px", textTransform: "uppercase" }}>Create New Class</h3>
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontWeight: "700" }}>Select Subject</label>
              <select 
                className="brutal-input" 
                value={selectedSubject} 
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                {subjects.map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <button className="brutal-btn" onClick={handleCreate} disabled={loading || !selectedSubject}>
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
        {classes.map((c, idx) => {
          const colors = ["var(--primary)", "var(--secondary)", "var(--accent)", "var(--cyan)"];
          const stripColor = colors[idx % colors.length];
          return (
            <div
              key={c.class_id}
              onClick={() => onSelectClass(c)}
              className="brutal-card brutal-card-hoverable"
              style={{ cursor: "pointer", borderLeft: `8px solid ${stripColor}` }}
            >
              <h2 style={{ margin: "0 0 12px", fontSize: "28px", textTransform: "uppercase" }}>{c.subject}</h2>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="brutal-badge" style={{ background: stripColor, color: "#fff" }}>Class {c.class_id}</div>
                <div className="brutal-badge" style={{ background: "var(--white)", color: "var(--text)", border: "2px solid var(--border)" }}>
                  Code: {c.join_code}
                </div>
              </div>
            </div>
          );
        })}
        {classes.length === 0 && (
          <div className="brutal-card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", background: "#f1f5f9" }}>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>No classes assigned to you.</p>
          </div>
        )}
      </div>
    </div>
  );
}
