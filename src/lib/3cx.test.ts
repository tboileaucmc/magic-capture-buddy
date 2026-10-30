import { test } from "node:test";
import assert from "node:assert/strict";
import { threeCxCallUrl } from "./3cx";

test("opens the company's browser dialer with the technician extension", () => {
  assert.equal(threeCxCallUrl(" 101 "), "https://cinemeccanica.on3cx.fr/#/call?phone=101");
  assert.equal(threeCxCallUrl("0012"), "https://cinemeccanica.on3cx.fr/#/call?phone=0012");
});

test("does not create a call link for an empty or invalid extension", () => {
  for (const value of ["", " ", "abc", "101&phone=999", "https://example.com"]) {
    assert.equal(threeCxCallUrl(value), undefined);
  }
});