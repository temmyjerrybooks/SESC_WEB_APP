import { safeRelativePath } from "@/lib/auth/safe-redirect";

export type NotificationDraft = {
  recipientUserId: string;
  title: string;
  body: string;
  deepLink?: string | null;
};

export function isNotificationOwner(recipientUserId: string, actorUserId: string): boolean {
  return Boolean(recipientUserId && actorUserId && recipientUserId === actorUserId);
}

export function normalizeNotificationDraft(draft: NotificationDraft): NotificationDraft {
  return {
    ...draft,
    title: draft.title.trim().slice(0, 180),
    body: draft.body.trim().slice(0, 2_000),
    deepLink: draft.deepLink ? safeRelativePath(draft.deepLink, "/member") : null,
  };
}

export function clampNotificationPageSize(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 20;
  }

  return Math.min(100, Math.max(1, Math.floor(value ?? 20)));
}
