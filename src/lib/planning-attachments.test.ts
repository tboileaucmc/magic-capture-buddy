import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { attachmentMimeType } from "./planning-attachments";

describe("mission email attachments", () => {
  it("accepts .eml files even without a browser MIME type", () => {
    assert.equal(attachmentMimeType({ name: "mail.EML", type: "", size: 100 }), "message/rfc822");
  });
  it("accepts Outlook .msg files with a generic browser MIME type", () => {
    assert.equal(attachmentMimeType({ name: "mail.msg", type: "application/octet-stream", size: 100 }), "application/vnd.ms-outlook");
  });
  it("keeps the 5 MiB size limit for email attachments", () => {
    assert.equal(attachmentMimeType({ name: "mail.eml", type: "", size: 5 * 1024 * 1024 }), "message/rfc822");
    assert.equal(attachmentMimeType({ name: "mail.eml", type: "", size: 5 * 1024 * 1024 + 1 }), undefined);
  });
  it("rejects unsupported files", () => {
    assert.equal(attachmentMimeType({ name: "file.exe", type: "application/octet-stream", size: 100 }), undefined);
  });
});