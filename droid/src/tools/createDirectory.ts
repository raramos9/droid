import { type Sandbox } from "@cloudflare/sandbox";
import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";

export function createDirectoryTool(sandbox: Sandbox) {
  return betaZodTool({
    name: "createDirectory",
    inputSchema: z.object({
      dirPath: z.string(),
    }),
    description: "Create a directory",
    run: async (input) => {
      try {
        await sandbox.mkdir(input.dirPath, {recursive: true});
      } catch (err: any) {
        throw new Error("Error creating directory file");
      }
      return "Directory written successfully";
    },
  });
}
