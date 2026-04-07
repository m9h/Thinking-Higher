"use client";

import { STAGES } from "@/lib/scenarios";

interface SidebarProps {
  currentStage: number;
  simulationComplete: boolean;
  completedStages: Set<number>;
  visitedStages: Set<number>;
  onReviewStage: (index: number) => void;
}

export default function Sidebar({ currentStage, simulationComplete, completedStages, visitedStages, onReviewStage }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">Stages</div>
        {STAGES.map((stage, i) => {
          const isDone = completedStages.has(i) || visitedStages.has(i) || simulationComplete;
          const isActive = i === currentStage;
          const classes = [
            "stakeholder",
            isDone ? "done-stakeholder" : "",
            isActive ? "active-stakeholder" : "",
          ].filter(Boolean).join(" ");

          return (
            <div
              key={stage.id}
              className={classes}
              onClick={isDone ? () => onReviewStage(i) : undefined}
            >
              <div
                className="stakeholder-avatar"
                style={{
                  background: isActive ? `${stage.color}22` : "var(--surface2)",
                  color: isActive ? stage.color : "var(--muted)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}
              >
                {(completedStages.has(i) || simulationComplete) ? "✓" : `0${i + 1}`}
              </div>
              <div className="stakeholder-info">
                <div className="stakeholder-name">{stage.stageTitle}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="sidebar-section">
        <div className="context-box">
          <strong>Your Context</strong>
          You are a junior SDE in your second week at Vela, an IT asset
          management company. Your team is building the customer onboarding
          module this sprint — and you&apos;re leading the build.
        </div>
      </div>
    </div>
  );
}
