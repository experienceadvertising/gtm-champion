import assert from "node:assert/strict";
import test from "node:test";
import { selectSprintTasks } from "../client/src/components/ExecutionSprint";
import type { Recommendation } from "../client/src/lib/api";

function recommendation(overrides: Partial<Recommendation> & Pick<Recommendation, "id" | "category" | "status" | "impact">): Recommendation {
  return {
    companyId: 1,
    title: `Task ${overrides.id}`,
    description: "A focused marketing action.",
    effort: "Low",
    gtmFunnel: "both",
    createdAt: "2026-08-07T00:00:00.000Z",
    ...overrides,
  };
}

test("execution sprint prioritizes active work, then high-impact top-channel work", () => {
  const tasks = selectSprintTasks([
    recommendation({ id: 1, category: "SEO", status: "New", impact: "Medium" }),
    recommendation({ id: 2, category: "Paid Search", status: "In Progress", impact: "Medium" }),
    recommendation({ id: 3, category: "SEO", status: "New", impact: "High" }),
    recommendation({ id: 4, category: "Content", status: "Completed", impact: "High" }),
    recommendation({ id: 5, category: "Community", status: "New", impact: "High" }),
  ], ["SEO", "Paid Search"]);

  assert.deepEqual(tasks.map(task => task.id), [2, 3, 1]);
  assert.equal(tasks.some(task => task.status === "Completed"), false);
});
