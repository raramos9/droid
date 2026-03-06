import { type Sandbox } from "@cloudflare/sandbox";
import { type ToolName } from "../agents/base";
import { createReadFileTool } from "./readFile";
import { createWriteFileTool } from "./writeFile";
import { createrunTestsTool } from "./runTests";
import { createDirectoryTool } from "./createDirectory";

const TOOL_FACTORIES: Record<ToolName, (sandbox: Sandbox) => unknown> = {
  readFile: createReadFileTool,
  writeFile: createWriteFileTool,
  runTests: createrunTestsTool,
  createDirectory: createDirectoryTool,
};

export function buildTools(names: ToolName[], sandbox: Sandbox): unknown[] {
  return names.map((name) => TOOL_FACTORIES[name](sandbox));
}
