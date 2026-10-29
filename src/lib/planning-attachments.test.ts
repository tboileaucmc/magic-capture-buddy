import { describe, expect, it } from "bun:test";
import { attachmentMimeType } from "./planning-attachments";

describe("mission email attachments", () => {
  it("accepts .eml files even without a browser MIME type", () => {
    expect(attachmentMimeType({ name: "mail.EML", type: "", size: 100 })).toBe("message/rfc822");
  });
  it("accepts Outlook .msg files with a generic browser MIME type", () => {
    expect(attachmentMimeType({ name: "mail.msg", type: "application/octet-stream", size: 100 })).toBe("application/vnd.ms-outlook");
  });
  it("keeps the 5 MiB size limit for email attachments", () => {
    expect(attachmentMimeType({ name: "mail.eml", type: "", size: 5 * 1024 * 1024 })).toBe("message/rfc822");
    expect(attachmentMimeType({ name: "mail.eml", type: "", size: 5 * 1024 * 1024 + 1 })).toBeUndefined();
  });
  it("rejects unsupported files", () => {
    expect(attachmentMimeType({ name: "file.exe", type: "application/octet-stream", size: 100 })).toBeUndefined();
  });
});