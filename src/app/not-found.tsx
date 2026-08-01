import Link from "next/link";

export default function NotFound() {
  return (
    <section className="not-found page-shell">
      <p className="eyebrow">404 · Off the pitch</p>
      <h1>This page is not in the squad.</h1>
      <p>It may have moved, or the link may need updating. Let&apos;s get you back to the club.</p>
      <div className="button-row">
        <Link className="button button--primary" href="/">Return home</Link>
        <Link className="button button--secondary" href="/search">Search the platform</Link>
      </div>
    </section>
  );
}
