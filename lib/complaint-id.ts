// §22.2 — the human-facing Complaint ID: "short, unambiguous character set,
// no lookalikes". Excludes 0/O, 1/I/L and other easily-confused characters
// so it can be read aloud or copied off a phone screen without error.
const UNAMBIGUOUS_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generatePublicComplaintId(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += UNAMBIGUOUS_CHARS[Math.floor(Math.random() * UNAMBIGUOUS_CHARS.length)];
  }
  return `CC-${code.slice(0, 4)}-${code.slice(4)}`;
}
