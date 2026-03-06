import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Session, FeedbackScores } from "@/lib/types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === "createSession") {
    const { participantId, scenarioId } = body;
    const session: Session = {
      id: generateId(),
      participantId: participantId || generateId(),
      scenarioId,
      startedAt: Date.now(),
      completedAt: null,
      status: "active",
    };
    await db.saveSession(session);
    return NextResponse.json({ session });
  }

  if (action === "saveTranscript") {
    const { sessionId, stageId, entries } = body;
    await db.saveTranscript(sessionId, stageId, entries);
    return NextResponse.json({ ok: true });
  }

  if (action === "saveAssessment") {
    const { sessionId, scores, responseTimesMs } = body as {
      sessionId: string;
      scores: FeedbackScores;
      responseTimesMs: number[];
    };
    await db.saveAssessment(sessionId, scores, responseTimesMs);
    await db.updateSession(sessionId, {
      status: "completed",
      completedAt: Date.now(),
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const session = await db.getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const assessment = await db.getAssessment(sessionId);
  return NextResponse.json({ session, assessment });
}
