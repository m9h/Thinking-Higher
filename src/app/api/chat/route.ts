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

  const { system, messages, maxTokens = 2000 } = await req.json();

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
        generationConfig: {
          maxOutputTokens: maxTokens,
          // Gemini 2.5 Flash uses "thinking" tokens from the output budget.
          // Set a separate thinking budget so output tokens aren't starved.
          thinkingConfig: { thinkingBudget: 1024 },
        },
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

    // Extract text from response, handling cases where thinking tokens
    // consumed the entire budget leaving no output parts.
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("Gemini returned no text:", JSON.stringify(data));
      return NextResponse.json(
        { error: "Gemini returned no text" },
        { status: 502 }
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
