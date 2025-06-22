import { VNode, ComponentFactory } from "@tsmk/kernel";
import { createSignal } from "@tsmk/signals";
import { use } from "@tsmk/reconciler";
import { Key } from "@tsmk/tty";
import { StatusPane, GitFile } from "./components/StatusPane.js";
import { DiffPane } from "./components/DiffPane.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import { box } from "../../ui.js";

const execAsync = promisify(exec);

// --- State Signals ---
const focusedId = createSignal<"status" | "diff">("status");
const gitRoot = createSignal(process.cwd()); // Assuming current dir is git root
const files = createSignal<GitFile[]>([]);
const selectedIndex = createSignal(0);
const statusError = createSignal<string | null>(null);
const diffContent = createSignal("Select a file to see the diff.");

// --- Side Effect Subscriptions ---

// Fetch git status whenever the git root changes (or on initial load)
gitRoot.subscribe(async (root) => {
  try {
    const { stdout } = await execAsync(
      "git status --porcelain --untracked-files=all",
      { cwd: root }
    );
    const gitFiles = stdout
      .trim()
      .split("\n")
      .map((line) => {
        const match = line.match(/^( ?.{1,2}) (.*)$/);
        if (!match) return null;
        const [, status, path] = match;
        return { status: status.trim(), path };
      })
      .filter((line): line is GitFile => line !== null && line.path !== "");
    files.write(gitFiles);
    statusError.write(null);
  } catch (e: any) {
    statusError.write(e.message);
    files.write([]);
  }
});

// Fetch the diff for the selected file when the selection changes
selectedIndex.subscribe(async (index) => {
  const file = files.read()[index];
  if (!file) {
    diffContent.write("No file selected.");
    return;
  }
  try {
    let newDiffContent = "";
    if (file.status === "??") {
      newDiffContent = await fs.readFile(
        `${gitRoot.read()}/${file.path}`,
        "utf-8"
      );
    } else {
      const { stdout } = await execAsync(`git diff HEAD -- "${file.path}"`, {
        cwd: gitRoot.read(),
      });
      newDiffContent = stdout || "No changes.";
    }
    diffContent.write(newDiffContent);
  } catch (e: any) {
    diffContent.write(e.message);
  }
});

// Trigger initial load
gitRoot.write(process.cwd());

export const App = () => {
  const focused = use(focusedId);
  const fileList = use(files);
  const selected = use(selectedIndex);
  const error = use(statusError);
  const diff = use(diffContent);

  const handleKeyPress = (key: Key) => {
    if (key.name === "tab") {
      focusedId.write(focused === "status" ? "diff" : "status");
      return;
    }
    if (focused === "status") {
      let newIndex = selected;
      if (key.name === "up") newIndex = Math.max(0, newIndex - 1);
      if (key.name === "down")
        newIndex = Math.min(fileList.length - 1, newIndex + 1);
      selectedIndex.write(newIndex);
    }
  };

  return box({
    onKeyPress: (e: any) => handleKeyPress(e.detail.key),
    focusable: true,
    isFocused: true,
    children: [
      {
        factory: "split",
        props: {
          direction: "horizontal",
          splitPercentage: 40,
          children: [
            {
              factory: StatusPane,
              props: {
                isFocused: focused === "status",
                files: fileList,
                selectedIndex: selected,
                error: error,
              },
            },
            {
              factory: DiffPane,
              props: {
                isFocused: focused === "diff",
                content: diff,
              },
            },
          ],
        },
      },
    ],
  });
};
