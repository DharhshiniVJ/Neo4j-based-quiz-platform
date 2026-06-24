import { useState } from "react";
import { loginUser } from "../api";

export default function LoginPage({ onLogin }) {
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const user = await loginUser(email.trim(), password, role);
      onLogin(user);
    } catch {
      setError("Invalid email or password for the selected role.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div className="brutal-card" style={{ maxWidth: "420px", width: "100%", display: "flex", flexDirection: "column", gap: "24px", borderTop: "8px solid var(--primary)" }}>
        
        <div style={{ textAlign: "center", paddingBottom: "16px", borderBottom: "var(--border-width) solid var(--border)" }}>
          <h1 style={{ fontSize: "40px", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "-1px" }}>StudyDB</h1>
          <p style={{ margin: 0, fontWeight: "600", color: "#475569" }}>Sign in to continue</p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            className={`brutal-btn ${role === "student" ? "" : "brutal-btn-white"}`}
            style={{ flex: 1, backgroundColor: role === "student" ? "var(--primary)" : "var(--white)", color: role === "student" ? "#fff" : "var(--text)" }}
            onClick={() => setRole("student")}
          >
            Student
          </button>
          <button
            className={`brutal-btn ${role === "teacher" ? "" : "brutal-btn-white"}`}
            style={{ flex: 1, backgroundColor: role === "teacher" ? "var(--secondary)" : "var(--white)", color: role === "teacher" ? "#fff" : "var(--text)" }}
            onClick={() => setRole("teacher")}
          >
            Teacher
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontWeight: "700" }}>Email Address</label>
            <input
              className="brutal-input"
              id="email-input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontWeight: "700" }}>Password</label>
            <input
              className="brutal-input"
              id="password-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
        </div>

        {error && (
          <div className="brutal-card" style={{ background: "#ffb3b3", padding: "12px", borderStyle: "dashed" }}>
            <p style={{ margin: 0, fontWeight: "600", color: "#d32f2f" }}>{error}</p>
          </div>
        )}

        <button
          className="brutal-btn"
          id="login-btn"
          onClick={handleLogin}
          disabled={loading || !email || !password}
          style={{ marginTop: "12px", padding: "16px", fontSize: "18px" }}
        >
          {loading ? "Logging in..." : "Log In"}
        </button>
      </div>
    </div>
  );
}
