"use client";

import { FeedbackScores } from "@/lib/types";

interface FeedbackOverlayProps {
  visible: boolean;
  scores: FeedbackScores | null;
  onClose: () => void;
}

const SKILL_NAMES = [
  "Analytical Thinking",
  "Communication",
  "Ownership & Judgment",
  "Adaptability",
];
const SCORE_KEYS: (keyof Omit<FeedbackScores, "feedback">)[] = [
  "analytical",
  "communication",
  "ownership",
  "adaptability",
];

export default function FeedbackOverlay({
  visible,
  scores,
  onClose,
}: FeedbackOverlayProps) {
  if (!visible) return null;

  return (
    <div className="feedback-overlay visible">
      <div className="feedback-card">
        <div className="feedback-title">Simulation Complete</div>
        <div className="feedback-subtitle">
          Higher-order thinking assessment · Scenario 001
        </div>
        <div className="feedback-section">
          <div className="feedback-section-title">Skills Evaluated</div>
          {SKILL_NAMES.map((name, i) => {
            const val = scores ? scores[SCORE_KEYS[i]] : 0;
            return (
              <div key={name} className="skill-bar">
                <span className="skill-name">{name}</span>
                <div className="skill-track">
                  <div
                    className="skill-fill"
                    style={{
                      width: `${val}%`,
                      transitionDelay: `${0.2 * i}s`,
                    }}
                  />
                </div>
                <span className="skill-score">
                  {scores ? val : "—"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="feedback-section">
          <div className="feedback-section-title">Overall Feedback</div>
          <div className="feedback-text">
            {scores?.feedback || "Generating your feedback..."}
          </div>
        </div>
        <button className="close-feedback" onClick={onClose}>
          Close & Review Conversation
        </button>
      </div>
    </div>
  );
}
