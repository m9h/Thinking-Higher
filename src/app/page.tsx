import Link from "next/link";

export default function Home() {
  return (
    <div className="start-screen">
      <div className="start-card">
        <div className="start-tag">COGNITIVE SCIENCE LEARNING PLATFORM</div>
        <h1 className="start-title">
          Think<em>Higher</em>
        </h1>
        <p className="start-desc">
          Play cognitive tasks, see your data modeled in real-time, and learn how
          cognitive science research works — from your own data.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link
            href="/tasks"
            className="start-btn"
            style={{ textDecoration: "none" }}
          >
            Explore Tasks
          </Link>
          <Link
            href="/simulation"
            className="start-btn"
            style={{
              textDecoration: "none",
              background: "transparent",
              border: "1px solid var(--accent)",
              color: "var(--accent)",
            }}
          >
            Try Work Simulation
          </Link>
        </div>
      </div>
    </div>
  );
}
