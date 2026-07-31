import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const staticDirectory = resolve(process.cwd(), ".next", "static");
const forbiddenPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY/,
  /BREVO_API_KEY/,
  /TURNSTILE_SECRET_KEY/,
  /PAYSTACK_SECRET_KEY/,
  /PAYSTACK_WEBHOOK_SECRET/,
  /FIREBASE_ADMIN_PRIVATE_KEY/,
];

function filesAt(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesAt(path) : [path];
  });
}

if (!existsSync(staticDirectory)) {
  console.error("Browser-bundle check requires a completed production build.");
  process.exit(2);
}

let scanned = 0;
for (const file of filesAt(staticDirectory)) {
  if (!/\.(?:js|mjs|json)$/i.test(file) || statSync(file).size > 20 * 1024 * 1024) continue;
  scanned += 1;
  const contents = readFileSync(file, "utf8");
  if (forbiddenPatterns.some((pattern) => pattern.test(contents))) {
    console.error("Browser-bundle check failed: a server-only secret identifier appeared in a public asset.");
    process.exit(1);
  }
}

process.stdout.write(`Browser-bundle sensitive-pattern check passed (${scanned} static asset(s)).\n`);
