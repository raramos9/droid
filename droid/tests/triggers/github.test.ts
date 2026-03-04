import { describe, it, expect } from "vitest";
import { fromGithubWebhook } from "../../src/triggers/github";

const pushPayload = {
  repository: { owner: { login: "acme" }, name: "repo" },
  ref: "refs/heads/main",
  before: "abc",
  after: "def12345",
};

const prPayload = {
  action: "opened",
  pull_request: {
    number: 42,
    head: { ref: "fix/foo", sha: "aaa111" },
    base: { ref: "main", sha: "bbb222" },
  },
  repository: { owner: { login: "acme" }, name: "repo" },
};

describe("fromGithubWebhook", () => {
  it("routes push event to writeIssue agent", () => {
    const dispatch = fromGithubWebhook("push", pushPayload);
    expect(dispatch?.agent).toBe("writeIssue");
  });

  it("routes PR opened to reviewPR agent", () => {
    const dispatch = fromGithubWebhook("pull_request", { ...prPayload, action: "opened" });
    expect(dispatch?.agent).toBe("reviewPR");
  });

  it("routes PR reopened to reviewPR agent", () => {
    const dispatch = fromGithubWebhook("pull_request", { ...prPayload, action: "reopened" });
    expect(dispatch?.agent).toBe("reviewPR");
  });

  it("returns null for PR closed action", () => {
    const dispatch = fromGithubWebhook("pull_request", { ...prPayload, action: "closed" });
    expect(dispatch).toBeNull();
  });

  it("returns null for unknown event", () => {
    expect(fromGithubWebhook("issues", {})).toBeNull();
  });

  it("returns null for null event", () => {
    expect(fromGithubWebhook(null, {})).toBeNull();
  });

  it("push dispatch contains parsed payload", () => {
    const dispatch = fromGithubWebhook("push", pushPayload);
    expect(dispatch?.payload).toMatchObject({ after: "def12345" });
  });

  it("PR dispatch contains parsed payload", () => {
    const dispatch = fromGithubWebhook("pull_request", prPayload);
    expect(dispatch?.payload).toMatchObject({ pull_request: { number: 42 } });
  });
});
