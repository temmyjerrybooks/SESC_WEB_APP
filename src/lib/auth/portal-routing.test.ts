import { describe, expect, it } from "vitest";

import {
  featureForPortal,
  getPortalRoute,
  isPortalFeatureEnabled,
} from "./portal-routing";

const allEnabledPortalGates = {
  memberPortal: { enabled: true, missing: [] },
  executivePortal: { enabled: true, missing: [] },
  adminPortal: { enabled: true, missing: [] },
} as const;

describe("portal routing", () => {
  it("maps each portal root and its nested routes to the correct access and feature gate", () => {
    expect(getPortalRoute("/member/documents")).toEqual({
      access: "member",
      feature: "memberPortal",
    });
    expect(getPortalRoute("/executive/content")).toEqual({
      access: "executive",
      feature: "executivePortal",
    });
    expect(getPortalRoute("/admin/users")).toEqual({
      access: "administrator",
      feature: "adminPortal",
    });
  });

  it("does not treat similarly named public paths as protected portals", () => {
    expect(getPortalRoute("/membership")).toBeNull();
    expect(getPortalRoute("/administrator")).toBeNull();
    expect(getPortalRoute("/memberish")).toBeNull();
  });

  it("uses the individual portal feature gate before authentication", () => {
    const gates = {
      ...allEnabledPortalGates,
      executivePortal: { enabled: false, missing: ["explicit-enablement"] },
    } as const;

    expect(featureForPortal("member")).toBe("memberPortal");
    expect(featureForPortal("executive")).toBe("executivePortal");
    expect(featureForPortal("administrator")).toBe("adminPortal");
    expect(isPortalFeatureEnabled("member", gates)).toBe(true);
    expect(isPortalFeatureEnabled("executive", gates)).toBe(false);
    expect(isPortalFeatureEnabled("administrator", gates)).toBe(true);
  });
});
