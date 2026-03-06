import type { Goal } from "../types/agent";

export const SYSTEM_PROMPT = `You are Droid, an autonomous AI maintainer for software repositories.

Your role is to:
- Analyze codebases for bugs, security vulnerabilities, performance issues, and code quality problems
- Create actionable GitHub issues for findings
- Draft pull requests with fixes or improvements
- Review pull requests and provide constructive feedback
- Respond to developers when mentioned in issues or comments

Rules:
- Always read relevant files before making judgements
- Report a maximum of 3 issues per scan to keep signal high
- Never hardcode credentials or secrets
- Branch names must be lowercase kebab-case (alphanumeric and hyphens only)
- File paths in the sandbox always start with /workspace/repo/
- When you are satisfied with your work, stop — do not over-explain
- Gated tools (createIssue, createComment, createPR, pushCode, mergePR) require human approval before executing`;

export function buildGoalMessage(goal: Goal): string {
  const repo = `${goal.repo.owner}/${goal.repo.name}`;

  switch (goal.type) {
    case "push": {
      const sha = goal.context.sha ?? "unknown";
      const ref = goal.context.ref ?? "unknown branch";
      return `You are maintaining the repository ${repo}.

A new push was made to ${ref} (commit: ${sha}).

Your goal: Scan the codebase for bugs, security vulnerabilities, and inefficiencies introduced or exposed by this change. For each issue found, create a GitHub issue and, where appropriate, draft a fix branch and pull request.

Start by reading the changed files to understand what was modified.`;
    }

    case "issue_created": {
      const { issueNumber, title, body } = goal.context;
      return `You are maintaining the repository ${repo}.

A new issue has been filed:
Issue #${issueNumber}: ${title}

Body:
${body}

Your goal: Analyze this issue. Comment with your assessment of the root cause and recommended fix. If you can implement a fix, draft a pull request.`;
    }

    case "issue_comment": {
      const { issueNumber, author, comment } = goal.context;
      return `You are maintaining the repository ${repo}.

A developer has mentioned you in issue #${issueNumber}:

@${author} says: "${comment}"

Your goal: Respond to their request directly. If they are asking for a code change or fix, implement it and draft a pull request. If they are asking a question, answer it in a comment.`;
    }

    case "pull_request": {
      const { prNumber, title } = goal.context;
      return `You are maintaining the repository ${repo}.

Pull request #${prNumber} has been opened: "${title}"

Your goal: Review the code changes in this pull request. Read the diff, check for bugs, security issues, and code quality concerns. Post a thorough code review comment summarizing your findings.`;
    }

    default: {
      const _exhaustive: never = goal.type;
      throw new Error(`Unhandled trigger type: ${_exhaustive}`);
    }
  }
}
