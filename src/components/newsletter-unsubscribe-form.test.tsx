import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NewsletterUnsubscribeForm } from "./newsletter-unsubscribe-form";

const token = "11111111-1111-4111-8111-111111111111";

describe("NewsletterUnsubscribeForm", () => {
  beforeEach(() => {
    window.history.replaceState(
      null,
      "",
      `/newsletter/unsubscribe#token=${token}`,
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("clears the bearer fragment before an explicit unsubscribe POST", async () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetcher);

    render(<NewsletterUnsubscribeForm />);

    const button = screen.getByRole("button", { name: "Unsubscribe" });
    await waitFor(() => expect(button).toBeEnabled());
    expect(window.location.hash).toBe("");
    expect(replaceState).toHaveBeenCalledWith(
      window.history.state,
      "",
      "/newsletter/unsubscribe",
    );
    expect(fetcher).not.toHaveBeenCalled();

    fireEvent.click(button);

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledWith("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
    });
    expect(
      screen.getByText("Your newsletter preference has been updated."),
    ).toBeInTheDocument();
  });

  it("does not make a request for a missing or malformed fragment", async () => {
    window.history.replaceState(null, "", "/newsletter/unsubscribe#token=invalid");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    render(<NewsletterUnsubscribeForm />);

    await waitFor(() => {
      expect(
        screen.getByText("Your newsletter preference has been updated."),
      ).toBeInTheDocument();
    });
    expect(window.location.hash).toBe("");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
