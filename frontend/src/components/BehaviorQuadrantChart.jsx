import { useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const QUADRANT_INFO = {
  optimal: {
    label: "Optimal",
    sub: "Fast & Right",
    color: "#22c55e",
    description: "High accuracy with a fast response time. This pattern points to real mastery and fluency.",
  },
  methodical: {
    label: "Methodical",
    sub: "Slow & Right",
    color: "#4f46e5",
    description: "High accuracy but a slower response time. The learner is reasoning through the problem step by step.",
  },
  reckless: {
    label: "Reckless",
    sub: "Fast & Wrong",
    color: "#f97316",
    description: "Low accuracy with a fast response time. Usually a sign of guessing or rushing.",
  },
  struggling: {
    label: "Struggling",
    sub: "Slow & Wrong",
    color: "#ef4444",
    description: "Low accuracy with a slow response time. This usually signals a real gap in foundational understanding.",
  },
};

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  const info = QUADRANT_INFO[payload.behavior] || QUADRANT_INFO.optimal;
  const r = payload.overlapCount > 1 ? 9 : 6;
  
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={info.color} stroke="var(--border)" strokeWidth={2} />
      {payload.overlapCount > 1 && (
        <text x={cx} y={cy} textAnchor="middle" dy=".3em" fill="#fff" fontSize={10} fontWeight="bold">
          {payload.overlapCount}
        </text>
      )}
    </g>
  );
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  const info = QUADRANT_INFO[p.behavior] || QUADRANT_INFO.optimal;
  return (
    <div
      style={{
        background: "var(--text)",
        color: "#fff",
        padding: "10px 14px",
        borderRadius: "6px",
        fontSize: "12px",
        maxWidth: "240px",
        boxShadow: "4px 4px 0px rgba(0,0,0,1)",
        border: "2px solid var(--border)",
        zIndex: 1000
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: "4px" }}>{p.topic}</div>
      <div style={{ color: "#cbd5e1", marginBottom: "4px" }}>
        {p.time_taken}s (Expected: {p.expected_time_seconds}s)
      </div>
      <div style={{ color: "#cbd5e1", marginBottom: "4px" }}>
        {p.is_correct ? "Correct" : "Incorrect"}
        {p.overlapCount > 1 && <span style={{ color: "#fbbf24", marginLeft: "4px" }}>({p.overlapCount} overlaps)</span>}
      </div>
      <div style={{ color: info.color, fontWeight: 700, marginTop: "4px" }}>
        {info.label} ({info.sub})
      </div>
    </div>
  );
}

export default function BehaviorQuadrantChart({ responses, onSelectBehavior }) {
  const [activeInfo, setActiveInfo] = useState(null);

  const rawPoints = (responses || []).filter(
    (q) => q.status !== "skipped" && typeof q.time_taken === "number" && typeof q.expected_time_seconds === "number"
  );

  const countKey = (q) => `${q.is_correct ? 1 : 0}:${Math.round((q.time_taken / Math.max(q.expected_time_seconds, 1)) * 100)}`;
  const counts = new Map();
  for (const q of rawPoints) {
    const key = countKey(q);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const points = rawPoints.map((q) => {
    // We use relative time on X axis so the physical quadrants match the data exactly!
    const relativeTime = q.time_taken / Math.max(q.expected_time_seconds, 1);
    return {
      ...q,
      x: relativeTime,
      y: q.is_correct ? 1 : 0,
      overlapCount: counts.get(countKey(q)),
    };
  });

  if (points.length === 0) {
    return (
      <div className="brutal-card" style={{ background: "#f1f5f9", textAlign: "center" }}>
        <p style={{ margin: 0, fontWeight: "600" }}>No answered questions to plot yet.</p>
      </div>
    );
  }

  const maxX = Math.max(...points.map((p) => p.x), 2.0);
  const xMax = Math.ceil(maxX * 1.2 * 10) / 10; 

  return (
    <div className="brutal-card" style={{ padding: "24px 16px 16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "8px",
          paddingInline: "16px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "18px", textTransform: "uppercase" }}>Speed vs. Accuracy</h3>
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>
          {points.length} question{points.length !== 1 ? "s" : ""}
        </span>
      </div>

      <p style={{ margin: "0 0 16px", paddingInline: "16px", fontSize: "12px", color: "#64748b" }}>
        The X-axis shows <strong>Relative Time</strong> (Time Taken / Expected Time). A value of 1.0 means exactly expected time.
        <br />
        <span style={{ color: "var(--primary)", fontWeight: "700" }}>Click on a specific category below to review questions from that category.</span>
      </p>

      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 10 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />

          {/* Top Left: Optimal (Green) */}
          <ReferenceArea x1={0} x2={1.0} y1={0.5} y2={1.5} fill="#bbf7d0" fillOpacity={0.6} />
          {/* Top Right: Methodical (Blue) */}
          <ReferenceArea x1={1.0} x2={xMax} y1={0.5} y2={1.5} fill="#e0e7ff" fillOpacity={0.6} />
          {/* Bottom Left: Reckless (Orange) */}
          <ReferenceArea x1={0} x2={1.0} y1={-0.5} y2={0.5} fill="#ffedd5" fillOpacity={0.6} />
          {/* Bottom Right: Struggling (Red) */}
          <ReferenceArea x1={1.0} x2={xMax} y1={-0.5} y2={0.5} fill="#fee2e2" fillOpacity={0.6} />

          <ReferenceLine x={1.0} stroke="var(--border)" strokeDasharray="6 4" strokeWidth={2} />
          <ReferenceLine y={0.5} stroke="var(--border)" strokeDasharray="6 4" strokeWidth={2} />

          <XAxis
            type="number"
            dataKey="x"
            domain={[0, xMax]}
            name="Relative Time"
            tick={{ fontSize: 12, fill: "var(--border)", fontWeight: "600" }}
            label={{ value: "Relative Time (1.0 = Expected Time)", position: "bottom", offset: 10, fontSize: 13, fontWeight: 700, fill: "var(--text)" }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[-0.5, 1.5]}
            ticks={[0, 1]}
            tickFormatter={(v) => (v === 1 ? "Right" : v === 0 ? "Wrong" : "")}
            tick={{ fontSize: 12, fill: "var(--border)", fontWeight: "600" }}
            width={60}
          />
          <ZAxis range={[80, 80]} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "var(--border)", strokeWidth: 2 }} />

          <Scatter data={points} shape={<CustomDot />} />
        </ScatterChart>
      </ResponsiveContainer>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          paddingTop: "20px",
          borderTop: "4px solid var(--border)",
          marginTop: "12px",
        }}
      >
        {Object.entries(QUADRANT_INFO).map(([key, info]) => (
          <div
            key={key}
            onClick={() => onSelectBehavior && onSelectBehavior(key)}
            onMouseEnter={() => setActiveInfo(key)}
            onMouseLeave={() => setActiveInfo(null)}
            style={{
              padding: "12px",
              borderRadius: "var(--radius)",
              border: "3px solid var(--border)",
              boxShadow: activeInfo === key ? "4px 4px 0px rgba(0,0,0,1)" : "none",
              transform: activeInfo === key ? "translate(-2px, -2px)" : "none",
              transition: "all 0.2s ease",
              background: "var(--white)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: info.color,
                  border: "2px solid var(--border)",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <strong style={{ fontSize: "14px", textTransform: "uppercase" }}>
                {info.label} <span style={{ color: "#64748b", fontWeight: 700 }}>({info.sub})</span>
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text)", fontWeight: "500", lineHeight: 1.5 }}>{info.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
