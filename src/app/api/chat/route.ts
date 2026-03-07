import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { system, messages, maxTokens = 2000 } = body;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const mapped = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })
    );

    // Gemini requires conversations to start with "user" role.
    // If history starts with "model" (AI opener), prepend a synthetic user turn.
    let contents = mapped;
    if (mapped.length > 0 && mapped[0].role === "model") {
      contents = [
        { role: "user", parts: [{ text: "[Continue the conversation.]" }] },
        ...mapped,
      ];
    }

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
      console.error("Gemini error:", JSON.stringify(data));
      return NextResponse.json(
        { error: data.error?.message || "Gemini API error" },
        { status: geminiRes.status }
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("Gemini returned no text:", JSON.stringify(data));
      return NextResponse.json(
        { error: "Gemini returned no text" },
        { status: 502 }
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
