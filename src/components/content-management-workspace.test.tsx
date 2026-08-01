import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContentManagementWorkspace } from "./content-management-workspace";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ContentManagementWorkspace", () => {
  it("submits a text-paragraph news payload and reloads the protected worklist", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "11111111-1111-4111-8111-111111111111" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ entries: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<ContentManagementWorkspace />);

    fireEvent.change(screen.getByLabelText("Headline"), { target: { value: "Controlled live test" } });
    fireEvent.change(screen.getByLabelText("URL slug"), { target: { value: "controlled-live-test" } });
    fireEvent.change(screen.getByLabelText("Summary"), { target: { value: "A safe article for controlled testing." } });
    fireEvent.change(screen.getByLabelText("Article paragraphs"), { target: { value: "First safe paragraph.\n\nSecond safe paragraph." } });
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/operations/content");
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      kind: "news",
      status: "published",
      slug: "controlled-live-test",
      body: {
        eyebrow: "SESC news",
        paragraphs: ["First safe paragraph.", "Second safe paragraph."],
      },
    });
    expect(JSON.parse(String(request.body)).body).not.toHaveProperty("html");
    expect(await screen.findByRole("status")).toHaveTextContent("Published.");
  });
});
