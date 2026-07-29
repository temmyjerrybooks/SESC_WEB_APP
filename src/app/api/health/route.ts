import { NextResponse } from "next/server";
import { getHealthReadiness } from "@/lib/environment/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "sesc-web-app",
    timestamp: new Date().toISOString(),
    readiness: {
      features: getHealthReadiness(),
    },
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
