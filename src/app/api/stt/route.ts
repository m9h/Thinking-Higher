import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const STT_API_KEY = process.env.GOOGLE_STT_API_KEY || "";

// Google Cloud Speech-to-Text v1 — works with API key, no recognizer setup needed
const STT_URL = `https://speech.googleapis.com/v1/speech:recognize?key=${STT_API_KEY}`;

export async function POST(req: NextRequest) {
  try {
    if (!STT_API_KEY) {
      return NextResponse.json({ error: "GOOGLE_STT_API_KEY not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "audio file is required" }, { status: 400 });
    }

    const audioBytes = Buffer.from(await audioFile.arrayBuffer()).toString("base64");

    const sttBody = {
      config: {
        encoding: "WEBM_OPUS",
        sampleRateHertz: 48000,
        languageCode: "en-US",
        model: "latest_long",
        enableAutomaticPunctuation: true,
      },
      audio: { content: audioBytes },
    };

    const sttRes = await fetch(STT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sttBody),
    });

    const data = await sttRes.json();

    if (!sttRes.ok) {
      console.error("Google STT error:", JSON.stringify(data));
      return NextResponse.json(
        { error: data.error?.message || "Google STT error" },
        { status: sttRes.status }
      );
    }

    const transcript: string =
      data.results
        ?.map((r: { alternatives?: { transcript?: string }[] }) =>
          r.alternatives?.[0]?.transcript ?? ""
        )
        .join(" ")
        .trim() ?? "";

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("STT API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "STT error" },
      { status: 500 }
    );
  }
}
