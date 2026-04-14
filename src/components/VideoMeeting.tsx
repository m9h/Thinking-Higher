"use client";

import VideoMeetingPlayer, { MeetingConfig } from "./VideoMeetingPlayer";

// ── SVG Avatars ───────────────────────────────────────────────────────────────

function SarahAvatar({ speaking }: { speaking: boolean }) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: 56, height: 56, borderRadius: "50%", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))" }}>
      <circle cx="50" cy="50" r="50" fill="#3C3489"/>
      <ellipse cx="50" cy="72" rx="26" ry="18" fill="#2a2370"/>
      <ellipse cx="50" cy="40" rx="18" ry="17" fill="#f5c8b0"/>
      <ellipse cx="50" cy="26" rx="18" ry="11" fill="#3d2314"/>
      <ellipse cx="34" cy="34" rx="6" ry="10" fill="#3d2314"/>
      <ellipse cx="66" cy="34" rx="6" ry="10" fill="#3d2314"/>
      <rect x="32" y="22" width="36" height="10" rx="5" fill="#3d2314"/>
      <ellipse cx="43" cy="40" rx="3" ry="3.5" fill="#fff"/>
      <ellipse cx="57" cy="40" rx="3" ry="3.5" fill="#fff"/>
      <circle cx="43" cy="40" r="1.8" fill="#4a3000"/>
      <circle cx="57" cy="40" r="1.8" fill="#4a3000"/>
      {speaking ? <ellipse cx="50" cy="52" rx="5" ry="3.5" fill="#8B2020"/> : <path d="M44 50 Q50 54 56 50" stroke="#c0785a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>}
      <path d="M24 90 Q50 78 76 90 L76 100 L24 100 Z" fill="#5a4faa"/>
    </svg>
  );
}

function AlexAvatar({ speaking }: { speaking: boolean }) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: 56, height: 56, borderRadius: "50%", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))" }}>
      <circle cx="50" cy="50" r="50" fill="#2a3a28"/>
      <ellipse cx="50" cy="74" rx="28" ry="18" fill="#1e2e1c"/>
      <ellipse cx="50" cy="40" rx="18" ry="17" fill="#d4956a"/>
      <ellipse cx="50" cy="25" rx="18" ry="10" fill="#1a1008"/>
      <rect x="32" y="22" width="36" height="8" rx="4" fill="#1a1008"/>
      <ellipse cx="43" cy="39" rx="3" ry="3.2" fill="#fff"/>
      <ellipse cx="57" cy="39" rx="3" ry="3.2" fill="#fff"/>
      <circle cx="43" cy="39" r="1.8" fill="#2a1800"/>
      <circle cx="57" cy="39" r="1.8" fill="#2a1800"/>
      <path d="M39 34 Q43 33 47 34" stroke="#1a1008" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M53 34 Q57 33 61 34" stroke="#1a1008" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      {speaking ? <ellipse cx="50" cy="53" rx="5.5" ry="3" fill="#7a2a10"/> : <path d="M43 50 Q50 56 57 50" stroke="#b06040" strokeWidth="1.6" fill="none" strokeLinecap="round"/>}
      <path d="M24 92 Q50 78 76 92 L76 100 L24 100 Z" fill="#2c3e50"/>
    </svg>
  );
}

function MarcusAvatar({ speaking }: { speaking: boolean }) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: 56, height: 56, borderRadius: "50%", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))" }}>
      <circle cx="50" cy="50" r="50" fill="#5a3010"/>
      <ellipse cx="50" cy="73" rx="27" ry="18" fill="#3e1e08"/>
      <ellipse cx="50" cy="40" rx="18" ry="18" fill="#8B5E3C"/>
      <ellipse cx="50" cy="22" rx="20" ry="12" fill="#1a0800"/>
      <circle cx="34" cy="28" r="8" fill="#1a0800"/>
      <circle cx="66" cy="28" r="8" fill="#1a0800"/>
      <circle cx="50" cy="18" r="8" fill="#1a0800"/>
      <ellipse cx="43" cy="40" rx="3" ry="3.5" fill="#fff"/>
      <ellipse cx="57" cy="40" rx="3" ry="3.5" fill="#fff"/>
      <circle cx="43" cy="40" r="2" fill="#2a1500"/>
      <circle cx="57" cy="40" r="2" fill="#2a1500"/>
      <rect x="37" y="36" width="10" height="8" rx="3" fill="none" stroke="#555" strokeWidth="1.2"/>
      <rect x="53" y="36" width="10" height="8" rx="3" fill="none" stroke="#555" strokeWidth="1.2"/>
      <line x1="47" y1="40" x2="53" y2="40" stroke="#555" strokeWidth="1.2"/>
      {speaking ? <ellipse cx="50" cy="54" rx="5.5" ry="3.5" fill="#5a1a00"/> : <path d="M43 51 Q50 57 57 51" stroke="#7a3a1a" strokeWidth="1.8" fill="none" strokeLinecap="round"/>}
      <path d="M23 92 Q50 78 77 92 L77 100 L23 100 Z" fill="#993C1D"/>
    </svg>
  );
}

// ── Config ────────────────────────────────────────────────────────────────────

const VELA_CONFIG: MeetingConfig = {
  title: "Vela — Monday Group Meeting",
  gridCols: "1fr 1fr",
  gridRows: "1fr 1fr",
  placeholderText: "Press play to start the meeting.",
  completionMessage: "Meeting complete. Sarah will ask if you have any questions.",
  theme: {
    shellBg: "#1c1c1e",
    tileBg: "#2a2a2e",
    activeColor: "#1D9E75",
    timerColor: "#888",
    textPrimary: "#e0e0e0",
    textMuted: "#666",
    ctrlPrimaryBg: "#1D9E75",
    ctrlPrimaryColor: "#fff",
  },
  participants: [
    {
      id: "sarah",
      name: "Sarah",
      title: "Project Manager",
      initial: "S",
      gradient: "linear-gradient(135deg, #3C3489, #5a4faa)",
      isFemale: true,
      chipColor: "#CECBF6",
      chipBg: "transparent",
      chipBorder: "transparent",
      renderAvatar: (speaking) => <SarahAvatar speaking={speaking} />,
    },
    {
      id: "alex",
      name: "Alex",
      title: "Tech Lead",
      initial: "A",
      gradient: "linear-gradient(135deg, #2a3a28, #2c3e50)",
      isFemale: false,
      chipColor: "#C0DD97",
      chipBg: "transparent",
      chipBorder: "transparent",
      renderAvatar: (speaking) => <AlexAvatar speaking={speaking} />,
    },
    {
      id: "marcus",
      name: "Marcus",
      title: "UX Designer",
      initial: "M",
      gradient: "linear-gradient(135deg, #5a3010, #993C1D)",
      isFemale: false,
      chipColor: "#F5C4B3",
      chipBg: "transparent",
      chipBorder: "transparent",
      renderAvatar: (speaking) => <MarcusAvatar speaking={speaking} />,
    },
    {
      id: "you",
      name: "You",
      title: "Junior SDE",
      initial: "Y",
      gradient: "linear-gradient(135deg, #185FA5, #2980b9)",
      isYou: true,
      chipColor: "#B5D4F4",
      chipBg: "transparent",
      chipBorder: "transparent",
    },
  ],
  lines: [
    { speakerId: "sarah",  text: "Alright, let's keep this quick. Vela aims to provide IT asset management services to companies, and we want their IT admins to manage their company's IT assets as smoothly as possible. Our team's goal in this sprint is to design and develop the very first onboarding platform for the IT admins. Marcus, as our UX designer, do you want to kick us off today?" },
    { speakerId: "marcus", text: "Yeah — so I finished up six user interviews with IT admins for designing the Vela platform onboarding module over the past week. Big takeaway: they need to see and choose what they're tracking for the company — software licenses, laptops, other devices — before the form asks for any details. They won't fill in what they didn't opt into. I also think we need to be really clear at each onboarding step about what level of detail the form is asking for; if not, people just bail." },
    { speakerId: "sarah",  text: "That tracks with what I'm hearing from the sales side too. What else?" },
    { speakerId: "marcus", text: "One more thing — three of the six admins said they wouldn't have all their inventory info on hand during signup. So ideally, they could save progress and come back later." },
    { speakerId: "alex",   text: "The first two are fine — we can build that. The save-and-return piece is a different story. Persisting draft state server-side isn't trivial. I don't think we can scope that into one sprint without it becoming the whole sprint." },
    { speakerId: "sarah",  text: "Noted. Let's park that and focus on the first two. Alex, anything else from you?" },
    { speakerId: "alex",   text: "Just one thing — I want to flag for the team that the junior software engineer in our team is going to be taking the lead on building the onboarding module." },
    { speakerId: "sarah",  text: "Great. Welcome to the project officially. Please sync later with Marcus to discuss the design and development in detail for this week's sprint." },
    { speakerId: "marcus", text: "Sure thing — let's talk tomorrow after I have the prototype fleshed out!" },
  ],
};

// ── Wrapper ───────────────────────────────────────────────────────────────────

interface VideoMeetingProps {
  onComplete: () => void;
  userName?: string;
  userIcon?: string;
}

export default function VideoMeeting({ onComplete, userName, userIcon }: VideoMeetingProps) {
  return <VideoMeetingPlayer config={VELA_CONFIG} onComplete={onComplete} userName={userName} userIcon={userIcon} />;
}
