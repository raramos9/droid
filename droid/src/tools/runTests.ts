import { type Sandbox } from "@cloudflare/sandbox";
import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";

export function createrunTestsTool(sandbox: Sandbox) {
  return betaZodTool({
    name: "runTests",
    inputSchema: z.object({}),
    description: "Test your written code",
    run: async (input) => {
      try {
        const file = await sandbox.readFile("/workspace/repo/package.json");
        const pkg = JSON.parse(file.content);

        if (!pkg.scripts?.test){ 
            return "No test script found in package.json"
        }

        const testResults = await sandbox.exec(pkg.scripts?.test, {
          cwd: "/workspace/repo",
        });
        return `Exit code: ${testResults.exitCode}\nOutput:
   ${testResults.stdout}\nErrors:
  ${testResults.stderr}`;
      } catch (err: any) {
        throw new Error(`Error reading file: ${err.message}`);
      }
    },
  });
}
