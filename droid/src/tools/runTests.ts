import { type Sandbox } from "@cloudflare/sandbox";
import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { findPackageJson } from "../lib/writeIssueHelpers";

export function createrunTestsTool(sandbox: Sandbox) {
  return betaZodTool({
    name: "runTests",
    inputSchema: z.object({}),
    description: "Test your written code",
    run: async (_input) => {
      const pkgPath = await findPackageJson(sandbox);

      if (!pkgPath) {
        return "No package.json found in repository";
      }

      const file = await sandbox.readFile(pkgPath);
      const pkg = JSON.parse(file.content);

      if (!pkg.scripts?.test) {
        return "No test script found in package.json";
      }

      const cwd = pkgPath.substring(0, pkgPath.lastIndexOf("/"));
      const testResults = await sandbox.exec(pkg.scripts.test, { cwd });

      return `Exit code: ${testResults.exitCode}\nOutput:\n${testResults.stdout}\nErrors:\n${testResults.stderr}`;
    },
  });
}
