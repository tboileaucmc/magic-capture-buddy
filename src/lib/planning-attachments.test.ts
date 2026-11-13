import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { attachmentMimeType } from "./planning-attachments";
import { saveMeetingAssignment } from "./planning-recurrence";
import type { Assignment } from "./planning-types";

describe("mission email attachments", () => {
  it("retains attached documents when a saved mission is loaded and edited again", () => {
    const attachments = [{ name: "ordre.pdf", type: "application/pdf", dataUrl: "data:application/pdf;base64,JVBERi0=" }];
    const mission: Assignment = { id: "attachment-mission", technicianIds: ["thomas"], dateISO: "2026-11-13", half: "AM", categoryId: "maintenance", title: "Maintenance", address: "", startTime: "08:00", endTime: "12:00", attachments };
    const loaded: Assignment[] = JSON.parse(JSON.stringify(saveMeetingAssignment([], mission)));
    assert.deepEqual(loaded[0]?.attachments, attachments);
    const edited = saveMeetingAssignment(loaded, { ...mission, title: "Maintenance modifiée", attachments: loaded[0]?.attachments });
    assert.deepEqual(edited[0]?.attachments, attachments);
  });
  it("accepts .eml files even without a browser MIME type", () => {
    assert.equal(attachmentMimeType({ name: "mail.EML", type: "", size: 100 }), "message/rfc822");
  });
  it("accepts Outlook .msg files with a generic browser MIME type", () => {
    assert.equal(attachmentMimeType({ name: "mail.msg", type: "application/octet-stream", size: 100 }), "application/vnd.ms-outlook");
  });
  it("keeps the 20 MiB size limit for email attachments", () => {
    assert.equal(attachmentMimeType({ name: "mail.eml", type: "", size: 20 * 1024 * 1024 }), "message/rfc822");
    assert.equal(attachmentMimeType({ name: "mail.eml", type: "", size: 20 * 1024 * 1024 + 1 }), undefined);
  });
  it("rejects unsupported files", () => {
    assert.equal(attachmentMimeType({ name: "file.exe", type: "application/octet-stream", size: 100 }), undefined);
  });
});