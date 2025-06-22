import { ComponentFactory, VNode, LoggerPlugins } from "@tsmk/kernel";
import { createRenderReactor, render as renderTui } from "./renderer.js";
import { createInputReactor } from "./input.js";
import { Key } from "@tsmk/tty";
import { render as reconcile, dispatchEvent } from "@tsmk/reconciler";
import { createTuiHostConfig, TuiHostInstance } from "./reconciler.js";

function findFocusedNode(node: TuiHostInstance): TuiHostInstance | null {
  let focusedNode: TuiHostInstance | null = null;
  if (node.props.isFocused) {
    focusedNode = node;
  }
  if (node.children) {
    for (const child of node.children) {
      const deepFocused = findFocusedNode(child);
      if (deepFocused) {
        focusedNode = deepFocused;
      }
    }
  }
  return focusedNode;
}

/**
 * Creates and manages a TUI application.
 * @param vnode The root virtual node of the application.
 * @returns An object with the root node and a cleanup function.
 */
export function createTuiApp(
  initialVNode: VNode,
  options?: { logger?: LoggerPlugins }
) {
  const logger = options?.logger;
  let currentVNode = initialVNode;

  const rootContainer: TuiHostInstance = {
    type: "root",
    props: {},
    children: [],
  };

  const tuiHostConfig = createTuiHostConfig(null as any, logger);

  function rerender() {
    reconcile(currentVNode, rootContainer, tuiHostConfig, { logger });
    const rootNode = rootContainer.children[0];
    if (rootNode) {
      renderTui(rootNode, logger);
    }
  }

  // Initial render
  rerender();

  const { reactor: input, cleanup: cleanupInput } = createInputReactor({
    key: [
      (key) => {
        if (key.name === "c" && key.ctrl) {
          handleExit();
          process.exit(0);
        }
        const focusedNode = findFocusedNode(rootContainer);
        if (focusedNode) {
          dispatchEvent(focusedNode, "keyPress", { detail: { key } });
        }
      },
    ],
    resize: [
      () => {
        rerender();
      },
    ],
    pointer: [() => {}],
  });

  const handleExit = () => {
    // Show cursor and exit alternate screen buffer
    process.stdout.write("\x1b[?25h\x1b[?1049l");
    cleanupInput();
  };

  // Graceful exit
  process.on("SIGINT", handleExit);
  process.on("SIGTERM", handleExit);

  return {
    root: rootContainer,
    cleanup: handleExit,
  };
}
