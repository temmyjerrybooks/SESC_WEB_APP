import "server-only";

import {
  createPublicReadiness,
  evaluateFeatureGates,
  type FeatureGateName,
  type FeatureGateState,
  type FeatureGateStates,
} from "./gates";

export type {
  FeatureGateName,
  FeatureGateRequirement,
  FeatureGateState,
  FeatureGateStates,
} from "./gates";

/**
 * Server-only feature gate facade. Never use browser-controlled input to
 * decide whether a production workflow is available.
 */
export function getFeatureGates(): FeatureGateStates {
  return evaluateFeatureGates(process.env);
}

export function getFeatureGate(feature: FeatureGateName): FeatureGateState {
  return getFeatureGates()[feature];
}

export function isFeatureEnabled(feature: FeatureGateName): boolean {
  return getFeatureGate(feature).enabled;
}

export function getHealthReadiness(): Record<
  FeatureGateName,
  "available" | "unavailable"
> {
  return createPublicReadiness(process.env);
}
