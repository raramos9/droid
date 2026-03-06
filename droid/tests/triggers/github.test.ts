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
    title: "Fix auth",
    head: { ref: "fix/foo", sha: "aaa111" },
    base: { ref: "main", sha: "bbb222" },
  },
  repository: { owner: { login: "acme" }, name: "repo" },
};

const issuePayload = {
  action: "opened",
  issue: { number: 7, title: "Login broken", body: "NPE on submit" },
  repository: { owner: { login: "acme" }, name: "repo" },
};

const issueCommentPayload = {
  action: "created",
  issue: { number: 3 },
  comment: { body: "@droid can you fix this?", user: { login: "alice" } },
  repository: { owner: { login: "acme" }, name: "repo" },
};

describe("fromGithubWebhook — push", () => {
  it("returns push goal for push event", () => {
    const goal = fromGithubWebhook("push", pushPayload);
    expect(goal?.type).toBe("push");
  });

  it("push goal contains repo owner and name", () => {
    const goal = fromGithubWebhook("push", pushPayload);
    expect(goal?.repo.owner).toBe("acme");
    expect(goal?.repo.name).toBe("repo");
  });

  it("push goal context contains sha and ref", () => {
    const goal = fromGithubWebhook("push", pushPayload);
    expect(goal?.context.sha).toBe("def12345");
    expect(goal?.context.ref).toBe("refs/heads/main");
  });
});

describe("fromGithubWebhook — pull_request", () => {
  it("returns pull_request goal for PR opened", () => {
    const goal = fromGithubWebhook("pull_request", { ...prPayload, action: "opened" });
    expect(goal?.type).toBe("pull_request");
  });

  it("returns pull_request goal for PR reopened", () => {
    const goal = fromGithubWebhook("pull_request", { ...prPayload, action: "reopened" });
    expect(goal?.type).toBe("pull_request");
  });

  it("PR goal contains repo owner and name", () => {
    const goal = fromGithubWebhook("pull_request", prPayload);
    expect(goal?.repo.owner).toBe("acme");
    expect(goal?.repo.name).toBe("repo");
  });

  it("PR goal context contains prNumber and title", () => {
    const goal = fromGithubWebhook("pull_request", prPayload);
    expect(goal?.context.prNumber).toBe(42);
    expect(goal?.context.title).toBe("Fix auth");
  });

  it("returns null for PR closed action", () => {
    expect(fromGithubWebhook("pull_request", { ...prPayload, action: "closed" })).toBeNull();
  });
});

describe("fromGithubWebhook — issues", () => {
  it("returns issue_created goal for issues.opened", () => {
    const goal = fromGithubWebhook("issues", issuePayload);
    expect(goal?.type).toBe("issue_created");
  });

  it("issue_created goal context has issueNumber, title, body", () => {
    const goal = fromGithubWebhook("issues", issuePayload);
    expect(goal?.context.issueNumber).toBe(7);
    expect(goal?.context.title).toBe("Login broken");
    expect(goal?.context.body).toBe("NPE on submit");
  });

  it("issue_created goal contains repo", () => {
    const goal = fromGithubWebhook("issues", issuePayload);
    expect(goal?.repo.owner).toBe("acme");
  });

  it("returns null for issues.closed action", () => {
    expect(fromGithubWebhook("issues", { ...issuePayload, action: "closed" })).toBeNull();
  });
});

describe("fromGithubWebhook — issue_comment", () => {
  it("returns issue_comment goal when @droid is mentioned", () => {
    const goal = fromGithubWebhook("issue_comment", issueCommentPayload);
    expect(goal?.type).toBe("issue_comment");
  });

  it("issue_comment goal context has issueNumber, author, comment", () => {
    const goal = fromGithubWebhook("issue_comment", issueCommentPayload);
    expect(goal?.context.issueNumber).toBe(3);
    expect(goal?.context.author).toBe("alice");
    expect(goal?.context.comment).toBe("@droid can you fix this?");
  });

  it("returns null when comment does not mention @droid", () => {
    const payload = { ...issueCommentPayload, comment: { body: "looks good", user: { login: "bob" } } };
    expect(fromGithubWebhook("issue_comment", payload)).toBeNull();
  });

  it("returns null for non-created action", () => {
    expect(fromGithubWebhook("issue_comment", { ...issueCommentPayload, action: "deleted" })).toBeNull();
  });
});

describe("fromGithubWebhook — edge cases", () => {
  it("returns null for unknown event", () => {
    expect(fromGithubWebhook("star", {})).toBeNull();
  });

  it("returns null for null event", () => {
    expect(fromGithubWebhook(null, {})).toBeNull();
  });
});
