import type { ToolContext } from "../types/agent";

export async function loadDroidMd(sandbox: ToolContext["sandbox"]): Promise<string> {
  try {
    const { content } = await sandbox.readFile("/workspace/repo/.droid.md");
    return content;
  } catch {
    return "";
  }
}
