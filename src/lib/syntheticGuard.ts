/**
 * Synthetic Data Guard for Arkiv DB-Chain
 *
 * CRITICAL HACKATHON SECURITY REQUIREMENT:
 * Strictly prevents any real PII (phone numbers, personal names, genuine VPAs)
 * from ever being submitted to the public immutable Arkiv DB-Chain.
 */

// Must contain .synth@ or .demo@ to prevent accidental real VPA leakage
const SYNTHETIC_UPI_REGEX = /^[a-zA-Z0-9_-]+(?:\.synth|\.demo)@[a-zA-Z0-9]+$/;

// Specifically identify and block dangerous Indian 10-digit mobile number patterns
const PHONE_NUMBER_REGEX = /(?:\+91|91)?[6-9]\d{9}/;

// Synthetic UTR transaction reference pattern
const SYNTHETIC_UTR_REGEX = /^(?:SYNTH|MOCK|TEST)-UTR-\d{10,16}$/;

export class RealPiiBlockedError extends Error {
  constructor(message: string) {
    super(`[ARKIV SECURITY GATE] ${message}`);
    this.name = "RealPiiBlockedError";
  }
}

/**
 * Validates whether a given UPI alias is guaranteed synthetic.
 */
export function isSyntheticUpi(alias: string): boolean {
  if (!alias || typeof alias !== "string") return false;
  if (PHONE_NUMBER_REGEX.test(alias)) return false;
  return SYNTHETIC_UPI_REGEX.test(alias.trim().toLowerCase());
}

/**
 * Throws a security exception if the UPI string contains real PII or violates synthetic naming.
 */
export function assertSyntheticUpi(alias: string): void {
  const clean = (alias || "").trim().toLowerCase();

  if (PHONE_NUMBER_REGEX.test(clean)) {
    throw new RealPiiBlockedError(
      "Direct 10-digit phone number or mobile UPI detected. Real PII is strictly prohibited on Arkiv."
    );
  }

  if (!clean.includes(".synth@") && !clean.includes(".demo@")) {
    throw new RealPiiBlockedError(
      `Invalid UPI alias "${alias}". All UPI handles on PhantomUPI must use the synthetic routing format: <name>.synth@<bank> (e.g., rahul.synth@okaxis)`
    );
  }

  if (!SYNTHETIC_UPI_REGEX.test(clean)) {
    throw new RealPiiBlockedError(
      `Malformed synthetic UPI alias: "${alias}". Expected alphanumeric format: <user>.synth@<bank>`
    );
  }
}

/**
 * Validates whether a UTR reference number is synthetic.
 */
export function isSyntheticUtr(utr: string): boolean {
  if (!utr || typeof utr !== "string") return false;
  return SYNTHETIC_UTR_REGEX.test(utr.trim());
}

/**
 * Throws an error if the UTR is not prefixed with SYNTH-UTR or MOCK-UTR.
 */
export function assertSyntheticUtr(utr: string): void {
  if (!isSyntheticUtr(utr)) {
    throw new RealPiiBlockedError(
      `Invalid UTR "${utr}". Synthetic UTR must follow the format: SYNTH-UTR-<digits> (e.g., SYNTH-UTR-982341239120)`
    );
  }
}

/**
 * Generates an auditable synthetic UPI alias for demo and test purposes.
 */
export function generateSyntheticUpi(alias = "trader", bank = "okhdfc"): string {
  const sanitized = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${sanitized}.synth@${bank}`;
}

/**
 * Generates an auditable synthetic UTR number.
 */
export function generateSyntheticUtr(): string {
  const randomSuffix = Math.floor(100000000000 + Math.random() * 900000000000);
  return `SYNTH-UTR-${randomSuffix}`;
}
