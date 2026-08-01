"use client";

import { useEffect, useState } from "react";

const galaDate = new Date("2026-10-30T18:00:00+01:00").getTime();

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
};

function getRemaining(): Remaining {
  const diff = Math.max(0, galaDate - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
  };
}

export function HomeCountdown() {
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    const refreshCountdown = () => setRemaining(getRemaining());
    refreshCountdown();
    const timer = window.setInterval(refreshCountdown, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div aria-label="Countdown to the Awards and Gala Night" className="countdown">
      {(["days", "hours", "minutes"] as const).map((label) => (
        <div className="countdown__unit" key={label}>
          <strong>{remaining ? String(remaining[label]).padStart(2, "0") : "--"}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
