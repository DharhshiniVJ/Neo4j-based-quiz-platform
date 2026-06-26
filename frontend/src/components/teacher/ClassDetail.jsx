import { useEffect, useState, useRef } from "react";
import { getTeacherStudents, getClassQuizzes, uploadClassMaterial, getClassMaterials, deleteClassMaterial } from "../../api";

export default function ClassDetail({ teacher, selectedClass, onSelectStudent, onCreateQuiz, onSelectQuizReport, onViewPerformance, onBack }) {
  const [students, setStudents] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getTeacherStudents(teacher.userid).then((allStudents) => {
      setStudents(allStudents.filter((s) => s.class_id === selectedClass.class_id));
    });
    getClassQuizzes(selectedClass.class_id).then(setQuizzes);
    getClassMaterials(selectedClass.class_id).then(setMaterials).catch(console.error);
  }, [teacher, selectedClass]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadClassMaterial(selectedClass.class_id, file);
      const updatedMaterials = await getClassMaterials(selectedClass.class_id);
      setMaterials(updatedMaterials);
    } catch (err) {
      alert("Failed to upload material: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteMaterial = async (docId) => {
    if (!confirm("Are you sure you want to delete this syllabus? It will remove all related AI context.")) return;
    try {
      await deleteClassMaterial(selectedClass.class_id, docId);
      setMaterials(materials.filter(m => m.doc_id !== docId));
    } catch (err) {
      alert("Failed to delete material: " + err.message);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <button className="brutal-btn" onClick={onBack} style={{ marginBottom: "32px" }}>← Back to Classes</button>
      
      <div className="brutal-card" style={{ borderTop: "8px solid var(--primary)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: "32px", textTransform: "uppercase" }}>{selectedClass.subject}</h1>
          <div className="brutal-badge">Class {selectedClass.class_id}</div>
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <button className="brutal-btn brutal-btn-white" onClick={onViewPerformance} style={{ fontSize: "18px" }}>
            View Class Performance
          </button>
          <button className="brutal-btn" onClick={onCreateQuiz} style={{ fontSize: "18px" }}>
            + Create New Quiz
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "32px", alignItems: "start" }}>
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

        <div>
          <h2 style={{ fontSize: "24px", textTransform: "uppercase", marginBottom: "24px", paddingBottom: "12px", borderBottom: "4px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Materials ({materials.length})</span>
            <button 
              className="brutal-btn" 
              style={{ fontSize: "14px", padding: "8px 16px" }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "+ Upload PDF"}
            </button>
            <input 
              type="file" 
              accept="application/pdf" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              onChange={handleFileUpload} 
            />
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {materials.length === 0 && (
              <div className="brutal-card" style={{ background: "#f1f5f9" }}>
                <p style={{ margin: 0, fontWeight: "600" }}>No materials uploaded.</p>
              </div>
            )}
            {materials.map((m) => (
              <div
                key={m.doc_id}
                className="brutal-card"
                style={{ borderLeft: "8px solid #a855f7", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <h3 style={{ margin: "0 0 8px", fontSize: "16px", wordBreak: "break-all" }}>{m.filename}</h3>
                  <div className="brutal-badge" style={{ background: "var(--white)", fontSize: "12px" }}>
                    {new Date(m.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
                <button 
                  className="brutal-btn" 
                  style={{ background: "#ef4444", color: "white", padding: "6px 12px", fontSize: "12px" }}
                  onClick={() => handleDeleteMaterial(m.doc_id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
