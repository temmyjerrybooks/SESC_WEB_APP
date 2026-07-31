import { NextRequest } from "next/server";
import { z } from "zod";

import { isFeatureEnabled } from "@/lib/environment/server";
import { noStoreJson, unavailable } from "@/lib/server/http";
import { createServiceRoleClient } from "@/lib/supabase/server";

const requestSchema = z.object({ token: z.string().uuid() }).strict();

export async function POST(request: NextRequest) {
  if (!isFeatureEnabled("newsletterSubscriptions")) {
    return unavailable("Newsletter confirmation is not available in this environment.");
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return noStoreJson({ message: "This confirmation link is invalid." }, 400);
  }

  try {
    const service = createServiceRoleClient();
    const { data, error } = await service.rpc("confirm_newsletter_subscription", {
      p_confirmation_token: parsed.data.token,
    });
    if (error || data !== true) {
      return noStoreJson({ message: "This confirmation link is unavailable." }, 400);
    }
    return noStoreJson({ status: "confirmed" });
  } catch {
    return noStoreJson({ message: "This confirmation service is unavailable." }, 503);
  }
}
