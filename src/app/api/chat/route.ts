import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const { system, messages, maxTokens = 1000 } = await req.json();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const mapped = messages.map(
    (m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })
  );

  // Gemini requires conversations to start with "user" role.
  // If history starts with "model" (AI opener), prepend a synthetic user turn.
  const contents =
    mapped.length > 0 && mapped[0].role === "model"
      ? [{ role: "user" as const, parts: [{ text: "[Continue the conversation.]" }] }, ...mapped]
      : mapped;

  try {
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error("Gemini error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Gemini API error" },
        { status: geminiRes.status }
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json(
        { error: "Gemini returned no text", raw: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
