import zxcvbn from "zxcvbn";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;
export const MIN_PASSWORD_ENTROPY = 50;

/** Guess-based estimate, not theoretical character-pool entropy. Runs locally. */
export function evaluatePlanningPassword(password: string, email = "") {
  const result = zxcvbn(password.slice(0, MAX_PASSWORD_LENGTH), [
    "cinemeccanica", "planning", "support", ...email.toLowerCase().split(/[@._\-]+/).filter(Boolean),
  ]);
  const entropyBits = Math.max(0, result.guesses_log10 * Math.log2(10));
  const accepted = password.length >= MIN_PASSWORD_LENGTH
    && password.length <= MAX_PASSWORD_LENGTH
    && result.score === 4 && entropyBits >= MIN_PASSWORD_ENTROPY;
  return { score: result.score, entropyBits, accepted };
}