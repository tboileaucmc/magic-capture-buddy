export const ATTACHMENT_ACCEPT = "image/jpeg,image/png,application/pdf,.eml,.msg";

export function attachmentMimeType(file: { name: string; type: string; size: number }): string | undefined {
  if (file.size > 5 * 1024 * 1024) return undefined;
  if (/\.eml$/i.test(file.name)) return "message/rfc822";
  if (/\.msg$/i.test(file.name)) return "application/vnd.ms-outlook";
  return /^(image\/jpeg|image\/png|application\/pdf)$/.test(file.type) ? file.type : undefined;
}