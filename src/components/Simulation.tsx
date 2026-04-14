"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { STAGES, SCENARIO } from "@/lib/scenarios";
import { callLLM } from "@/lib/llm";
import { Assessment, FeedbackScores, TranscriptEntry, ChatTrialData, TaskSummary } from "@/lib/types";
import Link from "next/link";
import Sidebar from "./Sidebar";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import FeedbackOverlay from "./FeedbackOverlay";
import VideoMeeting from "./VideoMeeting";
import ComprehensionCheck from "./ComprehensionCheck";
import ArtifactPanel from "./ArtifactPanel";
import SituationBrief from "./SituationBrief";

interface DisplayMessage {
  id: string;
  type: "user" | "ai" | "system";
  sender: string;
  text: string;
  color: string;
  avatar: string;
}

type StagePhase = "video" | "chat" | "quiz";

// --- Persistence helpers (fire-and-forget) ---

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

interface SimulationProps {
  onComplete?: (trials: ChatTrialData[], summary: TaskSummary) => void;
}

const ICON_OPTIONS = ["🧑‍💻", "👩‍💻", "👨‍💻", "🦊", "🐼", "🦁", "🌟", "🚀", "🎯", "⚡", "🌊", "🔥"];

export default function Simulation({ onComplete }: SimulationProps = {}) {
  const [userProfile, setUserProfile] = useState<{ name: string; icon: string } | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileIcon, setProfileIcon] = useState("🧑‍💻");
  const [started, setStarted] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [stagePhase, setStagePhase] = useState<StagePhase>("video");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stageMessageCount, setStageMessageCount] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [showNextBar, setShowNextBar] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set());
  const [visitedStages, setVisitedStages] = useState<Set<number>>(new Set([0]));
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackScores, setFeedbackScores] = useState<FeedbackScores | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [readOnly, setReadOnly] = useState(false);

  const savedMessagesRef = useRef<Record<number, DisplayMessage[]>>({});
  const savedHistoryRef = useRef<Record<number, { role: string; content: string }[]>>({});
  const allAssessmentsRef = useRef<Assessment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgIdCounter = useRef(0);

  const sessionIdRef = useRef<string | null>(null);
  const stageTranscriptRef = useRef<TranscriptEntry[]>([]);
  const simulationStartRef = useRef<number>(0);

  const nextMsgId = () => `msg-${++msgIdCounter.current}`;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const addSystemMessage = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: nextMsgId(), type: "system", sender: "System", text, color: "var(--system)", avatar: "S" },
    ]);
  }, []);

  const getAIOpener = useCallback(async (stageIndex: number) => {
    const stage = STAGES[stageIndex];
    setIsLoading(true);
    setIsTyping(true);

    try {
      const text = await callLLM({
        system: stage.systemPrompt,
        messages: [{ role: "user", content: "[Start the conversation with your opening message.]" }],
      });
      const now = Date.now();
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: nextMsgId(), type: "ai", sender: stage.name, text, color: stage.color, avatar: stage.avatar },
      ]);
      setConversationHistory([{ role: "assistant", content: text }]);
      stageTranscriptRef.current.push({ role: "assistant", content: text, timestamp: now, responseTimeMs: null });
    } catch {
      setIsTyping(false);
      const fallbacks = [
        "Alright — any questions before we break?",
        "Hey! So I just finished the prototype — want to walk through it together?",
        "Hey — before you dive in, I want to hear how you're thinking about building this. Walk me through your approach.",
      ];
      const text = fallbacks[stageIndex] ?? "Let's get started.";
      const now = Date.now();
      setMessages((prev) => [
        ...prev,
        { id: nextMsgId(), type: "ai", sender: stage.name, text, color: stage.color, avatar: stage.avatar },
      ]);
      setConversationHistory([{ role: "assistant", content: text }]);
      stageTranscriptRef.current.push({ role: "assistant", content: text, timestamp: now, responseTimeMs: null });
    }
    setIsLoading(false);
  }, []);

  const loadStage = useCallback((stageIndex: number) => {
    const stage = STAGES[stageIndex];
    setCurrentStage(stageIndex);
    setVisitedStages(prev => new Set(prev).add(stageIndex));
    setStageMessageCount(0);
    setShowNextBar(false);
    setReadOnly(false);
    setMessages([]);
    setConversationHistory([]);
    stageTranscriptRef.current = [];

    if (stage.stageType === "video-chat") {
      setStagePhase("video");
      // AI opener will be fetched after video completes
    } else {
      setStagePhase("chat");
      addSystemMessage(`Starting conversation with ${stage.name} (${stage.role})`);
      getAIOpener(stageIndex);
    }
  }, [addSystemMessage, getAIOpener]);

  const startSimulation = useCallback(async () => {
    setStarted(true);
    simulationStartRef.current = Date.now();
    try {
      const session = await apiCreateSession(SCENARIO.id);
      sessionIdRef.current = session.id;
    } catch {
      console.warn("Failed to create session — continuing without persistence");
    }
    loadStage(0);
  }, [loadStage]);

  const handleVideoComplete = useCallback(() => {
    setStagePhase("chat");
    addSystemMessage("Sarah opens the floor for questions.");
    getAIOpener(currentStage);
  }, [currentStage, addSystemMessage, getAIOpener]);

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
      { id: nextMsgId(), type: "user", sender: userName, text, color: "var(--accent)", avatar: userIcon },
    ]);
    stageTranscriptRef.current.push({ role: "user", content: text, timestamp: sendTimestamp, responseTimeMs: null });

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
        (isLastExchange ? " After this message, naturally signal the conversation is wrapping up." : "");

      const reply = await callLLM({ system: systemPrompt, messages: recentHistory });
      const responseTimeMs = Date.now() - sendTimestamp;

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: nextMsgId(), type: "ai", sender: stage.name, text: reply, color: stage.color, avatar: stage.avatar },
      ]);
      setConversationHistory((prev) => [...prev, { role: "assistant", content: reply }]);
      allAssessmentsRef.current.push({ stage: stage.name, userMessage: text, aiReply: reply, responseTimeMs });
      stageTranscriptRef.current.push({ role: "assistant", content: reply, timestamp: Date.now(), responseTimeMs });

      if (newCount >= stageDefinition.turnConfig.minTurns) setShowNextBar(true);
    } catch {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: nextMsgId(), type: "ai", sender: stage.name, text: "Let's continue this shortly.", color: stage.color, avatar: stage.avatar },
      ]);
      if (newCount >= stageDefinition.turnConfig.minTurns) setShowNextBar(true);
    }
    setIsLoading(false);
  }, [inputValue, isLoading, currentStage, stageMessageCount, conversationHistory]);

  const notifyComplete = useCallback((scores: FeedbackScores) => {
    if (!onComplete) return;
    const now = Date.now();
    const trials: ChatTrialData[] = STAGES.map((s, i) => ({
      trialIndex: i,
      startedAt: simulationStartRef.current,
      respondedAt: now,
      rt: now - simulationStartRef.current,
      stimulusOnsetAt: simulationStartRef.current,
      taskType: "chat-simulation" as const,
      stageId: s.id,
      stageName: s.name,
      messageCount: allAssessmentsRef.current.filter((a) => a.stage === s.name).length,
      assessmentScores: i === STAGES.length - 1 ? scores : undefined,
    }));
    const summary: TaskSummary = {
      totalTrials: STAGES.length,
      completedTrials: STAGES.length,
      meanRT: (now - simulationStartRef.current) / STAGES.length,
    };
    onComplete(trials, summary);
  }, [onComplete]);

  const generateFeedback = useCallback(async () => {
    setSimulationComplete(true);
    setShowFeedback(true);

    const conversationSummary = allAssessmentsRef.current
      .map((a) => `[${a.stage}] Student said: "${a.userMessage}"`)
      .join("\n");

    try {
      const raw = await callLLM({
        system: SCENARIO.assessmentConfig.evaluatorPrompt,
        messages: [{
          role: "user",
          content: `Here are the student's responses across 3 stages of the Vela SDE workplace simulation:\n\n${conversationSummary}\n\nEvaluate their higher-order thinking and communication skills.`,
        }],
      });
      const clean = raw.replace(/```json|```/g, "").trim();
      const scores: FeedbackScores = JSON.parse(clean);
      setFeedbackScores(scores);
      notifyComplete(scores);
      if (sessionIdRef.current) {
        apiSaveAssessment(sessionIdRef.current, scores, allAssessmentsRef.current.map((a) => a.responseTimeMs)).catch(() => {});
      }
    } catch {
      const fallbackScores: FeedbackScores = {
        analytical: 72, communication: 68, ownership: 75, adaptability: 70,
        feedback: "You navigated three distinct stakeholder conversations at Vela. Your ability to adapt your communication style across the PM, UX, and tech lead is a strong foundation to build on.",
      };
      setFeedbackScores(fallbackScores);
      notifyComplete(fallbackScores);
      if (sessionIdRef.current) {
        apiSaveAssessment(sessionIdRef.current, fallbackScores, allAssessmentsRef.current.map((a) => a.responseTimeMs)).catch(() => {});
      }
    }
  }, [notifyComplete]);

  // Save transcript + advance to next stage or generate feedback
  const doAdvanceStage = useCallback(() => {
    savedMessagesRef.current[currentStage] = messages;
    savedHistoryRef.current[currentStage] = conversationHistory;
    setCompletedStages(prev => { const n = new Set(prev); n.add(currentStage); return n; });
    if (sessionIdRef.current) {
      apiSaveTranscript(sessionIdRef.current, STAGES[currentStage].id, stageTranscriptRef.current).catch(() => {});
    }
    if (currentStage < STAGES.length - 1) {
      loadStage(currentStage + 1);
    } else {
      generateFeedback();
    }
  }, [currentStage, messages, conversationHistory, loadStage, generateFeedback]);

  const advanceStage = useCallback(() => {
    const stageType = STAGES[currentStage].stageType;
    if (stageType === "video-chat" && stagePhase === "chat") {
      setStagePhase("quiz");
      return;
    }
    doAdvanceStage();
  }, [currentStage, stagePhase, doAdvanceStage]);

  const reviewStage = useCallback((stageIndex: number) => {
    // Save current stage state before leaving
    savedMessagesRef.current[currentStage] = messages;
    savedHistoryRef.current[currentStage] = conversationHistory;

    setShowFeedback(false);
    setCurrentStage(stageIndex);
    setStagePhase("chat");
    setShowNextBar(false);
    stageTranscriptRef.current = [];

    if (simulationComplete) {
      // After Alex finishes — read-only review
      setReadOnly(true);
      const saved = savedMessagesRef.current[stageIndex] ?? [];
      setMessages([
        ...saved,
        { id: nextMsgId(), type: "system", sender: "System", text: "Reviewing past conversation — read only", color: "var(--system)", avatar: "S" },
      ]);
      setConversationHistory(savedHistoryRef.current[stageIndex] ?? []);
      setStageMessageCount(0);
      setShowNextBar(true);
    } else {
      // Mid-simulation — restore conversation and allow chatting
      setReadOnly(false);
      const savedMsgs = savedMessagesRef.current[stageIndex];
      const savedHistory = savedHistoryRef.current[stageIndex];
      if (savedMsgs && savedMsgs.length > 0) {
        setMessages(savedMsgs);
        setConversationHistory(savedHistory ?? []);
        const userCount = savedMsgs.filter((m: DisplayMessage) => m.type === "user").length;
        setStageMessageCount(userCount);
        if (userCount >= SCENARIO.stages[stageIndex].turnConfig.minTurns) setShowNextBar(true);
      } else {
        const stage = STAGES[stageIndex];
        setMessages([]);
        setConversationHistory([]);
        setStageMessageCount(0);
        addSystemMessage(`Starting conversation with ${stage.name} (${stage.role})`);
        getAIOpener(stageIndex);
      }
    }
  }, [currentStage, messages, conversationHistory, simulationComplete, addSystemMessage, getAIOpener]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const stage = STAGES[currentStage];
  const stageType = stage.stageType;
  const userName = userProfile?.name ?? "You";
  const userIcon = userProfile?.icon ?? "🧑‍💻";

  // --- Profile setup screen ---
  if (!userProfile) {
    return (
      <div className="start-screen">
        <div className="start-card">
          <div className="start-tag">Before We Begin</div>
          <h1 className="start-title">Who are <em>you?</em></h1>
          <p className="start-desc">We'll use your name and icon to personalize the simulation.</p>

          <div style={{ marginBottom: 24 }}>
            <input
              className="profile-input"
              type="text"
              placeholder="First name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && profileName.trim()) setUserProfile({ name: profileName.trim(), icon: profileIcon }); }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 36 }}>
            <label className="profile-label">Your icon</label>
            <div className="icon-picker" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setProfileIcon(icon)}
                  style={{
                    width: 52, height: 52, borderRadius: 12, fontSize: 26, cursor: "pointer",
                    border: `2px solid ${profileIcon === icon ? "var(--accent)" : "var(--border)"}`,
                    background: profileIcon === icon ? "rgba(240,192,96,0.12)" : "var(--surface2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <button
            className="start-btn"
            disabled={!profileName.trim()}
            onClick={() => setUserProfile({ name: profileName.trim(), icon: profileIcon })}
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // --- Start screen ---
  if (!started) {
    return (
      <div className="start-screen" id="startScreen">
        <div className="start-card">
          <div className="start-tag">Vela SDE Simulation 001</div>
          <h1 className="start-title">
            Build the onboarding module
            <br />
            <em>from scratch.</em>
          </h1>
          <p className="start-desc">{SCENARIO.description}</p>
          <div className="start-stages">
            {STAGES.map((s) => (
              <div key={s.id} className="start-stage">
                <div className="start-stage-dot" style={{ background: s.color }} />
                <span className="start-stage-name">{s.stageTitle}</span>
                <span className="start-stage-desc">{s.desc}</span>
              </div>
            ))}
          </div>
          <button className="start-btn" onClick={startSimulation}>Begin Simulation →</button>
        </div>
      </div>
    );
  }

  // --- Video phase (Stage 1 only) ---
  if (stagePhase === "video") {
    return (
      <>
        <div className="topbar">
          <Link href="/" className="logo" style={{ textDecoration: "none", cursor: "pointer" }}>Think<span>Higher</span></Link>
          <div className="scenario-title">Vela SDE Simulation 001 — Customer Onboarding Sprint</div>
          <StageDots currentStage={currentStage} simulationComplete={simulationComplete} />
        </div>
        <div className="main">
          <Sidebar currentStage={currentStage} simulationComplete={simulationComplete} completedStages={completedStages} visitedStages={visitedStages} onReviewStage={reviewStage} />
          <div className="video-meeting-area">
            {stage.situationBrief && <SituationBrief data={stage.situationBrief} userProfile={userProfile ?? undefined} />}
            <div className="video-meeting-frame">
              <VideoMeeting onComplete={handleVideoComplete} userName={userName} userIcon={userIcon} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- Quiz phase (Stage 1 only) ---
  if (stagePhase === "quiz") {
    const questions = stage.comprehensionQuestions ?? [];
    return (
      <>
        <div className="topbar">
          <Link href="/" className="logo" style={{ textDecoration: "none", cursor: "pointer" }}>Think<span>Higher</span></Link>
          <div className="scenario-title">Vela SDE Simulation 001 — Customer Onboarding Sprint</div>
          <StageDots currentStage={currentStage} simulationComplete={simulationComplete} />
        </div>
        <div className="main">
          <Sidebar currentStage={currentStage} simulationComplete={simulationComplete} completedStages={completedStages} visitedStages={visitedStages} onReviewStage={reviewStage} />
          <div className="comprehension-area">
            {stage.situationBrief && <SituationBrief key={`${currentStage}-quiz`} data={stage.situationBrief} defaultCollapsed userProfile={userProfile ?? undefined} />}
            <div style={{ marginTop: 16, width: "100%", maxWidth: 600 }}>
              <ComprehensionCheck questions={questions} onComplete={doAdvanceStage} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- Chat (and chat-artifact) phase ---
  const hasArtifact = stageType === "chat-artifact" && !!stage.artifactSrc;
  const isQuizPending = stageType === "video-chat" && stagePhase === "chat";

  return (
    <>
      <div className="topbar">
        <Link href="/" className="logo" style={{ textDecoration: "none", cursor: "pointer" }}>Think<span>Higher</span></Link>
        <div className="scenario-title">Vela SDE Simulation 001 — Customer Onboarding Sprint</div>
        <StageDots currentStage={currentStage} simulationComplete={simulationComplete} />
      </div>

      <div className="main">
        <Sidebar currentStage={currentStage} simulationComplete={simulationComplete} completedStages={completedStages} visitedStages={visitedStages} onReviewStage={reviewStage} />

        <div className="chat-area">
          {stage.situationBrief && <SituationBrief key={`${currentStage}-${stagePhase}`} data={stage.situationBrief} defaultCollapsed userProfile={userProfile ?? undefined} />}
          <div className="stage-header">
            <div className="stage-badge" style={{ background: `${stage.color}22`, color: stage.color, border: `1px solid ${stage.color}44` }}>
              {stage.badge}{readOnly ? " · Review" : ""}
            </div>
            <div className="stage-desc">{stage.desc}</div>
          </div>

          <div className="messages">
            {messages.map((msg) =>
              msg.type === "system" ? (
                <div key={msg.id} style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
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
            {isTyping && <TypingIndicator color={stage.color} avatar={stage.avatar} name={stage.name} />}
            <div ref={messagesEndRef} />
          </div>

          {showNextBar && (
            <div className="next-stage-bar visible">
              <div className="next-stage-hint">
                {simulationComplete && readOnly ? (
                  <span><em>Read-only review mode.</em> Click any stage in the sidebar to switch.</span>
                ) : stageMessageCount >= SCENARIO.stages[currentStage].turnConfig.wrapUpSignalTurn ? (
                  <span><em>Conversation is wrapping up.</em> Continue or move on when ready.</span>
                ) : (
                  "Feel free to keep the conversation going, or move on when ready."
                )}
              </div>
              {simulationComplete && readOnly ? (
                <button className="next-stage-btn finish-btn" onClick={() => setShowFeedback(true)}>View Feedback</button>
              ) : isQuizPending ? (
                <button className="next-stage-btn" onClick={advanceStage}>Continue to Quiz →</button>
              ) : currentStage < STAGES.length - 1 ? (
                <button className="next-stage-btn" onClick={advanceStage}>Next Stage →</button>
              ) : (
                <button className="next-stage-btn finish-btn" onClick={advanceStage}>Finish & See Feedback</button>
              )}
            </div>
          )}

          <div className="input-area">
            <div className="input-row">
              <textarea
                ref={inputRef}
                className="input-box"
                placeholder={readOnly ? "Read-only — simulation complete" : "Type your response..."}
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKey}
                disabled={isLoading || readOnly}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
              />
              <button className="send-btn" onClick={sendMessage} disabled={isLoading || readOnly}>Send →</button>
            </div>
          </div>
        </div>

        {hasArtifact && (
          <ArtifactPanel src={stage.artifactSrc!} title="Vela Onboarding Prototype" />
        )}
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

// Extracted to avoid repeating in all render branches
function StageDots({ currentStage, simulationComplete }: { currentStage: number; simulationComplete: boolean }) {
  return (
    <div className="stage-indicators">
      {STAGES.map((_, i) => {
        const classes = [
          "stage-dot",
          i < currentStage || simulationComplete ? "done" : "",
          i === currentStage ? "active" : "",
        ].filter(Boolean).join(" ");
        return <div key={i} className={classes} data-stage={i} />;
      })}
    </div>
  );
}
