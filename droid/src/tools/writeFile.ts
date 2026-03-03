import { type Sandbox } from "@cloudflare/sandbox";
import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";

export function createWriteFileTool(sandbox: Sandbox) {
  return betaZodTool({
    name: "writeFile",
    inputSchema: z.object({
      filePath: z.string(),
      content: z.string(),
    }),
    description: "Write to the file path given in the input schema, or create a file",
    run: async (input) => {
      try {
        await sandbox.writeFile(input.filePath, input.content);
      } catch (err: any) {
        throw new Error("Error writing to file");
      }
      return "File written successfully";
    },
  });
}
