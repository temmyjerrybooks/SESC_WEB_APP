import { describe, expect, it } from "vitest";

import { safeRelativePath } from "./safe-redirect";

describe("safeRelativePath", () => {
  it("preserves safe internal destinations", () => {
    expect(safeRelativePath("/member?tab=documents#latest")).toBe("/member?tab=documents#latest");
  });

  it("rejects external and malformed destinations", () => {
    expect(safeRelativePath("https://attacker.example")).toBe("/member");
    expect(safeRelativePath("//attacker.example")).toBe("/member");
    expect(safeRelativePath("/\\attacker.example")).toBe("/member");
    expect(safeRelativePath("\u0000/member")).toBe("/member");
  });
});
