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
