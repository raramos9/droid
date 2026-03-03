import { type Sandbox } from "@cloudflare/sandbox";
import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";

export function createReadFileTool(sandbox: Sandbox) {
  return betaZodTool({
    name: "readFile",
    inputSchema: z.object({
      filePath: z.string(),
    }),
    description: "Read the file at the given file path",
    run: async (input) => {
      try {
        const file = await sandbox.readFile(input.filePath);
        return file.content;
      } catch (err: any) {
        throw new Error("Error reading file");
      }
    },
  });
}