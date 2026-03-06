import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThinkWith — Cognitive Simulation Platform",
  description:
    "AI-driven workplace simulations for practicing higher-order thinking and communication skills.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=IBM+Plex+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
