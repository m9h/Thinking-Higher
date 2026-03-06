import { Session, StageTranscript, SessionAssessment, TranscriptEntry, FeedbackScores } from "./types";

// --- Database Interface ---
// Implementations can swap between local JSON storage and Vercel Postgres.

export interface DB {
  saveSession(session: Session): Promise<void>;
  getSession(sessionId: string): Promise<Session | null>;
  updateSession(sessionId: string, updates: Partial<Session>): Promise<void>;
  saveTranscript(sessionId: string, stageId: string, entries: TranscriptEntry[]): Promise<void>;
  getTranscript(sessionId: string, stageId: string): Promise<StageTranscript | null>;
  saveAssessment(sessionId: string, scores: FeedbackScores, responseTimesMs: number[]): Promise<void>;
  getAssessment(sessionId: string): Promise<SessionAssessment | null>;
}

// --- In-Memory Store (server-side, per-process) ---
// Suitable for dev/preview. Swap for Vercel Postgres in production.

const sessions = new Map<string, Session>();
const transcripts = new Map<string, StageTranscript>();
const assessments = new Map<string, SessionAssessment>();

function transcriptKey(sessionId: string, stageId: string) {
  return `${sessionId}:${stageId}`;
}

export const db: DB = {
  async saveSession(session) {
    sessions.set(session.id, { ...session });
  },

  async getSession(sessionId) {
    return sessions.get(sessionId) ?? null;
  },

  async updateSession(sessionId, updates) {
    const existing = sessions.get(sessionId);
    if (existing) {
      sessions.set(sessionId, { ...existing, ...updates });
    }
  },

  async saveTranscript(sessionId, stageId, entries) {
    transcripts.set(transcriptKey(sessionId, stageId), {
      sessionId,
      stageId,
      entries: [...entries],
    });
  },

  async getTranscript(sessionId, stageId) {
    return transcripts.get(transcriptKey(sessionId, stageId)) ?? null;
  },

  async saveAssessment(sessionId, scores, responseTimesMs) {
    assessments.set(sessionId, {
      sessionId,
      scores,
      responseTimesMs,
      completedAt: Date.now(),
    });
  },

  async getAssessment(sessionId) {
    return assessments.get(sessionId) ?? null;
  },
};
