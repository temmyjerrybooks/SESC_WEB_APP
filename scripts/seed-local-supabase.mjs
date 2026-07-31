import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SESC_LOCAL_TEST_PASSWORD;
const allowDisposableHosted = process.env.SESC_ALLOW_DISPOSABLE_SUPABASE_SEED === "true";

if (!url || !serviceRoleKey || !password) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SESC_LOCAL_TEST_PASSWORD are required.",
  );
}

const localUrl = /^https?:\/\/(127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/i.test(url);
if (!localUrl && !allowDisposableHosted) {
  throw new Error(
    "Refusing to seed a non-local project. Set SESC_ALLOW_DISPOSABLE_SUPABASE_SEED=true only for an authorised disposable project.",
  );
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const identities = [
  { key: "visitor", email: "visitor@sesc.test", displayName: "Synthetic Visitor", roles: ["visitor"], status: "active" },
  { key: "applicant", email: "applicant@sesc.test", displayName: "Synthetic Applicant", roles: ["applicant"], status: "active" },
  { key: "pending", email: "pending-member@sesc.test", displayName: "Synthetic Pending Member", roles: ["applicant"], status: "active" },
  { key: "member", email: "member@sesc.test", displayName: "Synthetic Approved Member", roles: ["member"], status: "active" },
  { key: "suspended", email: "suspended-member@sesc.test", displayName: "Synthetic Suspended Member", roles: ["member"], status: "suspended" },
  { key: "chapterApplicantA", email: "chapter-a-applicant@sesc.test", displayName: "Synthetic Chapter A Applicant", roles: ["applicant"], status: "active" },
  { key: "chapterApplicantB", email: "chapter-b-applicant@sesc.test", displayName: "Synthetic Chapter B Applicant", roles: ["applicant"], status: "active" },
  { key: "chapterExecutive", email: "chapter-executive@sesc.test", displayName: "Synthetic Chapter Executive", roles: ["visitor"], status: "active" },
  { key: "executive", email: "executive@sesc.test", displayName: "Synthetic Executive", roles: ["national_executive"], status: "active" },
  { key: "administrator", email: "administrator@sesc.test", displayName: "Synthetic Administrator", roles: ["membership_officer"], status: "active" },
  { key: "superAdministrator", email: "super-administrator@sesc.test", displayName: "Synthetic Super Administrator", roles: ["super_administrator"], status: "active" },
];

const syntheticCategory = {
  chapterA: "synthetic-rls-chapter-a",
  chapterB: "synthetic-rls-chapter-b",
  member: "synthetic-rls-member",
  suspended: "synthetic-rls-suspended",
};
const syntheticPrivateDocumentObjectId = "11111111-1111-4111-8111-111111111111";
const syntheticNewsletterEmail = "rls-private-subscriber@sesc.test";
const syntheticContactEmail = "rls-private-contact@sesc.test";

async function must(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function findOrCreateUser(identity) {
  const users = await must(
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    "List local test users",
  );
  const existing = users.users.find((user) => user.email?.toLowerCase() === identity.email);
  if (existing) return existing;

  const created = await must(
    supabase.auth.admin.createUser({
      email: identity.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: identity.displayName, synthetic_test_data: true },
    }),
    `Create ${identity.email}`,
  );
  if (!created.user) throw new Error(`Could not create ${identity.email}.`);
  return created.user;
}

async function ensureActiveChapter({ slug, name, stateOrRegion }) {
  const chapter = await must(
    supabase
      .from("chapters")
      .upsert(
        {
          slug,
          name,
          kind: "state",
          state_or_region: stateOrRegion,
          country_code: "NG",
          status: "active",
        },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single(),
    `Upsert synthetic chapter ${slug}`,
  );

  let scope = await must(
    supabase
      .from("access_scopes")
      .select("id")
      .eq("kind", "chapter")
      .eq("chapter_id", chapter.id)
      .maybeSingle(),
    `Read synthetic chapter scope ${slug}`,
  );
  if (!scope) {
    scope = await must(
      supabase
        .from("access_scopes")
        .insert({ kind: "chapter", chapter_id: chapter.id, label: `${name} (synthetic RLS fixture)` })
        .select("id")
        .single(),
      `Create synthetic chapter scope ${slug}`,
    );
  }

  return { id: chapter.id, scopeId: scope.id };
}

async function ensureRoleAssignment({ userId, roleId, scopeId, grantedBy, label }) {
  const existing = await must(
    supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role_id", roleId)
      .eq("scope_id", scopeId)
      .is("revoked_at", null)
      .maybeSingle(),
    `Read ${label} role assignment`,
  );
  if (!existing) {
    await must(
      supabase.from("user_roles").insert({ user_id: userId, role_id: roleId, scope_id: scopeId, granted_by: grantedBy }),
      `Assign ${label} role`,
    );
  }
}

async function ensureApplication({ user, chapterId, plan, categoryCode, status, label }) {
  let application = await must(
    supabase
      .from("membership_applications")
      .select("id")
      .eq("applicant_id", user.id)
      .eq("category_code", categoryCode)
      .maybeSingle(),
    `Read ${label} application`,
  );

  const fixture = {
    applicant_id: user.id,
    chapter_id: chapterId,
    membership_plan_id: plan.id,
    category_code: categoryCode,
    status,
    first_name: "Synthetic",
    last_name: label,
    date_of_birth: "1990-01-01",
    phone: "+234000000000",
    residence_country: "NG",
    address_line_1: "Synthetic local-test address",
    city: "Test City",
    emergency_contact: { name: "Synthetic Contact", phone: "+234000000001" },
  };

  if (application) {
    await must(
      supabase.from("membership_applications").update(fixture).eq("id", application.id),
      `Refresh ${label} application`,
    );
  } else {
    application = await must(
      supabase.from("membership_applications").insert(fixture).select("id").single(),
      `Create ${label} application`,
    );
  }

  return application;
}

async function ensureApprovedMembership({ user, chapterId, plan, categoryCode, status, administrator, label }) {
  const application = await ensureApplication({
    user,
    chapterId,
    plan,
    categoryCode,
    status: "approved",
    label,
  });

  let payment = await must(
    supabase
      .from("payments")
      .select("id")
      .eq("application_id", application.id)
      .eq("method", "paystack")
      .maybeSingle(),
    `Read ${label} payment`,
  );
  const paymentFixture = {
    application_id: application.id,
    payer_id: user.id,
    method: "paystack",
    status: "approved",
    amount_minor: 0,
    currency: "NGN",
    provider_reference: `synthetic-rls-${categoryCode}`,
    verified_by: administrator.id,
    verified_at: new Date().toISOString(),
  };
  if (payment) {
    await must(supabase.from("payments").update(paymentFixture).eq("id", payment.id), `Refresh ${label} payment`);
  } else {
    payment = await must(
      supabase.from("payments").insert(paymentFixture).select("id").single(),
      `Create ${label} payment`,
    );
  }

  const membershipFixture = {
    application_id: application.id,
    member_id: user.id,
    chapter_id: chapterId,
    category_code: categoryCode,
    status,
    activated_at: new Date().toISOString(),
    activated_by: administrator.id,
    activation_payment_id: payment.id,
    suspended_at: status === "suspended" ? new Date().toISOString() : null,
    suspension_reason: status === "suspended" ? "Synthetic RLS suspension fixture." : null,
  };
  const membership = await must(
    supabase
      .from("memberships")
      .select("id")
      .eq("application_id", application.id)
      .maybeSingle(),
    `Read ${label} membership`,
  );
  if (membership) {
    await must(supabase.from("memberships").update(membershipFixture).eq("id", membership.id), `Refresh ${label} membership`);
  } else {
    await must(supabase.from("memberships").insert(membershipFixture), `Create ${label} membership`);
  }

  return { application, payment };
}

async function ensureSyntheticNotification(userId, title) {
  const existing = await must(
    supabase.from("notifications").select("id").eq("user_id", userId).eq("title", title).maybeSingle(),
    `Read ${title} notification`,
  );
  if (!existing) {
    await must(
      supabase.from("notifications").insert({
        user_id: userId,
        category: "system",
        title,
        body: "Synthetic local-only notification used to verify RLS visibility.",
        action_url: "/member",
      }),
      `Create ${title} notification`,
    );
  }
}

const usersByKey = new Map();
for (const identity of identities) {
  const user = await findOrCreateUser(identity);
  usersByKey.set(identity.key, user);
  await must(
    supabase.from("profiles").upsert({
      id: user.id,
      email: identity.email,
      display_name: identity.displayName,
      account_status: identity.status,
    }),
    `Upsert profile for ${identity.email}`,
  );
}

const roles = await must(supabase.from("roles").select("id, code"), "Read roles");
const scopes = await must(supabase.from("access_scopes").select("id, kind"), "Read access scopes");
const globalScope = scopes.find((scope) => scope.kind === "global");
const nationalScope = scopes.find((scope) => scope.kind === "national");
if (!globalScope || !nationalScope) throw new Error("Required global and national scopes are missing.");

for (const identity of identities) {
  const user = usersByKey.get(identity.key);
  for (const roleCode of identity.roles) {
    const role = roles.find((candidate) => candidate.code === roleCode);
    if (!role) throw new Error(`Missing role ${roleCode}.`);
    const scopeId = ["super_administrator", "visitor", "applicant", "member"].includes(roleCode)
      ? globalScope.id
      : nationalScope.id;
    const existing = await must(
      supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role_id", role.id)
        .eq("scope_id", scopeId)
        .is("revoked_at", null)
        .maybeSingle(),
      `Read ${roleCode} assignment`,
    );
    if (!existing) {
      await must(
        supabase.from("user_roles").insert({
          user_id: user.id,
          role_id: role.id,
          scope_id: scopeId,
          granted_by: usersByKey.get("superAdministrator").id,
        }),
        `Assign ${roleCode} to ${identity.email}`,
      );
    }
  }
}

const member = usersByKey.get("member");
const suspendedMember = usersByKey.get("suspended");
const chapterApplicantA = usersByKey.get("chapterApplicantA");
const chapterApplicantB = usersByKey.get("chapterApplicantB");
const chapterExecutive = usersByKey.get("chapterExecutive");
const administrator = usersByKey.get("administrator");
if (!member || !suspendedMember || !chapterApplicantA || !chapterApplicantB || !chapterExecutive || !administrator) {
  throw new Error("Synthetic RLS identities were not initialised.");
}

const plan = await must(
  supabase.from("membership_plans").select("id").eq("code", "local-standard").eq("status", "active").maybeSingle(),
  "Read synthetic local membership plan",
);
if (!plan) {
  throw new Error("The synthetic local-standard membership plan is required. Run supabase:reset before seeding RLS fixtures.");
}

const chapterA = await ensureActiveChapter({
  slug: "synthetic-rls-chapter-a",
  name: "Synthetic RLS Chapter A",
  stateOrRegion: "Synthetic Chapter A - local test only",
});
const chapterB = await ensureActiveChapter({
  slug: "synthetic-rls-chapter-b",
  name: "Synthetic RLS Chapter B",
  stateOrRegion: "Synthetic Chapter B - local test only",
});
const chapterExecutiveRole = roles.find((role) => role.code === "chapter_executive");
if (!chapterExecutiveRole) throw new Error("Missing chapter_executive role.");
await ensureRoleAssignment({
  userId: chapterExecutive.id,
  roleId: chapterExecutiveRole.id,
  scopeId: chapterA.scopeId,
  grantedBy: administrator.id,
  label: "synthetic Chapter A executive",
});

await must(
  supabase.from("profiles").update({ home_chapter_id: chapterA.id }).in("id", [member.id, chapterApplicantA.id, chapterExecutive.id]),
  "Assign synthetic Chapter A profiles",
);
await must(
  supabase.from("profiles").update({ home_chapter_id: chapterB.id }).in("id", [suspendedMember.id, chapterApplicantB.id]),
  "Assign synthetic Chapter B profiles",
);

const memberFixture = await ensureApprovedMembership({
  user: member,
  chapterId: chapterA.id,
  plan,
  categoryCode: syntheticCategory.member,
  status: "active",
  administrator,
  label: "Synthetic Member",
});
await ensureApprovedMembership({
  user: suspendedMember,
  chapterId: chapterB.id,
  plan,
  categoryCode: syntheticCategory.suspended,
  status: "suspended",
  administrator,
  label: "Synthetic Suspended Member",
});
await ensureApplication({
  user: chapterApplicantA,
  chapterId: chapterA.id,
  plan,
  categoryCode: syntheticCategory.chapterA,
  status: "submitted",
  label: "Synthetic Chapter A Applicant",
});
await ensureApplication({
  user: chapterApplicantB,
  chapterId: chapterB.id,
  plan,
  categoryCode: syntheticCategory.chapterB,
  status: "submitted",
  label: "Synthetic Chapter B Applicant",
});

await ensureSyntheticNotification(member.id, "Synthetic active-member RLS notification");
await ensureSyntheticNotification(suspendedMember.id, "Synthetic suspended-member RLS notification");

await must(
  supabase.from("newsletter_subscribers").upsert(
    {
      email: syntheticNewsletterEmail,
      status: "active",
      consented_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      confirmation_token: "22222222-2222-4222-8222-222222222222",
      confirmation_sent_at: new Date().toISOString(),
      source_page: "/synthetic-rls-fixture",
      metadata: { synthetic_test_data: true },
    },
    { onConflict: "email" },
  ),
  "Upsert synthetic newsletter privacy fixture",
);
const contactFixture = await must(
  supabase.from("contact_enquiries").select("id").eq("email", syntheticContactEmail).maybeSingle(),
  "Read synthetic contact privacy fixture",
);
if (!contactFixture) {
  await must(
    supabase.from("contact_enquiries").insert({
      name: "Synthetic RLS Contact",
      email: syntheticContactEmail,
      subject: "Synthetic RLS privacy fixture",
      message: "This synthetic local-only contact enquiry exists solely to exercise RLS visibility checks.",
      source_page: "/synthetic-rls-fixture",
    }),
    "Create synthetic contact privacy fixture",
  );
}

const privateDocumentPath = `private/${member.id}/${syntheticPrivateDocumentObjectId}`;
const privateDocumentBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lhB8WQAAAABJRU5ErkJggg==",
  "base64",
);
await must(
  supabase.storage.from("member-private").upload(privateDocumentPath, privateDocumentBytes, {
    contentType: "image/png",
    upsert: true,
  }),
  "Upload synthetic private storage fixture",
);
const privateDocument = await must(
  supabase.from("member_documents").select("id").eq("storage_path", privateDocumentPath).maybeSingle(),
  "Read synthetic private document fixture",
);
if (!privateDocument) {
  await must(
    supabase.from("member_documents").insert({
      owner_id: member.id,
      application_id: memberFixture.application.id,
      document_kind: "other",
      bucket_id: "member-private",
      storage_path: privateDocumentPath,
      mime_type: "image/png",
      file_extension: "png",
      byte_size: privateDocumentBytes.byteLength,
      checksum_sha256: createHash("sha256").update(privateDocumentBytes).digest("hex"),
      uploaded_by: member.id,
    }),
    "Create synthetic private document fixture",
  );
}

process.stdout.write(
  `Seeded ${identities.length} synthetic .test identities. Password: supplied through SESC_LOCAL_TEST_PASSWORD.\n`,
);
