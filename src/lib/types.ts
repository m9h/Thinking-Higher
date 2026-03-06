// --- Scenario Schema Types ---

export interface SkillDimension {
  key: string;
  label: string;
  weight: number;
}

export interface AssessmentConfig {
  scoringMethod: string;
  skillDimensions: SkillDimension[];
  evaluatorPrompt: string;
}

export interface TurnConfig {
  minTurns: number;
  maxTurns: number;
  wrapUpSignalTurn: number;
}

export interface AgentProfile {
  name: string;
  role: string;
  avatar: string;
  color: string;
  personaPrompt: string;
  assessmentRubric: string;
}

export interface StageDefinition {
  id: string;
  order: number;
  badge: string;
  description: string;
  turnConfig: TurnConfig;
  channelType: "1:1" | "group";
  agentProfile: AgentProfile;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  skillDimensions: string[];
  assessmentConfig: AssessmentConfig;
  systemBase: string;
  stages: StageDefinition[];
}

// --- Legacy-compatible Stage (used by Simulation.tsx) ---

export interface Stage {
  id: string;
  name: string;
  role: string;
  color: string;
  badge: string;
  desc: string;
  avatar: string;
  systemPrompt: string;
}

// --- Chat ---

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface Assessment {
  stage: string;
  userMessage: string;
  aiReply: string;
  responseTimeMs: number;
}

export interface FeedbackScores {
  analytical: number;
  communication: number;
  ownership: number;
  adaptability: number;
  feedback: string;
}

export interface ChatRequest {
  system: string;
  messages: { role: string; content: string }[];
  maxTokens?: number;
}

// --- Persistence Layer Types ---

export interface TranscriptEntry {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  responseTimeMs: number | null;
}

export interface Session {
  id: string;
  participantId: string;
  scenarioId: string;
  startedAt: number;
  completedAt: number | null;
  status: "active" | "completed" | "abandoned";
}

export interface StageTranscript {
  sessionId: string;
  stageId: string;
  entries: TranscriptEntry[];
}

export interface SessionAssessment {
  sessionId: string;
  scores: FeedbackScores;
  responseTimesMs: number[];
  completedAt: number;
}
