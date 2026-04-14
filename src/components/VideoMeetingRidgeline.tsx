"use client";

import VideoMeetingPlayer, { MeetingConfig } from "./VideoMeetingPlayer";

// ── Config ────────────────────────────────────────────────────────────────────

const RIDGELINE_CONFIG: MeetingConfig = {
  title: "Ridgeline CC — Office of the President",
  gridCols: "1.6fr 1fr 1fr",
  gridRows: "1fr 1fr",
  // gridHeight: 700,
  placeholderText: "Press play to start the kick-off meeting.",
  completionMessage: "Meeting complete. Jordan will brief you on your first session with Priya.",
  theme: {
    shellBg: "#0d1b2a",
    tileBg: "#112240",
    activeColor: "#4ade80",
    timerColor: "#7a96b8",
    textPrimary: "#e0eaf8",
    textMuted: "#7a96b8",
    ctrlPrimaryBg: "#1a3260",
    ctrlPrimaryColor: "#e0eaf8",
  },
  participants: [
    {
      id: "jordan",
      name: "Jordan Ellis",
      title: "Chief of Staff",
      initial: "J",
      gradient: "linear-gradient(135deg, #1a3260, #2e75b6)",
      isFemale: false,
      gridArea: "1 / 1 / 3 / 2",   // spans both rows on the left — large tile
      chipColor: "#93b4e8",
      chipBg: "rgba(26,50,96,0.5)",
      chipBorder: "rgba(46,117,182,0.5)",
    },
    {
      id: "priya",
      name: "Priya Nair",
      title: "Finance Manager",
      initial: "P",
      gradient: "linear-gradient(135deg, #a78bfa, #7c3aed)",
      isFemale: true,
      chipColor: "#c4b5fd",
      chipBg: "rgba(167,139,250,0.25)",
      chipBorder: "rgba(167,139,250,0.4)",
    },
    {
      id: "derek",
      name: "Derek Osei",
      title: "Data Specialist",
      initial: "D",
      gradient: "linear-gradient(135deg, #0e6670, #14b8a6)",
      isFemale: false,
      chipColor: "#5eead4",
      chipBg: "rgba(14,102,112,0.3)",
      chipBorder: "rgba(20,184,166,0.4)",
    },
    {
      id: "you",
      name: "You",
      title: "Analyst, Office of the President",
      initial: "Y",
      gradient: "linear-gradient(135deg, #f4a261, #e76f51)",
      isYou: true,
      gridArea: "2 / 2 / 3 / 4",   // spans bottom two right columns
      chipColor: "#e0eaf8",
      chipBg: "transparent",
      chipBorder: "transparent",
    },
  ],
  lines: [
    { speakerId: "jordan", text: "Alright, let's get into it. Priya flagged something to me last week that I think we need to get eyes on before planning season starts. I'm not going to sugarcoat it — the numbers aren't trending in the right direction, and the board is asking questions I don't have good answers to yet." },
    { speakerId: "priya",  text: "Yeah. I've been sitting with the budget actuals for a few weeks now. It's not a crisis yet, but the direction is — it's not great." },
    { speakerId: "jordan", text: "Right. So here's what we're doing. I've asked our new Analyst to come in fresh and take a real look — budget, enrollment, the works. No preconceptions. Priya, you'll walk them through the financials. Derek, enrollment data on your end." },
    { speakerId: "derek",  text: "Sure — I can pull the last three years broken out by program. Full-time, part-time, the whole picture." },
    { speakerId: "jordan", text: "Good. And I want to be clear about one thing — you two are there to share the data and answer questions about what's in it. The interpretation, the 'so what' — that's our Analyst's job. I don't want the answer pre-baked before it gets to me." },
    { speakerId: "priya",  text: "Fair enough. I'll keep my opinions to myself." },
    { speakerId: "jordan", text: "One thing you need to know going in: the board has been explicit with me. We need to be back in surplus within two fiscal years, and reserves don't go below three million. That's not a goal — that's a constraint. Whatever you bring back to me has to work inside those guardrails." },
    { speakerId: "derek",  text: "That's a tight window." },
    { speakerId: "jordan", text: "It is. Which is why I need someone looking at this without any of the baggage the rest of us are carrying. Alright — Priya, you'll connect with our Analyst first. Derek, you're after. Let's get moving." },
  ],
};

// ── Wrapper ───────────────────────────────────────────────────────────────────

interface VideoMeetingRidgelineProps {
  onComplete: () => void;
  userName?: string;
  userIcon?: string;
}

export default function VideoMeetingRidgeline({ onComplete, userName, userIcon }: VideoMeetingRidgelineProps) {
  return <VideoMeetingPlayer config={RIDGELINE_CONFIG} onComplete={onComplete} userName={userName} userIcon={userIcon} />;
}
