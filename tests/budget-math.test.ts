import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBudget, adjustBudget } from "../shared/budgetMath";

test("AI overspend is reconciled to the requested budget with exact cents and percentages", () => {
  const result = normalizeBudget(1000, [250, 200, 150, 120, 120, 60, 50, 50, 30, 30, 20].map(amount => ({ amount, percentage: amount / 10 })));
  assert.equal(result.reduce((sum, item) => sum + Math.round(item.amount * 100), 0), 100000);
  assert.equal(result.reduce((sum, item) => sum + Math.round(item.percentage * 100), 0), 10000);
});

test("sliders keep the total when allocating 100 percent and redistributing from zero", () => {
  const items = [{ amount: 1000, percentage: 100 }, { amount: 0, percentage: 0 }, { amount: 0, percentage: 0 }];
  const result = adjustBudget(1000, items, 0, 20);
  assert.deepEqual(result.map(item => item.amount), [200, 400, 400]);
  assert.deepEqual(adjustBudget(1000, result, 1, 100).map(item => item.amount), [0, 1000, 0]);
});

test("invalid amounts and empty budgets cannot produce misleading plans", () => {
  for (const amount of [-1, NaN, Infinity, 0]) assert.throws(() => normalizeBudget(1000, [{ amount, percentage: 10 }]));
});
