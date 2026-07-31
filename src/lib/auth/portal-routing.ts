import type {
  FeatureGateName,
  FeatureGateStates,
} from "@/lib/environment/gates";

import type { PortalAccess } from "./authorization";

export type PortalFeatureGate = Extract<
  FeatureGateName,
  "memberPortal" | "executivePortal" | "adminPortal"
>;

export type PortalRoute = {
  access: PortalAccess;
  feature: PortalFeatureGate;
};

type PortalRouteDefinition = PortalRoute & {
  prefix: string;
};

const portalRouteDefinitions = [
  { access: "member", feature: "memberPortal", prefix: "/member" },
  { access: "executive", feature: "executivePortal", prefix: "/executive" },
  { access: "administrator", feature: "adminPortal", prefix: "/admin" },
] as const satisfies readonly PortalRouteDefinition[];

/**
 * Resolves only complete portal path segments, so routes such as
 * `/membership` cannot accidentally inherit member-portal controls.
 */
export function getPortalRoute(pathname: string): PortalRoute | null {
  const portalRoute = portalRouteDefinitions.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!portalRoute) {
    return null;
  }

  return { access: portalRoute.access, feature: portalRoute.feature };
}

export function featureForPortal(access: PortalAccess): PortalFeatureGate {
  const portalRoute = portalRouteDefinitions.find(
    (definition) => definition.access === access,
  );

  if (!portalRoute) {
    throw new Error(`Unsupported portal access level: ${access}`);
  }

  return portalRoute.feature;
}

/**
 * Lets middleware and server components make the same fail-closed feature
 * decision without importing server-only environment facades.
 */
export function isPortalFeatureEnabled(
  access: PortalAccess,
  gates: Pick<FeatureGateStates, PortalFeatureGate>,
): boolean {
  return gates[featureForPortal(access)].enabled;
}
