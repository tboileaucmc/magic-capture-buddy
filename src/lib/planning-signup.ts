/** New accounts only: existing users can still sign in with their current email. */
export function isPlanningSignupEmail(email: string): boolean {
  return /^[^\s@]+@cinemeccanica\.fr$/i.test(email.trim());
}