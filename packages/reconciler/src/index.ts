import { VNode } from "@tsmk/kernel";
import { HostConfig, HostInstance } from "./hostConfig";
import {
  getCurrentRoot,
  setDeletions,
  setHostConfig,
  setNextUnitOfWork,
  setRenderCallback,
  setWorkInProgressRoot,
} from "./state";
import { workLoop } from "./workloop";

// ===================================================================
//
//                        PUBLIC API
//
// ===================================================================

// Re-export public types
export type { HostConfig, HostInstance, HostTextInstance } from "./hostConfig";

// Re-export public hooks
export { useState, useEffect } from "./hooks";

// The main render function, which serves as the entry point to the reconciler.
export function render(
  vnode: VNode,
  container: HostInstance,
  hostConfig: HostConfig,
  cb?: () => void
) {
  setHostConfig(hostConfig);
  setRenderCallback(cb);

  const workInProgressRoot = {
    vnode: {
      factory: "ROOT",
      props: {
        children: [vnode],
      },
    },
    _nativeElement: container,
    alternate: getCurrentRoot() ?? undefined,
  };

  setWorkInProgressRoot(workInProgressRoot);
  setNextUnitOfWork(workInProgressRoot);
  setDeletions([]);

  workLoop();
}
