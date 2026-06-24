import { useEffect, useState } from "react";
import { getClassTopics, createQuiz } from "../../api";

export default function CreateQuiz({ teacher, selectedClass, onBack }) {
  const [topics, setTopics] = useState([]);
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState(20);
  const [questions, setQuestions] = useState([
    { text: "", difficulty: "medium", question_type: "MCQ", options: ["", "", "", ""], correct_answer: "", topic_id: "" }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getClassTopics(selectedClass.class_id).then(setTopics);
  }, [selectedClass]);

  const addQuestion = () => {
    setQuestions([...questions, { text: "", difficulty: "medium", question_type: "MCQ", options: ["", "", "", ""], correct_answer: "", topic_id: "" }]);
  };

  const updateQuestion = (index, field, value) => {
    const newQs = [...questions];
    newQs[index][field] = value;
    setQuestions(newQs);
  };

  const updateOption = (qIndex, optIndex, value) => {
    const newQs = [...questions];
    newQs[qIndex].options[optIndex] = value;
    setQuestions(newQs);
  };

  const removeQuestion = (index) => {
    if (questions.length === 1) return;
    const newQs = [...questions];
    newQs.splice(index, 1);
    setQuestions(newQs);
  };

  const handleSubmit = async () => {
    if (!title) return alert("Please enter a quiz title.");
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text || !q.topic_id || !q.correct_answer) {
        return alert(`Please fill all required fields for Question ${i + 1}`);
      }
      if (q.question_type === "MCQ") {
        if (q.options.some((o) => !o.trim())) return alert(`Please fill all 4 options for Question ${i + 1}`);
        if (!q.options.includes(q.correct_answer)) return alert(`Correct answer must exactly match one of the options for Question ${i + 1}`);
      }
    }

    setSubmitting(true);
    try {
      await createQuiz({
        title,
        time_limit_minutes: parseInt(timeLimit, 10),
        teacher_id: teacher.userid,
        class_id: selectedClass.class_id,
        questions,
      });
      setDone(true);
    } catch (e) {
      alert("Failed to create quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <div className="brutal-card" style={{ background: "var(--accent)", display: "inline-block" }}>
          <h1 style={{ margin: "0 0 24px", fontSize: "32px", textTransform: "uppercase" }}>Quiz Created!</h1>
          <button className="brutal-btn" onClick={onBack}>← Back to Class</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <button className="brutal-btn" onClick={onBack} style={{ marginBottom: "32px" }}>← Cancel</button>
      
      <div className="brutal-card" style={{ borderTop: "8px solid var(--primary)", marginBottom: "40px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "36px", textTransform: "uppercase" }}>Create New Quiz</h1>
        <div className="brutal-badge" style={{ background: "var(--white)" }}>{selectedClass.subject} — Class {selectedClass.class_id}</div>
      </div>

      <div className="brutal-card" style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontWeight: "700", textTransform: "uppercase" }}>Quiz Title</label>
            <input className="brutal-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Midterm Test 1" />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontWeight: "700", textTransform: "uppercase" }}>Time Limit (min)</label>
            <input type="number" className="brutal-input" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} min="1" />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "32px", marginBottom: "40px" }}>
        {questions.map((q, i) => (
          <div key={i} className="brutal-card" style={{ position: "relative", backgroundColor: i % 2 === 0 ? "#f9fafb" : "var(--white)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "4px solid var(--border)", paddingBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "24px", textTransform: "uppercase" }}>Question {i + 1}</h3>
              <button className="brutal-btn brutal-btn-pink" onClick={() => removeQuestion(i)} style={{ padding: "8px 16px" }}>Remove</button>
            </div>

            <div style={{ display: "flex", gap: "24px", marginBottom: "24px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontWeight: "700" }}>Topic</label>
                <select className="brutal-input" value={q.topic_id} onChange={(e) => updateQuestion(i, "topic_id", e.target.value)}>
                  <option value="">Select a topic...</option>
                  {topics.map((t) => <option key={t.topicid} value={t.topicid}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontWeight: "700" }}>Type</label>
                <select className="brutal-input" value={q.question_type} onChange={(e) => updateQuestion(i, "question_type", e.target.value)}>
                  <option value="MCQ">Multiple Choice</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontWeight: "700" }}>Difficulty</label>
                <select className="brutal-input" value={q.difficulty} onChange={(e) => updateQuestion(i, "difficulty", e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
              <label style={{ fontWeight: "700" }}>Question Text</label>
              <textarea className="brutal-input" style={{ minHeight: "100px" }} value={q.text} onChange={(e) => updateQuestion(i, "text", e.target.value)} placeholder="Type question here..." />
            </div>

            {q.question_type === "MCQ" ? (
              <div className="brutal-card" style={{ borderLeft: "8px solid var(--secondary)", padding: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <label style={{ fontWeight: "700" }}>Option {optIdx + 1}</label>
                      <input className="brutal-input" value={opt} onChange={(e) => updateOption(i, optIdx, e.target.value)} placeholder={`Option ${optIdx + 1}`} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontWeight: "700" }}>Correct Answer</label>
                  <select className="brutal-input" value={q.correct_answer} onChange={(e) => updateQuestion(i, "correct_answer", e.target.value)}>
                    <option value="">Select correct option...</option>
                    {q.options.map((opt, optIdx) => opt.trim() && <option key={optIdx} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontWeight: "700" }}>Correct Answer</label>
                <input className="brutal-input" value={q.correct_answer} onChange={(e) => updateQuestion(i, "correct_answer", e.target.value)} placeholder="Type correct answer..." />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="brutal-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--bg)" }}>
        <button className="brutal-btn brutal-btn-white" onClick={addQuestion}>+ Add Question</button>
        <button className="brutal-btn brutal-btn-accent" onClick={handleSubmit} disabled={submitting} style={{ padding: "16px 32px", fontSize: "20px" }}>
          {submitting ? "Creating..." : "Create Quiz"}
        </button>
      </div>
    </div>
  );
}
