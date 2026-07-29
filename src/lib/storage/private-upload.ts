export const privateDocumentKinds = [
  "profile_photo",
  "identity_document",
  "payment_receipt",
  "membership_document",
] as const;

export type PrivateDocumentKind = (typeof privateDocumentKinds)[number];

export type PrivateUploadInput = {
  kind: PrivateDocumentKind;
  fileName: string;
  mimeType: string;
  size: number;
  bytes?: Uint8Array;
};

type ValidationResult = { ok: true; normalizedExtension: string } | { ok: false; reason: string };

const maxBytes = 5 * 1024 * 1024;
const extensionsByKind: Record<PrivateDocumentKind, readonly string[]> = {
  profile_photo: ["jpg", "jpeg", "png", "webp"],
  identity_document: ["jpg", "jpeg", "png", "webp", "pdf"],
  payment_receipt: ["jpg", "jpeg", "png", "webp", "pdf"],
  membership_document: ["pdf"],
};

const mimeTypeByExtension: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

const strictUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extensionFrom(fileName: string): string | null {
  const match = /\.([A-Za-z0-9]{1,10})$/.exec(fileName.trim());
  return match?.[1]?.toLowerCase() ?? null;
}

function detectedKind(bytes: Uint8Array | undefined): "jpg" | "png" | "webp" | "pdf" | null {
  if (!bytes || bytes.length < 4) {
    return null;
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 8 && bytes.slice(0, 8).every((byte, index) => byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index])) return "png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";
  if (String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") return "pdf";
  return null;
}

export function validatePrivateUpload(input: PrivateUploadInput): ValidationResult {
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > maxBytes) {
    return { ok: false, reason: "File size is outside the approved limit." };
  }

  const extension = extensionFrom(input.fileName);
  if (!extension || !extensionsByKind[input.kind].includes(extension)) {
    return { ok: false, reason: "File extension is not approved for this document type." };
  }

  const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
  const normalizedMimeType = input.mimeType.toLowerCase();
  if (!allowedMimeTypes.has(normalizedMimeType) || mimeTypeByExtension[extension] !== normalizedMimeType) {
    return { ok: false, reason: "File MIME type is not approved." };
  }

  const detected = detectedKind(input.bytes);
  if (input.bytes && (!detected || (extension === "jpeg" ? detected !== "jpg" : detected !== extension))) {
    return { ok: false, reason: "File content does not match its declared type." };
  }

  return { ok: true, normalizedExtension: extension === "jpeg" ? "jpg" : extension };
}

export function createPrivateObjectPath(ownerUserId: string, kind: PrivateDocumentKind, randomId: string): string {
  if (!strictUuidPattern.test(ownerUserId) || !strictUuidPattern.test(randomId)) {
    throw new Error("Private object paths require UUID identifiers.");
  }

  return kind === "payment_receipt"
    ? `receipts/${ownerUserId}/${randomId}`
    : `private/${ownerUserId}/${randomId}`;
}
