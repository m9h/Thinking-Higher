import Link from "next/link";

const TASK_CATALOG = [
  {
    id: "bandit-2arm",
    title: "Two-Armed Bandit",
    description:
      "Learn how you balance exploration vs exploitation. Choose between two options with hidden reward rates.",
    duration: "5-8 min",
    category: "Learning & Decision Making",
    icon: "\u{1F3B0}",
  },
  {
    id: "arc-grid",
    title: "ARC Pattern Puzzles",
    description:
      "Solve abstract visual pattern puzzles. Test your fluid intelligence against AI benchmarks.",
    duration: "10-15 min",
    category: "Abstract Reasoning",
    icon: "\u{1F9E9}",
  },
  {
    id: "reversal-learning",
    title: "Reversal Learning",
    description:
      "Can you adapt when the rules change? A 3-arm bandit where the best option flips halfway through.",
    duration: "8-12 min",
    category: "Cognitive Flexibility",
    icon: "\u{1F504}",
  },
  {
    id: "two-step",
    title: "Two-Step Task",
    description:
      "Are you a creature of habit or a strategic planner? Two-stage choices reveal your decision style.",
    duration: "15-20 min",
    category: "Decision Strategy",
    icon: "\u{1F680}",
  },
  {
    id: "hanabi",
    title: "Hanabi",
    description:
      "Cooperative card game with an AI partner. Can you communicate and coordinate when you can't see your own hand?",
    duration: "10-15 min",
    category: "Theory of Mind",
    icon: "\u{1F386}",
  },
  {
    id: "chat-simulation",
    title: "Junior Software Developer Simulation at Vela",
    description:
      "Design a customer onboarding page at Vela and navigate stakeholder conversations. Practice higher-order thinking and communication skills.",
    duration: "15-20 min",
    category: "Communication & Thinking",
    icon: "\u{1F4AC}",
  },
];

export default function TaskCatalogPage() {
  return (
    <div className="task-container">
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <Link
          href="/"
          style={{
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 8,
          }}
        >
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            Think
            <span style={{ color: "var(--accent)", fontStyle: "italic" }}>
              Higher
            </span>
          </h1>
        </Link>
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "0.15em",
            textTransform: "uppercase" as const,
            color: "var(--muted)",
          }}
        >
          Task Catalog
        </p>
      </div>

      <div className="catalog-grid">
        {TASK_CATALOG.map((task) => {
          const href = `/tasks/${task.id}`;
          return (
            <Link key={task.id} href={href} className="catalog-card">
              <div className="catalog-icon">{task.icon}</div>
              <div className="catalog-title">{task.title}</div>
              <div className="catalog-desc">{task.description}</div>
              <div className="catalog-meta">
                <span className="catalog-badge">{task.category}</span>
                <span className="catalog-duration">{task.duration}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
