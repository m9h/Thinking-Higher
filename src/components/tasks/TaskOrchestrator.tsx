"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { TaskSummary, BanditTrialData, ARCTrialData } from "@/lib/types";
import TaskInstructions from "./TaskInstructions";
import TaskDebrief from "./TaskDebrief";

interface CognitiveTaskConfig {
  taskId: string;
  taskType: string;
  title: string;
  description: string;
  numTrials: number;
  parameters: Record<string, number>;
  modelType: string;
  instructions: string;
  debrief: string;
}

interface RWFit {
  alpha: number;
  tau: number;
  logLikelihood: number;
  qValuesOverTime: [number, number][];
}

const TwoArmedBandit = dynamic(
  () => import("@/components/tasks/TwoArmedBandit"),
  { loading: () => <LoadingState message="Loading bandit task..." /> }
);

const ARCTask = dynamic(() => import("@/components/tasks/ARCTask"), {
  loading: () => <LoadingState message="Loading puzzle task..." />,
});

function LoadingState({ message }: { message: string }) {
  return (
    <div className="task-container">
      <div className="task-card" style={{ maxWidth: 400, textAlign: "center" }}>
        <div className="task-tag">LOADING</div>
        <p className="task-text">{message}</p>
      </div>
    </div>
  );
}

interface TaskOrchestratorProps {
  config: CognitiveTaskConfig;
}

type Phase = "instructions" | "task" | "debrief";

export default function TaskOrchestrator({ config }: TaskOrchestratorProps) {
  const [phase, setPhase] = useState<Phase>("instructions");
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [trials, setTrials] = useState<any[]>([]);
  const [rwFit, setRwFit] = useState<RWFit | null>(null);
  const taskStartRef = useRef<number>(0);

  const handleStart = useCallback(() => {
    taskStartRef.current = Date.now();
    setPhase("task");
  }, []);

  const handleBanditComplete = useCallback(
    async (banditTrials: BanditTrialData[], taskSummary: TaskSummary) => {
      setTrials(banditTrials);
      setSummary(taskSummary);

      // Run Rescorla-Wagner fitting
      if (banditTrials.length > 0) {
        try {
          const { fitRW } = await import("@/lib/models/rescorla-wagner");
          const fit = fitRW(banditTrials);
          setRwFit(fit);
        } catch (err) {
          console.error("RW fitting failed:", err);
        }
      }

      // Persist results (fire-and-forget)
      fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveTaskResult",
          result: {
            sessionId: "anonymous",
            stageId: config.taskId,
            taskType: config.taskType,
            trials: banditTrials,
            startedAt: taskStartRef.current,
            completedAt: Date.now(),
            summary: taskSummary,
          },
        }),
      }).catch(() => {});

      setPhase("debrief");
    },
    [config.taskId, config.taskType]
  );

  const handleARCComplete = useCallback(
    (arcTrials: ARCTrialData[], taskSummary: TaskSummary) => {
      setTrials(arcTrials);
      setSummary(taskSummary);

      // Persist results (fire-and-forget)
      fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveTaskResult",
          result: {
            sessionId: "anonymous",
            stageId: config.taskId,
            taskType: config.taskType,
            trials: arcTrials,
            startedAt: taskStartRef.current,
            completedAt: Date.now(),
            summary: taskSummary,
          },
        }),
      }).catch(() => {});

      setPhase("debrief");
    },
    [config.taskId, config.taskType]
  );

  const handleContinue = useCallback(() => {
    window.location.href = "/tasks";
  }, []);

  if (phase === "instructions") {
    return (
      <TaskInstructions
        title={config.title}
        instructions={config.instructions}
        onStart={handleStart}
      />
    );
  }

  if (phase === "task") {
    switch (config.taskType) {
      case "two-armed-bandit":
        return (
          <TwoArmedBandit
            numTrials={config.numTrials}
            rewardProbabilities={[
              config.parameters.rewardProb1 ?? 0.7,
              config.parameters.rewardProb2 ?? 0.3,
            ]}
            onComplete={handleBanditComplete}
          />
        );
      case "arc-grid":
        return <ARCTaskWrapper onComplete={handleARCComplete} />;
      default:
        return (
          <div className="task-container">
            <div className="task-card" style={{ maxWidth: 400, textAlign: "center" }}>
              <div className="task-tag">ERROR</div>
              <h1 className="task-title">Unknown Task Type</h1>
              <p className="task-text">
                Task type &quot;{config.taskType}&quot; is not recognized.
              </p>
              <button
                className="start-btn"
                onClick={() => (window.location.href = "/tasks")}
              >
                Back to Tasks
              </button>
            </div>
          </div>
        );
    }
  }

  // Debrief phase
  if (!summary) return null;

  return (
    <TaskDebrief
      title={config.title}
      debriefText={config.debrief}
      summary={summary}
      taskType={config.taskType}
      rwFit={rwFit ?? undefined}
      trials={trials}
      onContinue={handleContinue}
    />
  );
}

// Wrapper that loads puzzles and renders ARCTask
function ARCTaskWrapper({
  onComplete,
}: {
  onComplete: (trials: ARCTrialData[], summary: TaskSummary) => void;
}) {
  const [puzzles, setPuzzles] = useState<null | any[]>(null);

  if (!puzzles) {
    import("@/data/tasks/arc-puzzles.json").then((mod) => {
      setPuzzles(mod.default.puzzles);
    });
    return <LoadingState message="Loading puzzles..." />;
  }

  return <ARCTask puzzles={puzzles} onComplete={onComplete} />;
}
