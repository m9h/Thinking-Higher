"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { STAGES, SCENARIO } from "@/lib/scenarios";
import { callLLM } from "@/lib/llm";
import { Assessment, FeedbackScores, TranscriptEntry } from "@/lib/types";
import Sidebar from "./Sidebar";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import FeedbackOverlay from "./FeedbackOverlay";

interface DisplayMessage {
  id: string;
  type: "user" | "ai" | "system";
  sender: string;
  text: string;
  color: string;
  avatar: string;
}

// --- Persistence helpers (fire-and-forget to API) ---

async function apiCreateSession(scenarioId: string): Promise<{ id: string; participantId: string }> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "createSession", scenarioId }),
  });
  const data = await res.json();
  return data.session;
}

async function apiSaveTranscript(sessionId: string, stageId: string, entries: TranscriptEntry[]) {
  await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "saveTranscript", sessionId, stageId, entries }),
  });
}

async function apiSaveAssessment(sessionId: string, scores: FeedbackScores, responseTimesMs: number[]) {
  await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "saveAssessment", sessionId, scores, responseTimesMs }),
  });
}

export default function Simulation() {
  const [started, setStarted] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<
    { role: string; content: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stageMessageCount, setStageMessageCount] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [showNextBar, setShowNextBar] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackScores, setFeedbackScores] = useState<FeedbackScores | null>(
    null
  );
  const [isTyping, setIsTyping] = useState(false);
  const [readOnly, setReadOnly] = useState(false);

  const savedMessagesRef = useRef<Record<number, DisplayMessage[]>>({});
  const savedHistoryRef = useRef<Record<number, { role: string; content: string }[]>>({});
  const allAssessmentsRef = useRef<Assessment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgIdCounter = useRef(0);

  // Persistence refs
  const sessionIdRef = useRef<string | null>(null);
  const stageTranscriptRef = useRef<TranscriptEntry[]>([]);

  const nextMsgId = () => `msg-${++msgIdCounter.current}`;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const addSystemMessage = useCallback(
    (text: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: nextMsgId(),
          type: "system",
          sender: "System",
          text,
          color: "var(--system)",
          avatar: "S",
        },
      ]);
    },
    []
  );

  const getAIOpener = useCallback(
    async (stageIndex: number) => {
      const stage = STAGES[stageIndex];
      setIsLoading(true);
      setIsTyping(true);

      try {
        const text = await callLLM({
          system: stage.systemPrompt,
          messages: [
            {
              role: "user",
              content:
                "[Start the conversation with your opening message.]",
            },
          ],
        });

        const now = Date.now();
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: nextMsgId(),
            type: "ai",
            sender: stage.name,
            text,
            color: stage.color,
            avatar: stage.avatar,
          },
        ]);
        setConversationHistory([{ role: "assistant", content: text }]);

        // Record opener in transcript
        stageTranscriptRef.current.push({
          role: "assistant",
          content: text,
          timestamp: now,
          responseTimeMs: null,
        });
      } catch {
        setIsTyping(false);
        const fallbacks = [
          "Hey! Glad we could sync before you dive in. I wanted to walk you through the onboarding form designs.",
          "Hey, I was just going through your PR for the onboarding form — got a few minutes to chat? I spotted something.",
          "Hey! Alex mentioned you had an update on the onboarding feature?",
        ];
        const text = fallbacks[stageIndex];
        const now = Date.now();
        setMessages((prev) => [
          ...prev,
          {
            id: nextMsgId(),
            type: "ai",
            sender: stage.name,
            text,
            color: stage.color,
            avatar: stage.avatar,
          },
        ]);
        setConversationHistory([{ role: "assistant", content: text }]);

        stageTranscriptRef.current.push({
          role: "assistant",
          content: text,
          timestamp: now,
          responseTimeMs: null,
        });
      }

      setIsLoading(false);
    },
    []
  );

  const loadStage = useCallback(
    (stageIndex: number) => {
      setCurrentStage(stageIndex);
      setStageMessageCount(0);
      setShowNextBar(false);
      setReadOnly(false);
      setMessages([]);
      setConversationHistory([]);
      stageTranscriptRef.current = [];

      addSystemMessage(
        `Starting conversation with ${STAGES[stageIndex].name} (${STAGES[stageIndex].role})`
      );
      getAIOpener(stageIndex);
    },
    [addSystemMessage, getAIOpener]
  );

  const startSimulation = useCallback(async () => {
    setStarted(true);

    // Create session in persistence layer
    try {
      const session = await apiCreateSession(SCENARIO.id);
      sessionIdRef.current = session.id;
    } catch {
      // Persistence failure shouldn't block the simulation
      console.warn("Failed to create session — continuing without persistence");
    }

    loadStage(0);
  }, [loadStage]);

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const stage = STAGES[currentStage];
    const sendTimestamp = Date.now();
    setInputValue("");
    const newCount = stageMessageCount + 1;
    setStageMessageCount(newCount);

    setMessages((prev) => [
      ...prev,
      {
        id: nextMsgId(),
        type: "user",
        sender: "You",
        text,
        color: "var(--accent)",
        avatar: "Y",
      },
    ]);

    // Record user message in transcript
    stageTranscriptRef.current.push({
      role: "user",
      content: text,
      timestamp: sendTimestamp,
      responseTimeMs: null,
    });

    const newHistory = [...conversationHistory, { role: "user", content: text }];
    setConversationHistory(newHistory);

    setIsLoading(true);
    setIsTyping(true);

    const recentHistory = newHistory.slice(-6);
    const stageDefinition = SCENARIO.stages[currentStage];

    try {
      const isLastExchange = newCount >= stageDefinition.turnConfig.wrapUpSignalTurn;
      const systemPrompt =
        stage.systemPrompt +
        (isLastExchange
          ? " After this message, naturally signal the conversation is wrapping up. Do not force-end abruptly."
          : "");

      const reply = await callLLM({ system: systemPrompt, messages: recentHistory });
      const responseTimeMs = Date.now() - sendTimestamp;

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: nextMsgId(),
          type: "ai",
          sender: stage.name,
          text: reply,
          color: stage.color,
          avatar: stage.avatar,
        },
      ]);
      setConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);

      allAssessmentsRef.current.push({
        stage: stage.name,
        userMessage: text,
        aiReply: reply,
        responseTimeMs,
      });

      // Record AI reply in transcript
      stageTranscriptRef.current.push({
        role: "assistant",
        content: reply,
        timestamp: Date.now(),
        responseTimeMs,
      });

      if (newCount >= stageDefinition.turnConfig.minTurns) setShowNextBar(true);
    } catch {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: nextMsgId(),
          type: "ai",
          sender: stage.name,
          text: "Let's continue this after the review.",
          color: stage.color,
          avatar: stage.avatar,
        },
      ]);
      if (newCount >= stageDefinition.turnConfig.minTurns) setShowNextBar(true);
    }

    setIsLoading(false);
  }, [inputValue, isLoading, currentStage, stageMessageCount, conversationHistory]);

  const generateFeedback = useCallback(async () => {
    setSimulationComplete(true);
    setShowFeedback(true);

    const conversationSummary = allAssessmentsRef.current
      .map((a) => `[${a.stage}] Student said: "${a.userMessage}"`)
      .join("\n");

    try {
      const raw = await callLLM({
        system: SCENARIO.assessmentConfig.evaluatorPrompt,
        messages: [
          {
            role: "user",
            content: `Here are the student's responses across 3 stages of a workplace simulation:\n\n${conversationSummary}\n\nEvaluate their higher-order thinking and communication skills.`,
          },
        ],
      });
      const clean = raw.replace(/```json|```/g, "").trim();
      const scores: FeedbackScores = JSON.parse(clean);
      setFeedbackScores(scores);

      // Persist assessment
      if (sessionIdRef.current) {
        const rts = allAssessmentsRef.current.map((a) => a.responseTimeMs);
        apiSaveAssessment(sessionIdRef.current, scores, rts).catch(() => {});
      }
    } catch {
      const fallbackScores: FeedbackScores = {
        analytical: 72,
        communication: 68,
        ownership: 75,
        adaptability: 70,
        feedback:
          "You navigated three distinct stakeholder conversations under pressure. Your ability to adapt your communication style across technical and non-technical audiences is a strong foundation to build on.",
      };
      setFeedbackScores(fallbackScores);

      if (sessionIdRef.current) {
        const rts = allAssessmentsRef.current.map((a) => a.responseTimeMs);
        apiSaveAssessment(sessionIdRef.current, fallbackScores, rts).catch(() => {});
      }
    }
  }, []);

  const advanceStage = useCallback(() => {
    savedMessagesRef.current[currentStage] = messages;
    savedHistoryRef.current[currentStage] = conversationHistory;

    // Persist stage transcript
    if (sessionIdRef.current) {
      const stageId = STAGES[currentStage].id;
      apiSaveTranscript(sessionIdRef.current, stageId, stageTranscriptRef.current).catch(() => {});
    }

    if (currentStage < 2) {
      loadStage(currentStage + 1);
    } else {
      generateFeedback();
    }
  }, [currentStage, messages, conversationHistory, loadStage, generateFeedback]);

  const reviewStage = useCallback(
    (stageIndex: number) => {
      setShowFeedback(false);
      setCurrentStage(stageIndex);
      setReadOnly(true);
      setShowNextBar(true);

      const saved = savedMessagesRef.current[stageIndex];
      if (saved) {
        setMessages([
          ...saved,
          {
            id: nextMsgId(),
            type: "system",
            sender: "System",
            text: "Reviewing past conversation — read only",
            color: "var(--system)",
            avatar: "S",
          },
        ]);
      }
    },
    []
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const stage = STAGES[currentStage];

  // Start screen
  if (!started) {
    return (
      <div className="start-screen" id="startScreen">
        <div className="start-card">
          <div className="start-tag">Junior SDE · Simulation #{SCENARIO.id}</div>
          <h1 className="start-title">
            From requirements
            <br />
            to a <em>real problem.</em>
          </h1>
          <p className="start-desc">
            {SCENARIO.description}
          </p>
          <div className="start-stages">
            {STAGES.map((s) => (
              <div key={s.id} className="start-stage">
                <div
                  className="start-stage-dot"
                  style={{ background: s.color }}
                />
                <span className="start-stage-name">{s.name}</span>
                <span className="start-stage-desc">
                  {s.role} — {s.desc.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
          <button className="start-btn" onClick={startSimulation}>
            Begin Simulation →
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Top Bar */}
      <div className="topbar">
        <div className="logo">
          Think<span>Higher</span>
        </div>
        <div className="scenario-title">
          Scenario {SCENARIO.id} — &quot;{SCENARIO.title}&quot;
        </div>
        <div className="stage-indicators">
          {STAGES.map((_, i) => {
            const classes = [
              "stage-dot",
              i < currentStage || simulationComplete ? "done" : "",
              i === currentStage ? "active" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return <div key={i} className={classes} data-stage={i} />;
          })}
        </div>
      </div>

      {/* Main */}
      <div className="main">
        <Sidebar
          currentStage={currentStage}
          simulationComplete={simulationComplete}
          onReviewStage={reviewStage}
        />

        <div className="chat-area">
          <div className="stage-header">
            <div
              className="stage-badge"
              style={{
                background: `${stage.color}22`,
                color: stage.color,
                border: `1px solid ${stage.color}44`,
              }}
            >
              {stage.badge}
              {readOnly ? " · Review" : ""}
            </div>
            <div className="stage-desc">{stage.desc}</div>
          </div>

          <div className="messages">
            {messages.map((msg) =>
              msg.type === "system" ? (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    margin: "4px 0",
                  }}
                >
                  <div className="system-bubble">{msg.text}</div>
                </div>
              ) : (
                <MessageBubble
                  key={msg.id}
                  sender={msg.sender}
                  text={msg.text}
                  color={msg.color}
                  avatarLetter={msg.avatar}
                  isUser={msg.type === "user"}
                />
              )
            )}
            {isTyping && (
              <TypingIndicator
                color={stage.color}
                avatar={stage.avatar}
                name={stage.name}
              />
            )}
            <div ref={messagesEndRef} />
          </div>

          {showNextBar && (
            <div className="next-stage-bar visible">
              <div className="next-stage-hint">
                {readOnly ? (
                  <span>
                    <em>Read-only review mode.</em> Click any name in the
                    sidebar to switch stages.
                  </span>
                ) : stageMessageCount >= SCENARIO.stages[currentStage].turnConfig.wrapUpSignalTurn ? (
                  <span>
                    <em>Conversation is wrapping up.</em> Continue or move to the
                    next stage when ready.
                  </span>
                ) : (
                  "Feel free to keep the conversation going, or move on when ready."
                )}
              </div>
              {readOnly ? (
                <button
                  className="next-stage-btn finish-btn"
                  onClick={() => setShowFeedback(true)}
                >
                  View Feedback
                </button>
              ) : currentStage < 2 ? (
                <button className="next-stage-btn" onClick={advanceStage}>
                  Next Stage →
                </button>
              ) : (
                <button
                  className="next-stage-btn finish-btn"
                  onClick={advanceStage}
                >
                  Finish & See Feedback
                </button>
              )}
            </div>
          )}

          <div className="input-area">
            <div className="input-row">
              <textarea
                ref={inputRef}
                className="input-box"
                placeholder={
                  readOnly
                    ? "Read-only — simulation complete"
                    : "Type your response..."
                }
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKey}
                disabled={isLoading || readOnly}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  el.style.height =
                    Math.min(el.scrollHeight, 120) + "px";
                }}
              />
              <button
                className="send-btn"
                onClick={sendMessage}
                disabled={isLoading || readOnly}
              >
                Send →
              </button>
            </div>
            <div className="input-hint">
              This is a simulation. Respond as you would in a real workplace.
            </div>
          </div>
        </div>
      </div>

      <FeedbackOverlay
        visible={showFeedback}
        scores={feedbackScores}
        onClose={() => {
          setShowFeedback(false);
          if (simulationComplete) reviewStage(currentStage);
        }}
      />
    </>
  );
}
