// Evidence-upload limits — shared between client (UI copy, pre-checks) and
// server (the actual trust boundary, §18.2). Neither §22 nor §18 in
// PROJECT_SPEC.md documents a size cap, so this is a chosen value — see D-##
// in PROJECT_SPEC.md §33: 8 MB per file post-compression, 5 files per
// report. Well above the incumbent's 5 MB wall (P12) which rejected typical
// PDF bank statements.

export const EVIDENCE_MAX_FILES = 5;
export const EVIDENCE_MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB, post-compression for images
// Raw (pre-compression) input cap — generous, since images shrink a lot.
export const EVIDENCE_MAX_RAW_INPUT_BYTES = 40 * 1024 * 1024; // 40 MB

// MIME allow-list, each mapped to its magic-byte signature checked
// server-side (§23 "MIME allow-list + magic-byte check"). Client `accept`
// attribute is UX only — the server never trusts a client-supplied MIME
// type (§18.2 trust-boundary rule). Extensions are listed alongside their
// MIME types (not just the MIME types) because some browsers/OSes report an
// empty or generic `file.type` for certain files — FileUpload's own
// accept-matching (components/ui/file-upload.tsx) falls back to the
// extension the same way this list does.
export const EVIDENCE_ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf";

export const EVIDENCE_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
