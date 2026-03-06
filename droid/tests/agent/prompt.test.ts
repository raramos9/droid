import { describe, it, expect } from "vitest";
import { buildGoalMessage, SYSTEM_PROMPT } from "../../src/agent/prompt";
import type { Goal } from "../../src/types/agent";

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    type: "push",
    repo: { owner: "acme", name: "app" },
    context: {},
    ...overrides,
  };
}

describe("SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof SYSTEM_PROMPT).toBe("string");
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(50);
  });

  it("mentions droid identity", () => {
    expect(SYSTEM_PROMPT.toLowerCase()).toMatch(/droid|maintainer/);
  });
});

describe("buildGoalMessage", () => {
  it("push: includes repo and sha context", () => {
    const goal = makeGoal({ type: "push", context: { sha: "abc123", ref: "refs/heads/main" } });
    const msg = buildGoalMessage(goal);
    expect(msg).toContain("acme/app");
    expect(msg).toContain("abc123");
  });

  it("push: instructs agent to scan for bugs and security issues", () => {
    const msg = buildGoalMessage(makeGoal({ type: "push" }));
    expect(msg.toLowerCase()).toMatch(/scan|bug|security/);
  });

  it("issue_created: includes issue title and body", () => {
    const goal = makeGoal({
      type: "issue_created",
      context: { issueNumber: 5, title: "Login broken", body: "NPE on submit" },
    });
    const msg = buildGoalMessage(goal);
    expect(msg).toContain("Login broken");
    expect(msg).toContain("NPE on submit");
    expect(msg).toContain("5");
  });

  it("issue_comment: includes comment and author", () => {
    const goal = makeGoal({
      type: "issue_comment",
      context: { issueNumber: 3, author: "alice", comment: "Can you fix this?" },
    });
    const msg = buildGoalMessage(goal);
    expect(msg).toContain("alice");
    expect(msg).toContain("Can you fix this?");
    expect(msg).toContain("3");
  });

  it("pull_request: includes PR number and title", () => {
    const goal = makeGoal({
      type: "pull_request",
      context: { prNumber: 12, title: "Add auth middleware" },
    });
    const msg = buildGoalMessage(goal);
    expect(msg).toContain("12");
    expect(msg).toContain("Add auth middleware");
  });

  it("pull_request: instructs agent to review", () => {
    const msg = buildGoalMessage(makeGoal({ type: "pull_request", context: { prNumber: 1, title: "fix" } }));
    expect(msg.toLowerCase()).toMatch(/review/);
  });

  it("returns a non-empty string for all trigger types", () => {
    const types: Goal["type"][] = ["push", "issue_created", "issue_comment", "pull_request"];
    for (const type of types) {
      const msg = buildGoalMessage(makeGoal({ type }));
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(20);
    }
  });
});
