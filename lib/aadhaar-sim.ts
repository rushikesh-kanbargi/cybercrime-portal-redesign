// Simulated Aadhaar sign-in helpers.
//
// Read this before changing anything here:
//
// The product's reporting flows deliberately do NOT collect Aadhaar — that is
// PROJECT_SPEC D1/D2 and §26 item 1, and it stays true. This module powers a
// separate, optional *demo sign-in* only: a returning citizen proves who they
// are with a number they already have, instead of creating yet another
// account. No Aadhaar number is ever attached to a complaint, sent anywhere,
// or checked against UIDAI or any other service. The lookup is a plain SELECT
// against `aadhaar_records_sim`, a table of invented rows this repo seeds
// itself.
//
// Every simulated number begins `0000`. UIDAI never issues a number whose
// first digit is 0 or 1, so a `0000`-prefixed value is structurally incapable
// of being someone's real Aadhaar number. `assertSimulatedAadhaar` enforces
// that on the way in, which means a citizen who types their real number is
// rejected before it is ever looked up, logged, or stored.

// The demo sign-in code, fixed on purpose so a live demo is repeatable. It is
// rendered on screen at the moment it is needed and documented on
// /whats-real — it authenticates nothing but these invented records, and no
// real credential exists for it to bypass.
export const DEMO_AADHAAR_OTP = "123456";

// UIDAI's real allocation starts at 2. `0000` is ours, and unmistakably fake.
export const SIM_AADHAAR_PREFIX = "0000";

export function normalizeAadhaar(input: string): string {
  return input.replace(/\D/g, "");
}

/** `0000 1111 2222` — how an Aadhaar number is conventionally grouped. */
export function formatAadhaar(aadhaar: string): string {
  return normalizeAadhaar(aadhaar).replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** Never echo the whole number back. Matches maskMobile's house style. */
export function maskAadhaar(aadhaar: string): string {
  const digits = normalizeAadhaar(aadhaar);
  if (digits.length < 4) return "••••";
  return `•••• •••• ${digits.slice(-4)}`;
}

export type AadhaarRejection = "AADHAAR_LENGTH" | "AADHAAR_NOT_SIMULATED";

/**
 * Returns null when the input is a well-formed simulated number, or a stable
 * discriminator the UI maps to a translated string (§17.3.1 house rule).
 */
export function checkSimulatedAadhaar(input: string): AadhaarRejection | null {
  const digits = normalizeAadhaar(input);
  if (digits.length !== 12) return "AADHAAR_LENGTH";
  if (!digits.startsWith(SIM_AADHAAR_PREFIX)) return "AADHAAR_NOT_SIMULATED";
  return null;
}
