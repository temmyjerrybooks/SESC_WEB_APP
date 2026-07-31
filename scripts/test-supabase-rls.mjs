import assert from "node:assert/strict";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.SESC_LOCAL_TEST_PASSWORD;

if (!url || !anonKey || !password) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SESC_LOCAL_TEST_PASSWORD are required.",
  );
}

if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("A service-role key must never be configured as a NEXT_PUBLIC_ value.");
}

const syntheticCategory = {
  chapterA: "synthetic-rls-chapter-a",
  chapterB: "synthetic-rls-chapter-b",
  member: "synthetic-rls-member",
  suspended: "synthetic-rls-suspended",
};
const syntheticNewsletterEmail = "rls-private-subscriber@sesc.test";
const syntheticContactEmail = "rls-private-contact@sesc.test";
const syntheticPrivateDocumentObjectId = "11111111-1111-4111-8111-111111111111";

async function signedIn(email) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(`Could not sign in ${email}: ${error?.message ?? "unknown error"}`);
  }
  return { client, user: data.user };
}

function returnedRows(result) {
  if (Array.isArray(result.data)) return result.data;
  return result.data ? [result.data] : [];
}

function assertNoVisibleRows(result, label) {
  assert.ok(
    result.error || returnedRows(result).length === 0,
    `${label}: protected rows were visible to this identity.`,
  );
}

function assertDeniedMutation(result, label) {
  assert.ok(
    result.error || returnedRows(result).length === 0,
    `${label}: browser-side mutation unexpectedly returned an affected row.`,
  );
}

async function readOne(client, table, columns, filter, label) {
  const result = await client.from(table).select(columns).match(filter).maybeSingle();
  assert.equal(result.error, null, `${label}: ${result.error?.message ?? "could not read record"}`);
  assert.ok(result.data, `${label}: synthetic record is missing.`);
  return result.data;
}

const anonymousClient = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const [
  visitor,
  applicant,
  member,
  suspendedMember,
  chapterApplicantA,
  chapterApplicantB,
  chapterExecutive,
  executive,
  administrator,
  superAdministrator,
] = await Promise.all([
  signedIn("visitor@sesc.test"),
  signedIn("applicant@sesc.test"),
  signedIn("member@sesc.test"),
  signedIn("suspended-member@sesc.test"),
  signedIn("chapter-a-applicant@sesc.test"),
  signedIn("chapter-b-applicant@sesc.test"),
  signedIn("chapter-executive@sesc.test"),
  signedIn("executive@sesc.test"),
  signedIn("administrator@sesc.test"),
  signedIn("super-administrator@sesc.test"),
]);

// 1. Public identities may read only their own minimal profile, never another
// identity's private profile.
const visitorProfile = await readOne(
  visitor.client,
  "profiles",
  "id, account_status",
  { id: visitor.user.id },
  "Visitor own profile",
);
assert.equal(visitorProfile.id, visitor.user.id, "Visitor profile ownership mismatch.");
assertNoVisibleRows(
  await visitor.client.from("profiles").select("id").eq("id", member.user.id),
  "Visitor cross-profile read",
);

// 2. An applicant cannot read a different applicant/member application.
const memberApplication = await readOne(
  member.client,
  "membership_applications",
  "id, status, applicant_id",
  { applicant_id: member.user.id, category_code: syntheticCategory.member },
  "Synthetic member application",
);
assertNoVisibleRows(
  await applicant.client
    .from("membership_applications")
    .select("id")
    .eq("id", memberApplication.id),
  "Applicant cross-application read",
);

// 3. A member cannot read another member profile or mutate their own approval.
assertNoVisibleRows(
  await member.client.from("profiles").select("id").eq("id", applicant.user.id),
  "Member cross-profile read",
);
assertDeniedMutation(
  await member.client
    .from("membership_applications")
    .update({ status: "rejected" })
    .eq("id", memberApplication.id)
    .select("id, status"),
  "Member application decision",
);
const applicationAfterDirectDecision = await readOne(
  member.client,
  "membership_applications",
  "id, status",
  { id: memberApplication.id },
  "Application after direct decision attempt",
);
assert.equal(
  applicationAfterDirectDecision.status,
  memberApplication.status,
  "Member changed an application status outside the trusted workflow.",
);

// 4. A member cannot change a membership status or payment outcome directly.
const memberMembership = await readOne(
  member.client,
  "memberships",
  "id, status, member_id",
  { application_id: memberApplication.id },
  "Synthetic active membership",
);
assertNoVisibleRows(
  await member.client
    .from("memberships")
    .select("id")
    .eq("member_id", suspendedMember.user.id)
    .eq("category_code", syntheticCategory.suspended),
  "Member cross-membership read",
);
assertDeniedMutation(
  await member.client
    .from("memberships")
    .update({ status: "suspended" })
    .eq("id", memberMembership.id)
    .select("id, status"),
  "Member membership-status update",
);
const membershipAfterDirectUpdate = await readOne(
  member.client,
  "memberships",
  "id, status",
  { id: memberMembership.id },
  "Membership after direct status attempt",
);
assert.equal(
  membershipAfterDirectUpdate.status,
  memberMembership.status,
  "Member changed their membership status outside the trusted workflow.",
);

const memberPayment = await readOne(
  member.client,
  "payments",
  "id, status, payer_id",
  { application_id: memberApplication.id },
  "Synthetic member payment",
);
assertDeniedMutation(
  await member.client
    .from("payments")
    .update({ status: "rejected" })
    .eq("id", memberPayment.id)
    .select("id, status"),
  "Member payment-status update",
);
const paymentAfterDirectUpdate = await readOne(
  member.client,
  "payments",
  "id, status",
  { id: memberPayment.id },
  "Payment after direct status attempt",
);
assert.equal(
  paymentAfterDirectUpdate.status,
  memberPayment.status,
  "Member changed a payment record outside the trusted workflow.",
);

// 5. Browser identities cannot grant roles or alter account state.
const memberRole = await readOne(
  member.client,
  "user_roles",
  "id, role_id, scope_id, revoked_at",
  { user_id: member.user.id },
  "Synthetic member role",
);
assertDeniedMutation(
  await member.client
    .from("user_roles")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", memberRole.id)
    .select("id, revoked_at"),
  "Member role mutation",
);
const roleAfterDirectUpdate = await readOne(
  member.client,
  "user_roles",
  "id, revoked_at",
  { id: memberRole.id },
  "Role after direct mutation attempt",
);
assert.equal(roleAfterDirectUpdate.revoked_at, memberRole.revoked_at, "Member changed their role assignment.");
assertDeniedMutation(
  await member.client
    .from("profiles")
    .update({ account_status: "suspended" })
    .eq("id", member.user.id)
    .select("id, account_status"),
  "Member account-status update",
);
const memberProfileAfterUpdate = await readOne(
  member.client,
  "profiles",
  "id, account_status",
  { id: member.user.id },
  "Profile after direct account-status attempt",
);
assert.equal(memberProfileAfterUpdate.account_status, "active", "Member changed their account status.");

// 6. Suspended accounts retain no protected member data visibility. The seed
// includes approved application, payment, membership, and notification rows
// for this identity so a successful assertion cannot be caused by empty data.
assertNoVisibleRows(
  await suspendedMember.client
    .from("membership_applications")
    .select("id")
    .eq("applicant_id", suspendedMember.user.id)
    .eq("category_code", syntheticCategory.suspended),
  "Suspended account application read",
);
assertNoVisibleRows(
  await suspendedMember.client
    .from("payments")
    .select("id")
    .eq("payer_id", suspendedMember.user.id)
    .eq("provider_reference", `synthetic-rls-${syntheticCategory.suspended}`),
  "Suspended account payment read",
);
assertNoVisibleRows(
  await suspendedMember.client
    .from("memberships")
    .select("id")
    .eq("member_id", suspendedMember.user.id)
    .eq("category_code", syntheticCategory.suspended),
  "Suspended account membership read",
);
assertNoVisibleRows(
  await suspendedMember.client
    .from("notifications")
    .select("id")
    .eq("user_id", suspendedMember.user.id)
    .eq("title", "Synthetic suspended-member RLS notification"),
  "Suspended account notification read",
);

// 7. A chapter executive receives a positive scoped result for Chapter A and
// a negative result for Chapter B. The national executive sees both fixture
// queue rows. The reference-only selects protect PII in the test itself.
const chapterAApplication = await readOne(
  chapterExecutive.client,
  "membership_applications",
  "id, reference_code, status",
  { applicant_id: chapterApplicantA.user.id, category_code: syntheticCategory.chapterA },
  "Chapter executive Chapter A application read",
);
assertNoVisibleRows(
  await chapterExecutive.client
    .from("membership_applications")
    .select("id")
    .eq("applicant_id", chapterApplicantB.user.id)
    .eq("category_code", syntheticCategory.chapterB),
  "Chapter executive Chapter B application read",
);
await readOne(
  chapterExecutive.client,
  "profiles",
  "id, home_chapter_id",
  { id: chapterApplicantA.user.id },
  "Chapter executive Chapter A profile read",
);
assertNoVisibleRows(
  await chapterExecutive.client.from("profiles").select("id").eq("id", chapterApplicantB.user.id),
  "Chapter executive Chapter B profile read",
);
await readOne(
  chapterExecutive.client,
  "memberships",
  "id, member_id, status",
  { member_id: member.user.id, category_code: syntheticCategory.member },
  "Chapter executive Chapter A membership read",
);
assertNoVisibleRows(
  await chapterExecutive.client
    .from("memberships")
    .select("id")
    .eq("member_id", suspendedMember.user.id)
    .eq("category_code", syntheticCategory.suspended),
  "Chapter executive Chapter B membership read",
);
const executiveQueue = await executive.client
  .from("membership_applications")
  .select("id, reference_code, status")
  .in("category_code", [syntheticCategory.chapterA, syntheticCategory.chapterB])
  .order("created_at", { ascending: true });
assert.equal(executiveQueue.error, null, "Executive scoped queue could not be evaluated.");
assert.equal(executiveQueue.data?.length, 2, "National executive did not receive both scoped fixture applications.");
assert.ok(
  executiveQueue.data?.some((row) => row.id === chapterAApplication.id),
  "National executive queue omitted the Chapter A fixture application.",
);
assertDeniedMutation(
  await executive.client.rpc("server_create_role_invitation", {
    p_actor_id: executive.user.id,
    p_email: "visitor@sesc.test",
    p_role_id: memberRole.role_id,
    p_scope_id: memberRole.scope_id,
    p_expires_at: new Date(Date.now() + 60_000).toISOString(),
  }),
  "Executive direct super-administrator operation",
);

// 8. An administrator cannot promote a user to super-administrator through
// raw browser table access. Super-admin identities are also forced through the
// server-only invitation workflow rather than direct SQL/RPC writes.
const superRoleResult = await administrator.client
  .from("roles")
  .select("id")
  .eq("code", "super_administrator")
  .maybeSingle();
assert.equal(superRoleResult.error, null, "Super-administrator role lookup failed.");
assert.ok(superRoleResult.data?.id, "Super-administrator role is missing from synthetic schema.");
assertDeniedMutation(
  await administrator.client
    .from("user_roles")
    .insert({
      user_id: administrator.user.id,
      role_id: superRoleResult.data.id,
      scope_id: memberRole.scope_id,
    })
    .select("id"),
  "Administrator self-promotion",
);
const superAssignments = await superAdministrator.client
  .from("user_roles")
  .select("id")
  .eq("user_id", administrator.user.id)
  .eq("role_id", superRoleResult.data.id);
assertNoVisibleRows(superAssignments, "Administrator super-administrator assignment after direct attempt");
assertDeniedMutation(
  await superAdministrator.client.rpc("server_create_role_invitation", {
    p_actor_id: superAdministrator.user.id,
    p_email: "visitor@sesc.test",
    p_role_id: superRoleResult.data.id,
    p_scope_id: memberRole.scope_id,
    p_expires_at: new Date(Date.now() + 60_000).toISOString(),
  }),
  "Super-administrator direct server-only operation",
);

// 9. Public-form data and private uploads are never browsable using anon or
// authenticated browser credentials. The seed creates exact private fixtures,
// so an empty result demonstrates policy enforcement rather than absent data.
assertNoVisibleRows(
  await anonymousClient.from("newsletter_subscribers").select("id").eq("email", syntheticNewsletterEmail),
  "Anonymous newsletter subscriber read",
);
assertNoVisibleRows(
  await anonymousClient.from("contact_enquiries").select("id").eq("email", syntheticContactEmail),
  "Anonymous contact enquiry read",
);
assertNoVisibleRows(
  await visitor.client.from("newsletter_subscribers").select("id").eq("email", syntheticNewsletterEmail),
  "Newsletter subscriber read",
);
assertNoVisibleRows(
  await visitor.client.from("contact_enquiries").select("id").eq("email", syntheticContactEmail),
  "Contact enquiry read",
);
const privateDocumentPath = `private/${member.user.id}/${syntheticPrivateDocumentObjectId}`;
assertNoVisibleRows(
  await member.client.from("member_documents").select("id").eq("storage_path", privateDocumentPath),
  "Raw member-document read",
);
const storageListing = await visitor.client.storage.from("member-private").list(`private/${member.user.id}`);
assertNoVisibleRows(storageListing, "Private storage listing");

process.stdout.write(
  "Supabase RLS integration checks passed: cross-identity reads, direct workflow mutations, roles, suspension, executive scope, public-form privacy, payments, and private storage boundaries. Run check:bundle separately to verify server credentials never enter browser assets.\n",
);
