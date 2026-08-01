import { NextRequest } from "next/server";

import { isFeatureEnabled } from "@/lib/environment/server";
import { trustedHttpsSiteOrigin } from "@/lib/environment/public";
import {
  admitPublicWorkflowRequest,
  defaultTurnstileVerifier,
} from "@/lib/public-workflows/handlers";
import { hashClientAddress, readClientAddress } from "@/lib/public-workflows/client-identity";
import { createPublicWorkflowRepository } from "@/lib/public-workflows/repository";
import { noStoreJson, unavailable } from "@/lib/server/http";
import { createRouteAuthClient } from "@/lib/server/route-auth-client";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { turnstileHostnameFromSiteUrl } from "@/lib/security/turnstile";
import { authActionRequestSchema } from "@/lib/validation/server-workflows";

const knownActions = new Set([
  "sign-in",
  "sign-up",
  "password-reset",
  "resend-verification",
  "update-password",
]);

const authRateLimits: Record<string, { windowSeconds: number; maxAttempts: number }> = {
  "sign-in": { windowSeconds: 15 * 60, maxAttempts: 8 },
  "sign-up": { windowSeconds: 60 * 60, maxAttempts: 5 },
  "password-reset": { windowSeconds: 60 * 60, maxAttempts: 5 },
  "resend-verification": { windowSeconds: 60 * 60, maxAttempts: 5 },
  "update-password": { windowSeconds: 15 * 60, maxAttempts: 5 },
};

const turnstileActionByAuthAction: Record<string, string> = {
  "sign-in": "sesc_login",
  "sign-up": "sesc_register",
  "password-reset": "sesc_forgot_password",
  "resend-verification": "sesc_email_verification",
};

function callbackUrl(path: "/email-verification" | "/reset-password") {
  const siteUrl = trustedHttpsSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (!siteUrl) return undefined;

  const callback = new URL("/auth/callback", siteUrl);
  callback.searchParams.set("next", path);
  return callback.toString();
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  if (!isFeatureEnabled("authentication")) {
    return unavailable("Account actions are not available in this environment.");
  }

  const { action } = await context.params;
  if (!knownActions.has(action)) {
    return noStoreJson({ message: "The requested account action is unavailable." }, 404);
  }

  const clientAddress = readClientAddress(
    request.headers,
    process.env.SESC_TRUSTED_PROXY_HEADERS === "true",
  );
  const sourceIpHash = clientAddress ? hashClientAddress(`auth.${action}`, clientAddress) : undefined;
  const repository = createPublicWorkflowRepository(createServiceRoleClient());
  const admission = await admitPublicWorkflowRequest(
    repository.rateLimiter,
    authRateLimits[action],
    `auth.${action}`,
    sourceIpHash,
  );
  if (admission) {
    return noStoreJson({ message: admission.message }, admission.status);
  }

  const parsed = authActionRequestSchema.safeParse({
    ...(await request.json().catch(() => ({}))),
    action,
  });
  if (!parsed.success) {
    return noStoreJson({ message: "The account request is invalid." }, 400);
  }

  if (parsed.data.action !== "update-password") {
    const challenge = await defaultTurnstileVerifier(
      parsed.data.turnstileToken,
      process.env.TURNSTILE_SECRET_KEY,
      clientAddress,
      {
        expectedAction: turnstileActionByAuthAction[parsed.data.action],
        expectedHostname: turnstileHostnameFromSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
      },
    );
    if (challenge.status !== "passed") {
      return noStoreJson({ message: "We could not verify this request. Please try again." }, 400);
    }
  }

  const response = noStoreJson({ status: "accepted" }, 202);
  const supabase = createRouteAuthClient(request, response);

  if (parsed.data.action === "sign-in") {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
    });
    if (error || !data.session) {
      return noStoreJson({ message: "We could not sign you in with those details." }, 400);
    }
    response.headers.set("x-sesc-auth-session", "signed-in");
    return response;
  }

  if (parsed.data.action === "sign-up") {
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      options: {
        emailRedirectTo: callbackUrl("/email-verification"),
        data: parsed.data.fullName ? { full_name: parsed.data.fullName } : undefined,
      },
    });
    if (error) {
      return noStoreJson({ message: "We could not create that account. Please try again." }, 400);
    }
    response.headers.set("x-sesc-auth-session", data.session ? "created" : "verification-required");
    return response;
  }

  if (parsed.data.action === "password-reset") {
    await supabase.auth.resetPasswordForEmail(parsed.data.email.toLowerCase(), {
      redirectTo: callbackUrl("/reset-password"),
    });
    return response;
  }

  if (parsed.data.action === "resend-verification") {
    await supabase.auth.resend({
      type: "signup",
      email: parsed.data.email.toLowerCase(),
      options: { emailRedirectTo: callbackUrl("/email-verification") },
    });
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return noStoreJson({ message: "This recovery session is no longer valid." }, 401);
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return noStoreJson({ message: "This recovery session is no longer valid." }, 400);
  }
  await supabase.auth.signOut();
  response.headers.set("x-sesc-auth-session", "password-updated");
  return response;
}
