import { ComponentFactory, VNode } from "@tsmk/kernel";
import { commitRoot } from "./commit";
import { Fiber } from "./fiber";
import {
  getCurrentlyRenderingFiber,
  getDeletions,
  getHostConfig,
  getNextUnitOfWork,
  getWorkInProgressRoot,
  setCurrentlyRenderingFiber,
  setDeletions,
  setHookIndex,
  setNextUnitOfWork,
  addDeletion,
} from "./state";

export function workLoop(deadline?: IdleDeadline) {
  let shouldYield = false;
  let nextUnitOfWork = getNextUnitOfWork();
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    setNextUnitOfWork(nextUnitOfWork);
    shouldYield = !!(deadline && deadline.timeRemaining() < 1);
  }

  const workInProgressRoot = getWorkInProgressRoot();
  if (!nextUnitOfWork && workInProgressRoot) {
    commitRoot(workInProgressRoot);
  }
}

function performUnitOfWork(fiber: Fiber): Fiber | null {
  const isFunctionComponent = typeof fiber.vnode.factory === "function";

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber: Fiber | undefined = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
  return null;
}

function updateFunctionComponent(fiber: Fiber) {
  setCurrentlyRenderingFiber(fiber);
  setHookIndex(0);
  if (fiber.alternate && fiber.alternate.hooks) {
    fiber.hooks = fiber.alternate.hooks.map((h) => ({ ...h, queue: [] }));
  } else {
    fiber.hooks = [];
  }
  const children = [
    (fiber.vnode.factory as ComponentFactory)(fiber.vnode.props || {}),
  ];
  reconcileChildren(fiber, children);
}

function updateHostComponent(fiber: Fiber) {
  const hostConfig = getHostConfig();
  if (!fiber._nativeElement) {
    fiber._nativeElement = hostConfig!.createInstance(
      fiber.vnode.factory as string,
      fiber.vnode.props || {}
    );
  }
  reconcileChildren(fiber, fiber.vnode.props?.children || []);
}

function reconcileChildren(wipFiber: Fiber, children: (VNode | string)[]) {
  let index = 0;
  let oldFiber = wipFiber.alternate?.child;
  let prevSibling: Fiber | null = null;
  const deletions = getDeletions();

  while (index < children.length || oldFiber != null) {
    const child = children[index];
    let newFiber: Fiber | null = null;

    const vnode =
      typeof child === "string" || typeof child === "number"
        ? { factory: "TEXT_ELEMENT", props: { nodeValue: child } }
        : child;

    const sameType =
      oldFiber && vnode && vnode.factory === oldFiber.vnode.factory;

    if (sameType) {
      newFiber = {
        vnode: {
          factory: vnode.factory,
          props: vnode.props,
        },
        parent: wipFiber,
        _nativeElement: oldFiber!._nativeElement,
        effectTag: "UPDATE",
        alternate: oldFiber,
        hooks: oldFiber!.hooks,
      };
    }
    if (vnode && !sameType) {
      newFiber = {
        vnode: {
          factory: vnode.factory,
          props: vnode.props,
        },
        parent: wipFiber,
        _nativeElement: undefined,
        effectTag: "PLACEMENT",
        alternate: undefined,
        hooks: [],
      };
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      addDeletion(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber!;
    } else if (prevSibling) {
      prevSibling.sibling = newFiber!;
    }

    prevSibling = newFiber;
    index++;
  }
}
