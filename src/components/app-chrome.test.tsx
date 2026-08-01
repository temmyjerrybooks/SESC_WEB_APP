import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn(() => "/"),
}));

vi.mock("next/navigation", () => ({ usePathname }));
vi.mock("./site-footer", () => ({ SiteFooter: () => null }));
vi.mock("./site-header", () => ({ SiteHeader: () => null }));

import { AppChrome } from "./app-chrome";

describe("AppChrome", () => {
  it("provides a focusable skip-link target", () => {
    render(
      <AppChrome>
        <p>Page content</p>
      </AppChrome>,
    );

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabindex", "-1");
  });
});
