"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { RIDGELINE_SCENARIO, RIDGELINE_STAGES } from "@/lib/scenarios-ridgeline";
import { callLLM } from "@/lib/llm";
import { ProbeClassification, ProbeResult, FeedbackScoresV2 } from "@/lib/types";
import Sidebar from "./Sidebar";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ArtifactPanel from "./ArtifactPanel";
import SituationBrief from "./SituationBrief";
import ComprehensionCheck from "./ComprehensionCheck";
import VideoMeetingRidgeline from "./VideoMeetingRidgeline";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DisplayMessage {
  id: string;
  type: "user" | "ai" | "system";
  sender: string;
  text: string;
  color: string;
  avatar: string;
}

type StagePhase = "video" | "chat" | "quiz";

// Director-actor state for Stage 4
interface DirectorState {
  nextProbeIndex: number;       // which probe fires next
  awaitingFollowUp: boolean;    // probe delivered, waiting for student reply
  probeResults: ProbeResult[];  // classification history
  phase: "scripted_probes" | "open_discussion" | "closing";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callEvaluator(studentText: string, evaluatorPrompt: string): Promise<ProbeClassification> {
  try {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentText, evaluatorPrompt }),
    });
    const data = await res.json();
    return data.classification ?? "vague";
  } catch {
    return "vague";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SimulationV2() {
  const scenario = RIDGELINE_SCENARIO;
  const stages = RIDGELINE_STAGES;

  // Profile
  const [userProfile, setUserProfile] = useState<{ name: string; icon: string } | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileIcon, setProfileIcon] = useState("🧑‍💻");

  // Simulation state
  const [started, setStarted] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [stagePhase, setStagePhase] = useState<StagePhase>("chat");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [stageMessageCount, setStageMessageCount] = useState(0);
  const [showNextBar, setShowNextBar] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set());
  const [visitedStages, setVisitedStages] = useState<Set<number>>(new Set([0]));
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackScores, setFeedbackScores] = useState<FeedbackScoresV2 | null>(null);

  // Director-actor state (Stage 4)
  const [directorState, setDirectorState] = useState<DirectorState>({
    nextProbeIndex: 0,
    awaitingFollowUp: false,
    probeResults: [],
    phase: "scripted_probes",
  });

  // Refs
  const savedMessagesRef = useRef<Record<number, DisplayMessage[]>>({});
  const savedHistoryRef = useRef<Record<number, { role: string; content: string }[]>>({});
  const allMessagesRef = useRef<{ stage: string; role: string; text: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgIdCounter = useRef(0);
  const nextMsgId = () => `msg-${++msgIdCounter.current}`;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Message helpers ──────────────────────────────────────────────────────────

  const addAIMessage = useCallback((text: string, stageIndex: number) => {
    const stage = stages[stageIndex];
    setMessages(prev => [...prev, {
      id: nextMsgId(), type: "ai", sender: stage.agent.name,
      text, color: stage.agent.color, avatar: stage.agent.avatar,
    }]);
    setConversationHistory(prev => [...prev, { role: "assistant", content: text }]);
    allMessagesRef.current.push({ stage: stage.id, role: "assistant", text });
  }, [stages]);

  const addSystemMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, {
      id: nextMsgId(), type: "system", sender: "System",
      text, color: "var(--system)", avatar: "S",
    }]);
  }, []);

  // ── AI opener ────────────────────────────────────────────────────────────────

  const getAIOpener = useCallback(async (stageIndex: number) => {
    const stage = stages[stageIndex];
    setIsLoading(true); setIsTyping(true);
    try {
      const text = await callLLM({
        system: stage.agent.personaPrompt,
        messages: [{ role: "user", content: "[Start the conversation with your opening message.]" }],
      });
      setIsTyping(false);
      addAIMessage(text, stageIndex);
    } catch {
      setIsTyping(false);
      const fallbacks: Record<string, string> = {
        kickoff: "Alright, let's get into it.",
        finance: "Here's what I've pulled together — three years of actuals. What questions do you have?",
        enrollment: "Here's the enrollment picture for the last three academic years. What would you like to dig into?",
        presentation: "Alright — before you dive in, walk me through what you found.",
      };
      addAIMessage(fallbacks[stage.id] ?? "Let's get started.", stageIndex);
    }
    setIsLoading(false);
  }, [stages, addAIMessage]);

  // ── Load stage ───────────────────────────────────────────────────────────────

  const loadStage = useCallback((stageIndex: number) => {
    setCurrentStage(stageIndex);
    setVisitedStages(prev => new Set(prev).add(stageIndex));
    setStageMessageCount(0);
    setShowNextBar(false);
    setReadOnly(false);
    setMessages([]);
    setConversationHistory([]);
    const initialPhase = stages[stageIndex].stageType === "video-chat" ? "video" : "chat";
    setStagePhase(initialPhase);
    // Reset director state for Stage 4
    setDirectorState({ nextProbeIndex: 0, awaitingFollowUp: false, probeResults: [], phase: "scripted_probes" });

    const stage = stages[stageIndex];
    if (stage.stageType !== "video-chat") {
      addSystemMessage(`Starting conversation with ${stage.agent.name} (${stage.agent.title})`);
      getAIOpener(stageIndex);
    }
  }, [stages, addSystemMessage, getAIOpener]);

  const startSimulation = useCallback(() => {
    setStarted(true);
    loadStage(0);
  }, [loadStage]);

  // ── Director-actor: Stage 4 message handling ──────────────────────────────

  const handleDirectorActorMessage = useCallback(async (
    userText: string,
    stageIndex: number,
    currentDirectorState: DirectorState,
    currentHistory: { role: string; content: string }[],
  ) => {
    const stage = stages[stageIndex];
    const probes = stage.structuredProbes ?? [];
    const ds = currentDirectorState;

    if (ds.phase === "closing") {
      // No more AI — just show next bar
      setShowNextBar(true);
      return;
    }

    setIsLoading(true); setIsTyping(true);

    if (ds.phase === "scripted_probes") {
      if (ds.awaitingFollowUp) {
        // Student responded to a probe → Actor LLM generates the follow-up
        const probe = probes[ds.nextProbeIndex - 1];
        const systemPrompt = stage.agent.personaPrompt +
          `\n\nFor this specific response, incorporate the following expert framing naturally: ${probe.followUpInstruction}`;
        const recentHistory = [...currentHistory, { role: "user", content: userText }].slice(-6);
        try {
          const reply = await callLLM({ system: systemPrompt, messages: recentHistory });
          setIsTyping(false);
          addAIMessage(reply, stageIndex);
        } catch {
          setIsTyping(false);
          addAIMessage("Let me push on that a bit more.", stageIndex);
        }

        // Check if all probes done → move to open discussion
        const newPhase = ds.nextProbeIndex >= probes.length ? "open_discussion" : "scripted_probes";
        setDirectorState(prev => ({ ...prev, awaitingFollowUp: false, phase: newPhase }));

      } else {
        // Student just spoke → Director evaluates → inject scripted branch
        const probe = probes[ds.nextProbeIndex];
        if (!probe) {
          // No more probes — switch to open discussion
          setDirectorState(prev => ({ ...prev, phase: "open_discussion" }));
          setIsLoading(false); setIsTyping(false);
          return;
        }

        const classification = await callEvaluator(userText, probe.evaluatorPrompt);
        const branchText = probe.branches[classification];

        setIsTyping(false);
        // Small delay so it doesn't feel instant
        await new Promise(r => setTimeout(r, 400));
        setMessages(prev => [...prev, {
          id: nextMsgId(), type: "ai", sender: stage.agent.name,
          text: branchText, color: stage.agent.color, avatar: stage.agent.avatar,
        }]);
        setConversationHistory(prev => [...prev, { role: "assistant", content: branchText }]);
        allMessagesRef.current.push({ stage: stage.id, role: "assistant", text: branchText });

        const newResult: ProbeResult = { probeId: probe.id, topic: probe.topic, classification };
        setDirectorState(prev => ({
          ...prev,
          nextProbeIndex: prev.nextProbeIndex + 1,
          awaitingFollowUp: true,
          probeResults: [...prev.probeResults, newResult],
        }));
      }

    } else if (ds.phase === "open_discussion") {
      // Free Actor LLM — inject probe history into system prompt
      const probeContext = ds.probeResults.map(r =>
        `- ${r.topic}: student was ${r.classification}`
      ).join("\n");
      const systemPrompt = (stage.actorSystemPrompt ?? stage.agent.personaPrompt) +
        `\n\nPROBES DELIVERED:\n${probeContext}`;
      const recentHistory = [...currentHistory, { role: "user", content: userText }].slice(-8);

      try {
        const reply = await callLLM({ system: systemPrompt, messages: recentHistory });
        setIsTyping(false);
        addAIMessage(reply, stageIndex);
      } catch {
        setIsTyping(false);
        addAIMessage("That's an interesting framing. Say more.", stageIndex);
      }
    }

    setIsLoading(false);
  }, [stages, addAIMessage]);

  // ── Standard message send ────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isLoading || readOnly) return;

    const stage = stages[currentStage];
    setInputValue("");
    const newCount = stageMessageCount + 1;
    setStageMessageCount(newCount);

    const userMsg: DisplayMessage = {
      id: nextMsgId(), type: "user",
      sender: userProfile?.name ?? "You",
      text, color: "var(--accent)",
      avatar: userProfile?.icon ?? "🧑‍💻",
    };
    setMessages(prev => [...prev, userMsg]);
    allMessagesRef.current.push({ stage: stage.id, role: "user", text });

    const newHistory = [...conversationHistory, { role: "user", content: text }];
    setConversationHistory(newHistory);

    if (stage.conversationMode === "director-actor") {
      await handleDirectorActorMessage(text, currentStage, directorState, conversationHistory);
      // Show next bar after wrapUpSignalTurn
      if (newCount >= stage.turnConfig.wrapUpSignalTurn) setShowNextBar(true);
    } else {
      // Standard LLM-only mode
      setIsLoading(true); setIsTyping(true);
      const isLast = newCount >= stage.turnConfig.wrapUpSignalTurn;
      const systemPrompt = stage.agent.personaPrompt +
        (isLast ? " Naturally signal the conversation is wrapping up." : "");
      const recentHistory = newHistory.slice(-6);
      try {
        const reply = await callLLM({ system: systemPrompt, messages: recentHistory });
        setIsTyping(false);
        addAIMessage(reply, currentStage);
      } catch {
        setIsTyping(false);
        addAIMessage("Let's continue in a moment.", currentStage);
      }
      setIsLoading(false);
      if (newCount >= stage.turnConfig.minTurns) setShowNextBar(true);
    }
  }, [inputValue, isLoading, readOnly, currentStage, stageMessageCount, conversationHistory,
    stages, userProfile, directorState, handleDirectorActorMessage, addAIMessage]);

  // ── Stage advance ────────────────────────────────────────────────────────────

  const advanceStage = useCallback(() => {
    const stage = stages[currentStage];
    if (stage.comprehensionCheck.questions.length > 0 && stagePhase === "chat") {
      setStagePhase("quiz");
      return;
    }
    // Save and move on
    savedMessagesRef.current[currentStage] = messages;
    savedHistoryRef.current[currentStage] = conversationHistory;
    setCompletedStages(prev => { const n = new Set(prev); n.add(currentStage); return n; });

    if (currentStage < stages.length - 1) {
      loadStage(currentStage + 1);
    } else {
      generateFeedback();
    }
  }, [currentStage, stagePhase, messages, conversationHistory, stages, loadStage]);

  // ── Feedback ─────────────────────────────────────────────────────────────────

  const generateFeedback = useCallback(async () => {
    setSimulationComplete(true);
    setShowFeedback(true);
    const transcript = allMessagesRef.current
      .map(m => `[${m.stage}] ${m.role === "user" ? "Student" : "Agent"}: "${m.text}"`)
      .join("\n");
    try {
      const raw = await callLLM({
        system: scenario.assessmentConfig.evaluatorPrompt,
        messages: [{ role: "user", content: `Student transcript:\n\n${transcript}` }],
      });
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setFeedbackScores({ scores: parsed, feedback: parsed.feedback });
    } catch {
      setFeedbackScores({
        scores: { analytical: 70, communication: 70, synthesis: 70, recommendation: 70 },
        feedback: "You navigated all four stages of the Ridgeline simulation. Review the facilitator key for detailed rubric guidance.",
      });
    }
  }, [scenario]);

  // ── Review (back-navigation) ─────────────────────────────────────────────────

  const reviewStage = useCallback((stageIndex: number) => {
    savedMessagesRef.current[currentStage] = messages;
    savedHistoryRef.current[currentStage] = conversationHistory;
    setShowFeedback(false);
    setCurrentStage(stageIndex);
    setStagePhase(stages[stageIndex].stageType === "video-chat" ? "video" : "chat");
    setShowNextBar(false);
    setDirectorState({ nextProbeIndex: 0, awaitingFollowUp: false, probeResults: [], phase: "scripted_probes" });

    if (simulationComplete) {
      setReadOnly(true);
      const saved = savedMessagesRef.current[stageIndex] ?? [];
      setMessages([...saved, {
        id: nextMsgId(), type: "system", sender: "System",
        text: "Reviewing past conversation — read only", color: "var(--system)", avatar: "S",
      }]);
      setConversationHistory(savedHistoryRef.current[stageIndex] ?? []);
      setStageMessageCount(0);
      setShowNextBar(true);
    } else {
      setReadOnly(false);
      const savedMsgs = savedMessagesRef.current[stageIndex];
      if (savedMsgs?.length > 0) {
        setMessages(savedMsgs);
        setConversationHistory(savedHistoryRef.current[stageIndex] ?? []);
        const userCount = savedMsgs.filter((m: DisplayMessage) => m.type === "user").length;
        setStageMessageCount(userCount);
        if (userCount >= stages[stageIndex].turnConfig.minTurns) setShowNextBar(true);
      } else if (stages[stageIndex].stageType !== "video-chat") {
        setMessages([]);
        setConversationHistory([]);
        setStageMessageCount(0);
        addSystemMessage(`Starting conversation with ${stages[stageIndex].agent.name}`);
        getAIOpener(stageIndex);
      }
    }
  }, [currentStage, messages, conversationHistory, simulationComplete, stages, addSystemMessage, getAIOpener]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const stage = stages[currentStage];
  const userName = userProfile?.name ?? "You";
  const userIcon = userProfile?.icon ?? "🧑‍💻";

  // ── Profile setup screen ──────────────────────────────────────────────────────
  const ICON_OPTIONS = ["🧑‍💻", "👩‍💻", "👨‍💻", "🦊", "🐼", "🦁", "🌟", "🚀", "🎯", "⚡", "🌊", "🔥"];

  if (!userProfile) {
    return (
      <div className="start-screen">
        <div className="start-card">
          <div className="start-tag">Before We Begin</div>
          <h1 className="start-title" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Who are <em>you?</em></h1>
          <p className="start-desc">We'll use your name and icon to personalize the simulation.</p>
          <div style={{ marginBottom: 24 }}>
            <input className="profile-input" type="text" placeholder="First name"
              value={profileName} onChange={e => setProfileName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && profileName.trim()) setUserProfile({ name: profileName.trim(), icon: profileIcon }); }}
              autoFocus />
          </div>
          <div style={{ marginBottom: 36 }}>
            <label className="profile-label">Your icon</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {ICON_OPTIONS.map(icon => (
                <button key={icon} onClick={() => setProfileIcon(icon)} style={{
                  width: 52, height: 52, borderRadius: 12, fontSize: 26, cursor: "pointer",
                  border: `2px solid ${profileIcon === icon ? "var(--accent)" : "var(--border)"}`,
                  background: profileIcon === icon ? "rgba(240,192,96,0.12)" : "var(--surface2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "border-color 0.15s",
                }}>{icon}</button>
              ))}
            </div>
          </div>
          <button className="start-btn" disabled={!profileName.trim()}
            onClick={() => setUserProfile({ name: profileName.trim(), icon: profileIcon })}>
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ── Start screen ──────────────────────────────────────────────────────────────

  if (!started) {
    return (
      <div className="start-screen">
        <div className="start-card">
          <div className="start-tag">{scenario.meta.organization} — {scenario.meta.subtitle}</div>
          <h1 className="start-title" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {scenario.meta.title.split(" ").slice(0, 3).join(" ")}<br />
            <em>{scenario.meta.role}</em>
          </h1>
          <p className="start-desc">{scenario.meta.description}</p>
          <div className="start-stages">
            {stages.map(s => (
              <div key={s.id} className="start-stage">
                <div className="start-stage-dot" style={{ background: s.agent.color }} />
                <span className="start-stage-name">{s.title}</span>
                <span className="start-stage-desc">{s.description}</span>
              </div>
            ))}
          </div>
          <button className="start-btn" onClick={startSimulation}>Begin Simulation →</button>
        </div>
      </div>
    );
  }

  // ── Video phase ───────────────────────────────────────────────────────────────

  if (stagePhase === "video") {
    return (
      <>
        <div className="topbar">
          <Link href="/" className="logo" style={{ textDecoration: "none" }}>Think<span>Higher</span></Link>
          <div className="scenario-title">{scenario.meta.organization} — {scenario.meta.subtitle}</div>
          <StageDots currentStage={currentStage} total={stages.length} completedStages={completedStages} simulationComplete={simulationComplete} />
        </div>
        <div className="main">
          <Sidebar currentStage={currentStage} simulationComplete={simulationComplete}
            completedStages={completedStages} visitedStages={visitedStages} onReviewStage={reviewStage}
            stagesV2={stages} />
          <div className="chat-area">
            <SituationBrief key={`${currentStage}-video`} data={stage.situationBrief} defaultCollapsed={false} userProfile={userProfile} />
            <div className="stage-header">
              <div className="stage-badge" style={{ background: `${stage.agent.color}22`, color: stage.agent.color, border: `1px solid ${stage.agent.color}44` }}>
                {stage.badge}
              </div>
              <div className="stage-desc">{stage.description}</div>
            </div>
            <div style={{ padding: "0 16px 16px", overflowY: "auto", flex: 1 }}>
              <VideoMeetingRidgeline
                userName={userProfile?.name}
                userIcon={userProfile?.icon}
                onComplete={() => {
                  const hasQuiz = stage.comprehensionCheck.questions.length > 0;
                  if (hasQuiz) {
                    setStagePhase("quiz");
                  } else {
                    savedMessagesRef.current[currentStage] = [];
                    savedHistoryRef.current[currentStage] = [];
                    setCompletedStages(prev => { const n = new Set(prev); n.add(currentStage); return n; });
                    if (currentStage < stages.length - 1) loadStage(currentStage + 1);
                    else generateFeedback();
                  }
                }}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Quiz phase ────────────────────────────────────────────────────────────────

  if (stagePhase === "quiz") {
    const { questions, title: quizTitle } = stage.comprehensionCheck;
    return (
      <>
        <div className="topbar">
          <Link href="/" className="logo" style={{ textDecoration: "none" }}>Think<span>Higher</span></Link>
          <div className="scenario-title">{scenario.meta.organization} — {scenario.meta.subtitle}</div>
          <StageDots currentStage={currentStage} total={stages.length} completedStages={completedStages} simulationComplete={simulationComplete} />
        </div>
        <div className="main">
          <Sidebar currentStage={currentStage} simulationComplete={simulationComplete}
            completedStages={completedStages} visitedStages={visitedStages} onReviewStage={reviewStage}
            stagesV2={stages} />
          <div className="comprehension-area">
            <SituationBrief key={`${currentStage}-quiz`} data={stage.situationBrief} defaultCollapsed userProfile={userProfile} />
            <div style={{ marginTop: 16, width: "100%", maxWidth: 600 }}>
              <ComprehensionCheck questions={questions} title={quizTitle} onComplete={() => {
                savedMessagesRef.current[currentStage] = messages;
                savedHistoryRef.current[currentStage] = conversationHistory;
                setCompletedStages(prev => { const n = new Set(prev); n.add(currentStage); return n; });
                if (currentStage < stages.length - 1) loadStage(currentStage + 1);
                else generateFeedback();
              }} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Chat phase ────────────────────────────────────────────────────────────────

  const hasArtifact = stage.stageType === "chat-artifact" && !!stage.artifact?.src;

  return (
    <>
      <div className="topbar">
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>Think<span>Higher</span></Link>
        <div className="scenario-title">{scenario.meta.organization} — {scenario.meta.subtitle}</div>
        <StageDots currentStage={currentStage} total={stages.length} completedStages={completedStages} simulationComplete={simulationComplete} />
      </div>

      <div className="main">
        <Sidebar currentStage={currentStage} simulationComplete={simulationComplete}
          completedStages={completedStages} visitedStages={visitedStages} onReviewStage={reviewStage}
          stagesV2={stages} />

        <div className="chat-area">
          <SituationBrief key={`${currentStage}-chat`} data={stage.situationBrief} defaultCollapsed={stageMessageCount > 0} userProfile={userProfile} />

          <div className="stage-header">
            <div className="stage-badge" style={{ background: `${stage.agent.color}22`, color: stage.agent.color, border: `1px solid ${stage.agent.color}44` }}>
              {stage.badge}{readOnly ? " · Review" : ""}
            </div>
            <div className="stage-desc">{stage.description}</div>
          </div>

          <div className="messages">
            {messages.map(msg =>
              msg.type === "system" ? (
                <div key={msg.id} style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
                  <div className="system-bubble">{msg.text}</div>
                </div>
              ) : (
                <MessageBubble key={msg.id} sender={msg.sender} text={msg.text}
                  color={msg.color} avatarLetter={msg.avatar} isUser={msg.type === "user"} />
              )
            )}
            {isTyping && <TypingIndicator color={stage.agent.color} avatar={stage.agent.avatar} name={stage.agent.name} />}
            <div ref={messagesEndRef} />
          </div>

          {showNextBar && (
            <div className="next-stage-bar visible">
              <div className="next-stage-hint">
                {simulationComplete && readOnly
                  ? <span><em>Read-only review mode.</em> Click any stage in the sidebar to switch.</span>
                  : stageMessageCount >= stage.turnConfig.wrapUpSignalTurn
                    ? <span><em>Conversation is wrapping up.</em> Continue or move on when ready.</span>
                    : "Feel free to keep the conversation going, or move on when ready."}
              </div>
              {simulationComplete && readOnly ? (
                <button className="next-stage-btn finish-btn" onClick={() => setShowFeedback(true)}>View Feedback</button>
              ) : currentStage < stages.length - 1 ? (
                <button className="next-stage-btn" onClick={advanceStage}>Next Stage →</button>
              ) : (
                <button className="next-stage-btn finish-btn" onClick={advanceStage}>Finish & See Feedback</button>
              )}
            </div>
          )}

          <div className="input-area">
            <div className="input-row">
              <textarea ref={inputRef} className="input-box" rows={1}
                placeholder={readOnly ? "Read-only — simulation complete" : "Type your response..."}
                value={inputValue} onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKey} disabled={isLoading || readOnly}
                onInput={e => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }} />
              <button className="send-btn" onClick={sendMessage} disabled={isLoading || readOnly}>Send →</button>
            </div>
            <div className="input-hint">This is a simulation. Respond as you would in a real workplace.</div>
          </div>
        </div>

        {hasArtifact && (
          <ArtifactPanel src={stage.artifact!.src} title={stage.artifact!.title} />
        )}
      </div>

      {showFeedback && feedbackScores && (
        <FeedbackOverlayV2
          scores={feedbackScores}
          dimensions={scenario.assessmentConfig.skillDimensions}
          onClose={() => {
            setShowFeedback(false);
            if (simulationComplete) { setReadOnly(true); }
          }}
        />
      )}
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StageDots({ currentStage, total, completedStages, simulationComplete }:
  { currentStage: number; total: number; completedStages: Set<number>; simulationComplete: boolean }) {
  return (
    <div className="stage-indicators">
      {Array.from({ length: total }).map((_, i) => {
        const classes = ["stage-dot",
          i < currentStage || simulationComplete ? "done" : "",
          i === currentStage ? "active" : "",
        ].filter(Boolean).join(" ");
        return <div key={i} className={classes} data-stage={i} />;
      })}
    </div>
  );
}

function FeedbackOverlayV2({ scores, dimensions, onClose }:
  { scores: FeedbackScoresV2; dimensions: { key: string; label: string }[]; onClose: () => void }) {
  return (
    <div className="feedback-overlay visible">
      <div className="feedback-card">
        <div className="feedback-title">Simulation Complete</div>
        <div className="feedback-subtitle">Ridgeline Community College — Strategic Analysis</div>
        <div className="feedback-section">
          <div className="feedback-section-title">Skill Scores</div>
          {dimensions.map(d => {
            const score = scores.scores[d.key] ?? 0;
            return (
              <div key={d.key} className="skill-bar">
                <div className="skill-name">{d.label}</div>
                <div className="skill-track">
                  <div className="skill-fill" style={{ width: `${score}%` }} />
                </div>
                <div className="skill-score">{score}</div>
              </div>
            );
          })}
        </div>
        <div className="feedback-section">
          <div className="feedback-section-title">Overall Feedback</div>
          <div className="feedback-text">{scores.feedback}</div>
        </div>
        <button className="close-feedback" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
