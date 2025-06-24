import { Fiber } from "./fiber";
import {
  getDeletions,
  getHostConfig,
  getWorkInProgressRoot,
  setCurrentRoot,
} from "./state";

export function commitRoot(root: Fiber) {
  const deletions = getDeletions();
  if (deletions) {
    deletions.forEach(commitWork);
  }
  commitWork(root.child);
  runEffects(getWorkInProgressRoot()!);
  setCurrentRoot(root);
}

function runEffects(fiber?: Fiber) {
  if (!fiber) return;

  if (fiber.effectTag === "UPDATE" && fiber.hooks) {
    fiber.hooks.forEach((hook) => {
      if (typeof hook.state === "function") {
        if (hook.deps && hook.cleanup) {
          hook.cleanup();
        }
        hook.cleanup = hook.state();
      }
    });
  }

  runEffects(fiber.child);
  runEffects(fiber.sibling);
}

function commitWork(fiber?: Fiber | null) {
  if (!fiber) {
    return;
  }

  let parentFiber = fiber.parent;
  while (parentFiber && !parentFiber._nativeElement) {
    parentFiber = parentFiber.parent;
  }
  const parentDom = parentFiber!._nativeElement as any;
  const hostConfig = getHostConfig()!;

  if (fiber.effectTag === "PLACEMENT" && fiber._nativeElement != null) {
    hostConfig.appendChild(parentDom, fiber._nativeElement);
  } else if (fiber.effectTag === "UPDATE" && fiber._nativeElement != null) {
    hostConfig.commitUpdate(
      fiber._nativeElement as any,
      {},
      fiber.vnode.factory as string,
      fiber.alternate!.vnode.props || {},
      fiber.vnode.props || {}
    );
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber);
    return;
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber: Fiber) {
  if (fiber.child) {
    let current: Fiber | undefined = fiber.child;
    while (current) {
      commitDeletion(current);
      current = current.sibling;
    }
  }

  if (typeof fiber.vnode.factory === "function" && fiber.hooks) {
    fiber.hooks.forEach((hook) => {
      if (hook.cleanup) {
        hook.cleanup();
      }
    });
  }

  let parentFiber = fiber.parent;
  while (parentFiber && !parentFiber._nativeElement) {
    parentFiber = parentFiber.parent;
  }

  if (fiber._nativeElement) {
    getHostConfig()!.removeChild(
      parentFiber!._nativeElement as any,
      fiber._nativeElement
    );
  }
}
