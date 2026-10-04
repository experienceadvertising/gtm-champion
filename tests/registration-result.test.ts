import test from "node:test";
import assert from "node:assert/strict";
import { acceptedRegistration } from "../client/src/lib/registration-result";

const saved = { userId: "12345678-1234-4234-8234-123456789abc", email: "test@example.com", fullName: "Test", isPremium: false };
test("only newly saved 201 registration counts as a new account", () => {
  assert.equal(acceptedRegistration(201, saved).newlyCreated, true);
  assert.equal(acceptedRegistration(200, { ...saved, newlyCreated: true }).newlyCreated, false);
});
test("malformed successful responses never accept a session or conversion", () => {
  for (const userId of [null, undefined, 0, "", "not-a-uuid", {}, []]) {
    assert.throws(() => acceptedRegistration(201, { ...saved, userId }));
  }
  assert.throws(() => acceptedRegistration(202, saved));
  assert.throws(() => acceptedRegistration(201, { ...saved, isPremium: "false" }));
});
