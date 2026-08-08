import assert from "node:assert/strict";
import test from "node:test";
import { isPrivateNetworkAddress } from "../server/services/publicHttp";
import { checkoutSchema, insertUserSchema, recommendationStatusSchema } from "../shared/schema";

test("private and special-use network addresses are rejected", () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "::1",
    "fd00:ec2::254",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
  ]) {
    assert.equal(isPrivateNetworkAddress(address), true, address);
  }

  assert.equal(isPrivateNetworkAddress("8.8.8.8"), false);
  assert.equal(isPrivateNetworkAddress("2606:4700:4700::1111"), false);
});

test("registration only accepts web URLs", () => {
  const common = {
    fullName: "Example User",
    email: "person@example.com",
    password: "correct horse battery staple",
  };
  assert.equal(insertUserSchema.safeParse({ ...common, companyUrl: "https://example.com" }).success, true);
  assert.equal(insertUserSchema.safeParse({ ...common, companyUrl: "javascript:alert(1)" }).success, false);
  assert.equal(insertUserSchema.safeParse({ ...common, companyUrl: "file:///etc/passwd" }).success, false);
});

test("recommendation status is restricted to supported metric values", () => {
  for (const status of ["New", "In Progress", "Completed"]) {
    assert.equal(recommendationStatusSchema.safeParse({ status }).success, true);
  }
  assert.equal(recommendationStatusSchema.safeParse({ status: "Complete" }).success, false);
  assert.equal(recommendationStatusSchema.safeParse({ status: "Completed " }).success, false);
});

test("checkout requires a nonempty Stripe price identifier", () => {
  assert.equal(checkoutSchema.safeParse({ priceId: "price_pro_monthly" }).success, true);
  assert.equal(checkoutSchema.safeParse({ priceId: "" }).success, false);
});
