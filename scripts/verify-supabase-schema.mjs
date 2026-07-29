import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(process.cwd());
const migrationsDirectory = join(repositoryRoot, "supabase", "migrations");
const failures = [];

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function escapeRegExp(value) {
  return value.replace(/[\-\[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

expect(existsSync(migrationsDirectory), "Missing supabase/migrations directory.");

const migrationFiles = existsSync(migrationsDirectory)
  ? readdirSync(migrationsDirectory)
      .filter((file) => file.endsWith(".sql"))
      .sort()
  : [];

expect(migrationFiles.length > 0, "No Supabase SQL migrations were found.");

const migrations = new Map(
  migrationFiles.map((file) => [
    file,
    readFileSync(join(migrationsDirectory, file), "utf8"),
  ]),
);
const allSql = [...migrations.values()].join("\n");
const workflowMigrationName =
  "20260729000001_production_workflow_foundation.sql";
const workflowSql = migrations.get(workflowMigrationName) ?? "";

expect(
  migrations.has("20260729000000_add_application_resubmitted_status.sql"),
  "Missing the forward migration that adds application status resubmitted.",
);
expect(
  /alter\s+type\s+public\.application_status\s+add\s+value\s+if\s+not\s+exists\s+'resubmitted'/i.test(
    allSql,
  ),
  "The application_status enum does not add resubmitted.",
);
expect(
  workflowSql.length > 0,
  "Missing " + workflowMigrationName + ".",
);

const requiredTables = {
  profiles: "profiles",
  chapters: "chapters",
  membershipPlans: "membership_plans",
  membershipApplications: "membership_applications",
  membershipApplicationSteps: "membership_application_steps",
  memberDocuments: "member_documents",
  memberships: "memberships",
  membershipRenewals: "membership_renewals",
  payments: "payments",
  paymentReceipts: "payment_receipts",
  paymentVerifications: "payment_verifications",
  roles: "roles",
  permissions: "permissions",
  rolePermissions: "role_permissions",
  userRoles: "user_roles",
  roleScopes: "access_scopes",
  newsletterSubscribers: "newsletter_subscribers",
  notifications: "notifications",
  notificationPreferences: "notification_preferences",
  roleInvitations: "role_invitations",
  auditLogs: "audit_log",
  securityEvents: "security_events",
};

for (const [label, table] of Object.entries(requiredTables)) {
  const pattern = new RegExp(
    "create\\s+table\\s+public\\." + escapeRegExp(table) + "\\b",
    "i",
  );
  expect(pattern.test(allSql), "Missing required " + label + " table (" + table + ").");
}

const rlsTables = [
  "profiles",
  "chapters",
  "access_scopes",
  "roles",
  "permissions",
  "role_permissions",
  "user_roles",
  "user_chapter_assignments",
  "membership_applications",
  "payments",
  "memberships",
  "audit_log",
  "notifications",
  "membership_plans",
  "membership_application_steps",
  "member_documents",
  "membership_renewals",
  "payment_receipts",
  "payment_verifications",
  "newsletter_subscribers",
  "notification_preferences",
  "role_invitations",
  "security_events",
];

for (const table of rlsTables) {
  const pattern = new RegExp(
    "alter\\s+table\\s+public\\." +
      escapeRegExp(table) +
      "\\s+enable\\s+row\\s+level\\s+security",
    "i",
  );
  expect(pattern.test(allSql), "RLS is not enabled for public." + table + ".");
}

expect(
  /membership_applications_one_open_per_user_idx[\s\S]*?'resubmitted'/i.test(
    workflowSql,
  ),
  "The one-open-application index does not cover resubmitted applications.",
);
expect(
  /revoke\s+insert,\s*update,\s*delete\s+on\s+all\s+tables\s+in\s+schema\s+public\s+from\s+anon,\s*authenticated/i.test(
    workflowSql,
  ),
  "The pre-production browser write lock is not enforced with table privileges.",
);
expect(
  /revoke\s+select,\s*insert,\s*update,\s*delete\s+on\s+storage\.objects\s+from\s+anon,\s*authenticated/i.test(
    workflowSql,
  ),
  "Private Storage objects are not denied to browser roles.",
);

const requiredWritePolicyDrops = [
  "applications_insert_owner",
  "applications_update_owner_or_reviewer",
  "payments_insert_owner",
  "payments_update_owner_or_reviewer",
  "memberships_manage_scoped_staff",
  "user_roles_insert_scope_manager",
  "user_roles_update_scope_manager",
  "user_roles_delete_scope_manager",
];

for (const policy of requiredWritePolicyDrops) {
  expect(
    workflowSql.includes('drop policy if exists "' + policy + '"'),
    "The browser write policy " + policy + " is not explicitly removed.",
  );
}

const applicationPolicy = workflowSql.match(
  /create\s+policy\s+"applications_select_owner_or_reviewer"[\s\S]*?;/i,
);
expect(
  Boolean(applicationPolicy),
  "The replacement application read policy is missing.",
);
expect(
  !/payment\.review/i.test(applicationPolicy?.[0] ?? ""),
  "Finance permission is still present in the application read policy.",
);
expect(
  /drop\s+policy\s+if\s+exists\s+"payments_select_owner_or_reviewer"/i.test(
    workflowSql,
  ) && /create\s+policy\s+"payments_select_owner"/i.test(workflowSql),
  "Raw payment reads are not restricted to the payer.",
);

const financeQueue = workflowSql.match(
  /create\s+or\s+replace\s+function\s+public\.finance_payment_queue[\s\S]*?\$\$;/i,
);
expect(Boolean(financeQueue), "The minimal finance payment queue RPC is missing.");

const prohibitedFinanceFields = [
  "first_name",
  "last_name",
  "date_of_birth",
  "emergency_contact",
  "identity_document_path",
  "profile_photo_path",
  "address_line_1",
  "address_line_2",
  "bank_reference",
  "provider_reference",
  "receipt_path",
];

for (const field of prohibitedFinanceFields) {
  expect(
    !new RegExp("\\b" + escapeRegExp(field) + "\\b", "i").test(
      financeQueue?.[0] ?? "",
    ),
    "Finance queue exposes prohibited private field " + field + ".",
  );
}

const policyTargets = [
  ...workflowSql.matchAll(
    /create\s+policy\s+"[^"]+"\s+on\s+public\.([a-z_]+)/gi,
  ),
].map((match) => match[1]);

for (const table of [
  "member_documents",
  "payment_receipts",
  "newsletter_subscribers",
]) {
  expect(
    !policyTargets.includes(table),
    "Browser policy unexpectedly grants direct access to public." + table + ".",
  );
}

expect(
  /storage_path\s+~\s+'\^private\//i.test(workflowSql) &&
    /storage_path\s+~\s+'\^receipts\//i.test(workflowSql),
  "Private document and receipt paths are not constrained to opaque paths.",
);
expect(
  /insert\s+into\s+storage\.buckets[\s\S]*?'membership-documents'[\s\S]*?false/i.test(
    workflowSql,
  ),
  "The private membership-documents Storage bucket is missing or public.",
);
expect(
  /create\s+table\s+public\.security_events/i.test(workflowSql) &&
    /security_events_metadata_has_no_top_level_secrets/i.test(workflowSql),
  "Security-event foundation or secret-metadata protection is missing.",
);

const authFoundationSql = migrations.get(
  "20260729000002_auth_invitation_and_notification_foundation.sql",
) ?? "";
expect(
  authFoundationSql.length > 0,
  "Missing auth invitation and notification foundation migration.",
);
expect(
  /create\s+or\s+replace\s+function\s+public\.mark_notification_read/i.test(
    authFoundationSql,
  ) && /create\s+or\s+replace\s+function\s+public\.mark_all_notifications_read/i.test(
    authFoundationSql,
  ),
  "Recipient-only notification read functions are missing.",
);
expect(
  /token_hash\s+char\(64\)/i.test(authFoundationSql) &&
    /alter\s+table\s+public\.role_invitations\s+enable\s+row\s+level\s+security/i.test(
      authFoundationSql,
    ),
  "Role invitation tokens are not hashed or invitation RLS is missing.",
);

if (failures.length > 0) {
  process.stderr.write(
    "Supabase static schema/RLS verification failed:\n" +
      failures.map((failure) => "- " + failure).join("\n") +
      "\n",
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    "Supabase static schema/RLS verification passed (" +
      migrationFiles.length +
      " migrations checked).\n",
  );
}
