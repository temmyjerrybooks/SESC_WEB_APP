import { describe, expect, it } from "vitest";

import { canAccessPortal, isAccountActive } from "./authorization";

describe("server portal authorisation helpers", () => {
  it("allows a member and authorised higher roles into the member portal", () => {
    expect(canAccessPortal("member", ["member"], false)).toBe(true);
    expect(canAccessPortal("member", ["finance_officer"], false)).toBe(true);
    expect(canAccessPortal("member", ["super_administrator"], false)).toBe(true);
    expect(canAccessPortal("member", [], true)).toBe(true);
  });

  it("keeps applicants and visitors out of private portals", () => {
    expect(canAccessPortal("member", ["applicant"], false)).toBe(false);
    expect(canAccessPortal("executive", ["member"], true)).toBe(false);
    expect(canAccessPortal("administrator", ["national_executive"], true)).toBe(false);
  });

  it("requires an approved operational role for executive access", () => {
    expect(canAccessPortal("executive", ["chapter_executive"], false)).toBe(true);
    expect(canAccessPortal("executive", ["finance_officer"], false)).toBe(true);
    expect(canAccessPortal("executive", ["super_administrator"], false)).toBe(true);
  });

  it("only treats active accounts as eligible", () => {
    expect(isAccountActive("active")).toBe(true);
    expect(isAccountActive("suspended")).toBe(false);
    expect(isAccountActive("deactivated")).toBe(false);
    expect(isAccountActive(null)).toBe(false);
  });
});
