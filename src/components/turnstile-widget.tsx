"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const scriptId = "sesc-turnstile-script";

function loadTurnstile(): Promise<TurnstileApi | undefined> {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  return new Promise((resolve) => {
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const complete = () => resolve(window.turnstile);

    if (!existing) {
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.addEventListener("load", complete, { once: true });
      script.addEventListener("error", () => resolve(undefined), { once: true });
      document.head.appendChild(script);
    } else {
      existing.addEventListener("load", complete, { once: true });
      existing.addEventListener("error", () => resolve(undefined), { once: true });
    }
  });
}

export function TurnstileWidget({
  siteKey,
  action,
  disabled = false,
  onToken,
}: {
  siteKey: string;
  action: string;
  disabled?: boolean;
  onToken: (token: string | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    let mounted = true;
    onToken(null);

    void loadTurnstile().then((turnstile) => {
      if (!mounted || !turnstile || !container.current || disabled) {
        if (mounted) setState("unavailable");
        return;
      }

      setState("ready");
      widgetId.current = turnstile.render(container.current, {
        sitekey: siteKey,
        action,
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => {
          onToken(null);
          setState("unavailable");
        },
      });
    });

    return () => {
      mounted = false;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
      }
    };
  }, [action, disabled, onToken, siteKey]);

  if (disabled) return null;

  return (
    <div className="field full">
      <div aria-live="polite" className="text-sm text-[#aebcb0]" role="status">
        {state === "loading" ? "Preparing the security check…" : null}
        {state === "unavailable" ? "The security check is unavailable. Please refresh and try again." : null}
      </div>
      <div ref={container} />
    </div>
  );
}
