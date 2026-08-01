"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Route error", error);
  }, [error]);

  return (
    <section className="not-found page-shell">
      <p className="eyebrow">A temporary interruption</p>
      <h1>We couldn&apos;t load this part of the platform.</h1>
      <p>Your information is safe. Try again, or return to the home page while we restore the connection.</p>
      <div className="button-row">
        <button className="button button--primary" onClick={reset} type="button">Try again</button>
        <Link className="button button--secondary" href="/">Return home</Link>
      </div>
    </section>
  );
}
