import { useEffect, useRef, useState } from "react";
import { getQuizQuestions, submitAttempt } from "../../api";

export default function TakeQuiz({ student, quiz, onDone, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [responses, setResponses] = useState([]);      // saved responses per question
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const firstAnswerRef = useRef(null);
  const revisionCountRef = useRef(0);
  const savedFirstAnswers = useRef({});   // { [index]: firstAnswer }
  const savedRevisions = useRef({});      // { [index]: revisionCount }

  useEffect(() => {
    getQuizQuestions(quiz.quizid).then(setQuestions);
  }, [quiz]);

  useEffect(() => {
    // Restore saved answer if navigating back to a previously visited question
    const saved = responses[index];
    if (saved) {
      setAnswer(saved.final_answer ?? "");
      firstAnswerRef.current = savedFirstAnswers.current[index] ?? null;
      revisionCountRef.current = savedRevisions.current[index] ?? 0;
    } else {
      setAnswer("");
      firstAnswerRef.current = null;
      revisionCountRef.current = 0;
    }
    setQuestionStartTime(Date.now());
  }, [index]);

  if (questions.length === 0) return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
      <div className="brutal-card"><p style={{ margin: 0, fontWeight: "600" }}>Loading questions...</p></div>
    </div>
  );

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const isMCQ = current.question_type?.toLowerCase() === "mcq";
  const options = isMCQ ? (Array.isArray(current.options) ? current.options : JSON.parse(current.options || "[]")) : [];

  const handleAnswerChange = (val) => {
    if (firstAnswerRef.current === null) {
      firstAnswerRef.current = val;
    } else {
      revisionCountRef.current += 1;
    }
    setAnswer(val);
  };

  const buildResponse = (status) => ({
    question_id: current.questionid,
    time_taken: Math.round((Date.now() - questionStartTime) / 1000),
    status,
    first_answer: firstAnswerRef.current ?? null,
    final_answer: status === "skipped" ? null : answer || null,
    is_correct:
      status === "skipped"
        ? false
        : answer.trim().toLowerCase() === current.correct_answer.trim().toLowerCase(),
    revision_count: revisionCountRef.current,
  });

  const advance = (status) => {
    const response = buildResponse(status);
    // Save first answer + revision refs keyed by index before moving
    savedFirstAnswers.current[index] = firstAnswerRef.current;
    savedRevisions.current[index] = revisionCountRef.current;
    // Upsert into responses array at the current index position
    const updated = [...responses];
    updated[index] = response;
    setResponses(updated);

    if (isLast) {
      handleSubmit(updated);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    // Save current answer state before going back
    if (answer || firstAnswerRef.current) {
      savedFirstAnswers.current[index] = firstAnswerRef.current;
      savedRevisions.current[index] = revisionCountRef.current;
      const updated = [...responses];
      updated[index] = buildResponse(answer ? "answered" : "skipped");
      setResponses(updated);
    }
    setIndex((i) => i - 1);
  };

  const handleSubmit = async (finalResponses) => {
    setSubmitting(true);
    const payload = {
      attempt_id: `ATT-${student.userid}-${quiz.quizid}-${Date.now()}`,
      student_id: student.userid,
      quiz_id: quiz.quizid,
      timestamp: new Date().toISOString(),
      ended_reason: "submitted",
      responses: finalResponses,
    };
    try {
      await submitAttempt(payload);
      setDone(true);
      onDone();
    } catch (e) {
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <div className="brutal-card" style={{ background: "var(--accent)" }}>
          <h1 style={{ margin: "0 0 24px", fontSize: "32px", textTransform: "uppercase" }}>Quiz Submitted!</h1>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <button className="brutal-btn brutal-btn-white" onClick={onBack}>✕ Exit</button>
        <div className="brutal-badge" style={{ fontSize: "16px", padding: "8px 16px" }}>
          Question {index + 1} of {questions.length}
        </div>
      </div>

      <div className="brutal-card" style={{ flex: 1, marginBottom: "24px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
          <div className="brutal-badge" style={{ background: "var(--secondary)", color: "#fff" }}>{current.topic}</div>
          <div className="brutal-badge" style={{ background: "var(--accent)", color: "#fff" }}>{current.difficulty}</div>
        </div>
        
        <h2 style={{ margin: "0 0 32px", fontSize: "28px", lineHeight: "1.4" }}>{current.text}</h2>

        {isMCQ ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "auto" }}>
            {options.map((opt, i) => {
              const isSelected = answer === opt;
              return (
                <button
                  key={i}
                  onClick={() => handleAnswerChange(opt)}
                  className={`brutal-btn ${isSelected ? "" : "brutal-btn-white"}`}
                  style={{
                    textAlign: "left",
                    padding: "16px 20px",
                    backgroundColor: isSelected ? "var(--primary)" : "var(--white)",
                    color: isSelected ? "#fff" : "var(--text)",
                    transform: isSelected ? "translate(-2px, -2px)" : "none",
                    boxShadow: isSelected ? "calc(var(--shadow-offset) + 2px) calc(var(--shadow-offset) + 2px) 0 var(--border)" : "var(--shadow-offset) var(--shadow-offset) 0 var(--border)",
                  }}
                >
                  <strong style={{ marginRight: "16px", display: "inline-block", width: "24px" }}>
                    {String.fromCharCode(65 + i)}.
                  </strong>
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            className="brutal-input"
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            style={{ width: "100%", minHeight: "160px", marginTop: "auto", fontSize: "18px" }}
          />
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          {index > 0 && (
            <button className="brutal-btn brutal-btn-white" onClick={goBack}>
              ← Previous
            </button>
          )}
          <button className="brutal-btn brutal-btn-white" onClick={() => advance("skipped")}>
            Skip
          </button>
        </div>
        <button
          className="brutal-btn"
          onClick={() => advance("answered")}
          disabled={!answer || submitting}
          style={{ padding: "16px 32px", fontSize: "20px", background: "var(--primary)", color: "#fff" }}
        >
          {submitting ? "Submitting..." : isLast ? "Submit Quiz" : "Next →"}
        </button>
      </div>
    </div>
  );
}
