import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GOOGLE_STT_API_KEY", "test-key");
});

function makeReqWithAudio(bytes: Uint8Array | null): NextRequest {
  const form = new FormData();
  if (bytes !== null) {
    form.append("audio", new File([bytes as BlobPart], "rec.webm", { type: "audio/webm" }));
  }
  return new NextRequest("http://localhost/api/stt", {
    method: "POST",
    body: form,
  });
}

function googleResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/stt", () => {
  it("returns 500 when GOOGLE_STT_API_KEY is missing", async () => {
    vi.stubEnv("GOOGLE_STT_API_KEY", "");
    const { POST } = await import("./route");
    const res = await POST(makeReqWithAudio(new Uint8Array([1, 2, 3])));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/GOOGLE_STT_API_KEY/);
  });

  it("returns 400 when no audio file is uploaded", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReqWithAudio(null));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/audio file is required/i);
  });

  it("returns the transcript from a single result", async () => {
    fetchMock.mockResolvedValueOnce(
      googleResponse({
        results: [{ alternatives: [{ transcript: "hello world" }] }],
      })
    );
    const { POST } = await import("./route");
    const res = await POST(makeReqWithAudio(new Uint8Array([1, 2, 3])));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.transcript).toBe("hello world");
  });

  it("joins transcripts from multiple results with a space", async () => {
    fetchMock.mockResolvedValueOnce(
      googleResponse({
        results: [
          { alternatives: [{ transcript: "first part" }] },
          { alternatives: [{ transcript: "second part" }] },
        ],
      })
    );
    const { POST } = await import("./route");
    const res = await POST(makeReqWithAudio(new Uint8Array([1, 2, 3])));
    expect((await res.json()).transcript).toBe("first part second part");
  });

  it("returns an empty transcript when Google returns no results", async () => {
    fetchMock.mockResolvedValueOnce(googleResponse({}));
    const { POST } = await import("./route");
    const res = await POST(makeReqWithAudio(new Uint8Array([1, 2, 3])));
    expect(res.status).toBe(200);
    expect((await res.json()).transcript).toBe("");
  });

  it("propagates Google error message and status", async () => {
    fetchMock.mockResolvedValueOnce(
      googleResponse(
        { error: { message: "Invalid audio encoding" } },
        400
      )
    );
    const { POST } = await import("./route");
    const res = await POST(makeReqWithAudio(new Uint8Array([1, 2, 3])));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid audio encoding");
  });

  it("calls Google STT v1 with WEBM_OPUS config and base64 audio", async () => {
    fetchMock.mockResolvedValueOnce(googleResponse({ results: [] }));
    const { POST } = await import("./route");
    await POST(makeReqWithAudio(new Uint8Array([1, 2, 3])));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("speech.googleapis.com/v1/speech:recognize");
    expect(url).toContain("key=test-key");
    const sentBody = JSON.parse(init.body);
    expect(sentBody.config).toMatchObject({
      encoding: "WEBM_OPUS",
      sampleRateHertz: 48000,
      languageCode: "en-US",
      model: "latest_long",
      enableAutomaticPunctuation: true,
    });
    expect(sentBody.audio.content).toBe(Buffer.from([1, 2, 3]).toString("base64"));
  });
});
