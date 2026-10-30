/** Open the company web client's dialer; the user confirms the call in 3CX. */
export function threeCxCallUrl(extension: string): string | undefined {
  const number = extension.replace(/\s/g, "");
  if (!/^\d+$/.test(number)) return undefined;
  return `https://cinemeccanica.on3cx.fr/#/call?phone=${encodeURIComponent(number)}`;
}