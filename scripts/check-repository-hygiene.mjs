import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const checks = [
  {
    category: "dotenv",
    matches: (file) => /(^|\/)\.env(?:$|\.)/i.test(file),
  },
  {
    category: "key",
    matches: (file) =>
      /\.(?:pem|key|p12|pfx|jks|keystore)$/i.test(file) ||
      /(^|\/)(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)$/i.test(file),
  },
  {
    category: "node_modules",
    matches: (file) => /(^|\/)node_modules(?:\/|$)/i.test(file),
  },
  {
    category: "build",
    matches: (file) =>
      /^(?:\.next|\.turbo|dist|build|out|coverage|playwright-report|test-results|storybook-static)(?:\/|$)/i.test(
        file,
      ),
  },
  {
    category: "bundle",
    matches: (file) =>
      /\.(?:bundle|min)\.(?:[cm]?js)$/i.test(file) ||
      /\.bundle$/i.test(file) ||
      /\.(?:[cm]?js)\.map$/i.test(file) ||
      /(^|\/)(?:bundles?|vendors?)(?:\/|$)/i.test(file),
  },
  {
    category: "debug",
    matches: (file) =>
      /(?:^|\/)(?:npm-debug\.log|yarn-debug\.log|yarn-error\.log|debug\.log)$/i.test(file) ||
      /\.(?:trace|heapsnapshot|cpuprofile)$/i.test(file),
  },
  {
    category: "design-export",
    matches: (file) =>
      /^(?:stitch_[^/]+|design-exports?)(?:\/|$)/i.test(file) ||
      /\.(?:fig|sketch|xd|psd|ai|afdesign)$/i.test(file),
  },
];

const credentialPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\b(?:xox[baprs]-)[0-9A-Za-z-]{20,}\b/g,
];

function trackedFiles() {
  try {
    const output = execFileSync("git", ["ls-files", "-z"], {
      encoding: "buffer",
      stdio: ["ignore", "pipe", "ignore"],
    });

    return output
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .map((file) => file.replaceAll("\\", "/"));
  } catch {
    console.error("Repository hygiene check could not enumerate tracked files.");
    process.exit(2);
  }
}

const files = trackedFiles();
const violations = checks.map(({ category, matches }) => ({
  category,
  count: files.filter(matches).length,
}));

let credentialPatternCount = 0;
for (const file of files) {
  try {
    const absolutePath = resolve(process.cwd(), file);
    if (statSync(absolutePath).size > 2 * 1024 * 1024) {
      continue;
    }

    const contents = readFileSync(absolutePath, "utf8");
    for (const pattern of credentialPatterns) {
      credentialPatternCount += [...contents.matchAll(pattern)].length;
    }
  } catch {
    // Binary and unreadable files are handled by the tracked-path checks.
  }
}
violations.push({ category: "credential-pattern", count: credentialPatternCount });
const totalViolations = violations.reduce((total, { count }) => total + count, 0);

console.log("Repository hygiene: scanned " + files.length + " tracked path(s).");
for (const { category, count } of violations) {
  console.log("  " + category + ": " + count);
}

if (totalViolations > 0) {
  console.error(
    "Repository hygiene failed: " +
      totalViolations +
      " policy violation(s) found. File names and contents are intentionally redacted.",
  );
  process.exitCode = 1;
}
