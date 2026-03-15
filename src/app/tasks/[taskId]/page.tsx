import { redirect, notFound } from "next/navigation";
import TaskOrchestrator from "@/components/tasks/TaskOrchestrator";
import banditConfig from "@/data/tasks/bandit-2arm.json";
import arcConfig from "@/data/tasks/arc-grid.json";

const TASK_CONFIGS: Record<string, any> = {
  "bandit-2arm": banditConfig,
  "arc-grid": arcConfig,
};

interface TaskPageProps {
  params: Promise<{ taskId: string }>;
}

export default async function TaskPage({ params }: TaskPageProps) {
  const { taskId } = await params;

  if (taskId === "chat-simulation") {
    redirect("/simulation");
  }

  const config = TASK_CONFIGS[taskId];

  if (!config) {
    notFound();
  }

  return <TaskOrchestrator config={config} />;
}
