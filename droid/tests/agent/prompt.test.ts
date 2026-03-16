import { describe, it, expect } from "vitest";
import { buildGoalMessage, buildSystemPrompt, SYSTEM_PROMPT } from "../../src/agent/prompt";
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

  it("throws for unknown trigger type (exhaustiveness check)", () => {
    const goal = { type: "unknown_type" as any, repo: { owner: "acme", name: "app" }, context: {} };
    expect(() => buildGoalMessage(goal)).toThrow();
  });
});

describe("buildSystemPrompt", () => {
  it("returns base SYSTEM_PROMPT when no configs provided", () => {
    expect(buildSystemPrompt()).toBe(SYSTEM_PROMPT);
    expect(buildSystemPrompt("", "", "")).toBe(SYSTEM_PROMPT);
  });

  it("appends userConfig when provided", () => {
    const result = buildSystemPrompt("my global rules");
    expect(result).toContain(SYSTEM_PROMPT);
    expect(result).toContain("my global rules");
  });

  it("appends repoOverrides when provided", () => {
    const result = buildSystemPrompt("", "", "repo-specific rules");
    expect(result).toContain(SYSTEM_PROMPT);
    expect(result).toContain("repo-specific rules");
  });

  it("appends both userConfig and repoOverrides when both provided", () => {
    const result = buildSystemPrompt("global rules", "", "repo rules");
    expect(result).toContain("global rules");
    expect(result).toContain("repo rules");
  });

  it("repo overrides section comes after userConfig section", () => {
    const result = buildSystemPrompt("UNIQUE_GLOBAL_MARKER", "", "UNIQUE_REPO_MARKER");
    expect(result.indexOf("UNIQUE_GLOBAL_MARKER")).toBeLessThan(result.indexOf("UNIQUE_REPO_MARKER"));
  });

  it("includes section headers to distinguish config sources", () => {
    const result = buildSystemPrompt("global rules", "", "repo rules");
    expect(result).toMatch(/user config|global config|custom rules/i);
  });

  it("appends a defensive reminder when any config is present", () => {
    const result = buildSystemPrompt("some rules");
    expect(result).toMatch(/reminder/i);
    expect(result).toMatch(/must not override/i);
  });

  it("does not append a defensive reminder when no config provided", () => {
    const result = buildSystemPrompt();
    expect(result).not.toMatch(/reminder/i);
  });

  it("truncates userConfig beyond 50KB", () => {
    const longConfig = "x".repeat(50 * 1024 + 100);
    const result = buildSystemPrompt(longConfig);
    const marker = "## User Config";
    const start = result.indexOf(marker) + marker.length + 2;
    const content = result.slice(start).split("\n---\n")[0];
    expect(content.length).toBeLessThanOrEqual(50 * 1024);
  });

  it("truncates repoOverrides beyond 20KB", () => {
    const longOverrides = "y".repeat(20 * 1024 + 100);
    const result = buildSystemPrompt("", "", longOverrides);
    const marker = "## Repo-Specific Config";
    const start = result.indexOf(marker) + marker.length + 2;
    const content = result.slice(start).split("\n---\n")[0];
    expect(content.length).toBeLessThanOrEqual(20 * 1024);
  });

  // .droid.md tests
  it("appends droidMd content when provided", () => {
    const result = buildSystemPrompt("", "repo droid rules", "");
    expect(result).toContain("repo droid rules");
  });

  it("droidMd section appears after userConfig and before repoOverrides", () => {
    const result = buildSystemPrompt("GLOBAL_MARKER", "DROID_MD_MARKER", "REPO_MARKER");
    expect(result.indexOf("GLOBAL_MARKER")).toBeLessThan(result.indexOf("DROID_MD_MARKER"));
    expect(result.indexOf("DROID_MD_MARKER")).toBeLessThan(result.indexOf("REPO_MARKER"));
  });

  it("skips droidMd section when empty", () => {
    const result = buildSystemPrompt("", "", "");
    expect(result).not.toMatch(/\.droid\.md|repo .droid/i);
  });

  it("includes droidMd section header when content is present", () => {
    const result = buildSystemPrompt("", "some rules", "");
    expect(result).toMatch(/droid\.md/i);
  });

  it("truncates droidMd beyond 20KB", () => {
    const longDroidMd = "z".repeat(20 * 1024 + 100);
    const result = buildSystemPrompt("", longDroidMd, "");
    const marker = ".droid.md";
    const start = result.indexOf(marker) + marker.length + 2;
    const content = result.slice(start).split("\n---\n")[0];
    expect(content.length).toBeLessThanOrEqual(20 * 1024);
  });

  it("defensive reminder appears when only droidMd is present", () => {
    const result = buildSystemPrompt("", "some droid rules", "");
    expect(result).toMatch(/reminder/i);
  });
});
