"use client";

import { STAGES } from "@/lib/scenarios";

interface SidebarProps {
  currentStage: number;
  simulationComplete: boolean;
  onReviewStage: (index: number) => void;
}

const stakeholderStyles: Record<string, { bg: string; color: string }> = {
  marcus: { bg: "rgba(240,144,96,0.15)", color: "var(--marcus)" },
  alex: { bg: "rgba(96,168,240,0.15)", color: "var(--alex)" },
  sarah: { bg: "rgba(200,144,240,0.15)", color: "var(--sarah)" },
};

export default function Sidebar({
  currentStage,
  simulationComplete,
  onReviewStage,
}: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">Stakeholders</div>
        {STAGES.map((stage, i) => {
          const style = stakeholderStyles[stage.id];
          const isDone = i < currentStage || simulationComplete;
          const isActive = i === currentStage;
          const classes = [
            "stakeholder",
            isDone ? "done-stakeholder" : "",
            isActive ? "active-stakeholder" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              key={stage.id}
              className={classes}
              onClick={isDone ? () => onReviewStage(i) : undefined}
            >
              <div
                className="stakeholder-avatar"
                style={{ background: style.bg, color: style.color }}
              >
                {stage.avatar}
              </div>
              <div className="stakeholder-info">
                <div className="stakeholder-name">{stage.name}</div>
                <div className="stakeholder-role">{stage.role}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="sidebar-section">
        <div className="sidebar-label">Your Context</div>
        <div className="context-box">
          <strong>Situation</strong>
          You are a junior SDE, 3 months in. You&apos;ve been assigned to build a
          new user onboarding form. Start by syncing with Marcus (UX) to
          understand the design, then work through what comes next.
        </div>
      </div>
    </div>
  );
}
