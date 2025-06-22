import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

let gitRoot: string | null = null;

export async function getGitRoot(): Promise<string> {
  if (gitRoot) {
    return gitRoot;
  }
  try {
    const { stdout } = await execAsync("git rev-parse --show-toplevel");
    gitRoot = stdout.trim();
    return gitRoot;
  } catch (e) {
    throw new Error("Not inside a git repository.");
  }
}
