import React from "react";

export default function LandingPage({ onLoginClick }) {
  return (
    <div style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto", fontFamily: "var(--font-family)", overflowX: "hidden" }}>
      {/* Header */}
      <header className="animate-fade-in-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "80px", paddingBottom: "20px", borderBottom: "var(--border-width) solid var(--border)" }}>
        <h1 style={{ fontSize: "32px", margin: 0, textTransform: "uppercase", letterSpacing: "-1px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ backgroundColor: "var(--primary)", color: "white", padding: "4px 12px", borderRadius: "4px" }}>Study</span>DB
        </h1>
        <button 
          className="brutal-btn" 
          onClick={onLoginClick}
          style={{ padding: "12px 24px", fontSize: "16px" }}
        >
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <section className="animate-fade-in-up delay-100" style={{ textAlign: "center", marginBottom: "120px", position: "relative" }}>
        <div style={{ position: "absolute", top: "-20px", left: "10%", transform: "rotate(-2deg)", backgroundColor: "var(--text)", color: "white", padding: "8px 16px", border: "2px solid black", fontWeight: "bold", fontSize: "14px", zIndex: -1 }}>
          Powered by Cerebras
        </div>
        <div style={{ position: "absolute", bottom: "20px", right: "10%", transform: "rotate(2deg)", backgroundColor: "var(--primary)", color: "white", padding: "8px 16px", border: "2px solid black", fontWeight: "bold", fontSize: "14px", zIndex: -1 }}>
          Enterprise Architecture
        </div>
        
        <h2 style={{ fontSize: "clamp(48px, 8vw, 88px)", margin: "0 0 24px", textTransform: "uppercase", lineHeight: 1, letterSpacing: "-3px", textShadow: "4px 4px 0px rgba(0,0,0,0.1)" }}>
          Intelligence beyond <br /><span style={{ color: "var(--primary)" }}>raw metrics.</span>
        </h2>
        <p style={{ fontSize: "clamp(18px, 2vw, 24px)", color: "var(--text)", maxWidth: "800px", margin: "0 auto 40px", fontWeight: "600", border: "2px solid black", padding: "24px", backgroundColor: "white", boxShadow: "6px 6px 0 var(--border)" }}>
          A sophisticated analytics platform that moves beyond binary grading. StudyDB synthesizes multidimensional student data to decode the cognitive patterns driving academic outcomes.
        </p>
        <button 
          className="brutal-btn" 
          onClick={onLoginClick}
          style={{ padding: "20px 48px", fontSize: "24px", backgroundColor: "var(--text)", color: "white", transform: "scale(1.05)" }}
        >
          Initialize Platform
        </button>
      </section>

      {/* Enterprise Methodology Section */}
      <section className="animate-fade-in-up delay-200" style={{ marginBottom: "120px", border: "2px solid var(--border)", backgroundColor: "white", padding: "60px", position: "relative" }}>
        <div style={{ position: "absolute", top: "-16px", left: "40px", backgroundColor: "var(--primary)", color: "white", padding: "4px 16px", fontWeight: "bold", border: "2px solid var(--border)" }}>
          CORE METHODOLOGY
        </div>
        
        <div style={{ textAlign: "left", maxWidth: "900px" }}>
          <h3 style={{ fontSize: "40px", margin: "0 0 24px", textTransform: "uppercase", letterSpacing: "-1px" }}>The Behavioral Evaluation Matrix</h3>
          <p style={{ fontSize: "20px", color: "#334155", lineHeight: "1.8", margin: "0 0 32px", fontWeight: "500" }}>
            Traditional assessment models suffer from a fundamental flaw: they evaluate the destination while ignoring the journey. StudyDB leverages an advanced, proprietary methodology known as the Behavioral Evaluation Matrix to perform high-fidelity cognitive analysis.
          </p>
          <p style={{ fontSize: "20px", color: "#334155", lineHeight: "1.8", margin: "0 0 40px", fontWeight: "500" }}>
            By continuously tracking temporal execution data (latency) against absolute correctness (accuracy) at the millisecond level, our engine maps performance onto a multidimensional plane. This allows institutional stakeholders to isolate anomalous behavior profiles—identifying the exact moment a student transitions from methodological processing to reckless guessing—enabling preemptive, surgical intervention.
          </p>
          
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "200px", borderLeft: "4px solid var(--primary)", paddingLeft: "16px" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "18px", textTransform: "uppercase" }}>Temporal Tracking</h4>
              <p style={{ margin: 0, color: "#64748b", fontSize: "16px" }}>Millisecond-precision monitoring of cognitive latency vs expected baselines.</p>
            </div>
            <div style={{ flex: 1, minWidth: "200px", borderLeft: "4px solid var(--primary)", paddingLeft: "16px" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "18px", textTransform: "uppercase" }}>Graph Synthesis</h4>
              <p style={{ margin: 0, color: "#64748b", fontSize: "16px" }}>Neo4j-powered mapping of conceptual dependencies across entire cohorts.</p>
            </div>
            <div style={{ flex: 1, minWidth: "200px", borderLeft: "4px solid var(--primary)", paddingLeft: "16px" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "18px", textTransform: "uppercase" }}>Predictive Analytics</h4>
              <p style={{ margin: 0, color: "#64748b", fontSize: "16px" }}>Algorithmic identification of failure patterns prior to terminal assessment.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Value Section */}
      <section className="animate-fade-in-up delay-300" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "40px", marginBottom: "120px" }}>
        <div className="brutal-card animate-float" style={{ padding: "40px", animationDelay: "0s" }}>
          <h3 style={{ fontSize: "28px", margin: "0 0 24px", textTransform: "uppercase" }}>For Institutional Faculty</h3>
          <ul style={{ paddingLeft: "24px", fontSize: "18px", display: "flex", flexDirection: "column", gap: "16px", margin: 0, fontWeight: "500", color: "#334155" }}>
            <li><b>Automated Architecture:</b> Vectorize existing curriculum PDFs to instantly deploy dynamic, standard-aligned assessments.</li>
            <li><b>Cohort Analytics:</b> Aggregate high-density graph data to visualize macroscopic competency trends.</li>
            <li><b>Surgical Intervention:</b> Receive automated diagnostic reports isolating individual knowledge deficits.</li>
          </ul>
        </div>
        
        <div className="brutal-card animate-float" style={{ padding: "40px", backgroundColor: "var(--bg)", animationDelay: "1s" }}>
          <h3 style={{ fontSize: "28px", margin: "0 0 24px", textTransform: "uppercase" }}>For The Learner</h3>
          <ul style={{ paddingLeft: "24px", fontSize: "18px", display: "flex", flexDirection: "column", gap: "16px", margin: 0, fontWeight: "500", color: "#334155" }}>
            <li><b>Contextual LLM Assistance:</b> Interact with a localized MCP model trained exclusively on institutional curriculum.</li>
            <li><b>Adaptive Pathways:</b> Algorithmic redirection toward specific sub-topics requiring remediation.</li>
            <li><b>Focus-Optimized UI:</b> High-contrast, accessibility-first interface designed to minimize cognitive load.</li>
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="animate-fade-in-up delay-400" style={{ textAlign: "center", padding: "60px 0 20px", borderTop: "2px solid var(--border)", fontWeight: "bold", fontSize: "14px", color: "#64748b", textTransform: "uppercase" }}>
        <p style={{ margin: 0 }}>Proprietary Technology Stack: Cerebras Cloud Infrastructure • Neo4j Graph Database • Model Context Protocol</p>
        <button 
          onClick={onLoginClick} 
          style={{ background: "none", border: "none", color: "var(--text)", fontWeight: "900", cursor: "pointer", fontSize: "16px", marginTop: "24px", textTransform: "uppercase", padding: "8px 16px", border: "2px solid var(--border)" }}
        >
          Access Portal
        </button>
      </footer>
    </div>
  );
}
