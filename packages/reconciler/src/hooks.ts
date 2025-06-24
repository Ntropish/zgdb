import {
  getCurrentRoot,
  getCurrentlyRenderingFiber,
  getHookIndex,
  incrementHookIndex,
  setDeletions,
  setNextUnitOfWork,
  setWorkInProgressRoot,
} from "./state";
import { Hook } from "./fiber";
import { workLoop } from "./workloop";

export function useState<T>(
  initial: T
): [T, (action: T | ((prev: T) => T)) => void] {
  const currentlyRenderingFiber = getCurrentlyRenderingFiber();
  if (!currentlyRenderingFiber) {
    throw new Error("useState must be called in a component");
  }

  const hookIndex = getHookIndex();
  const oldHook =
    currentlyRenderingFiber.alternate &&
    currentlyRenderingFiber.alternate.hooks &&
    currentlyRenderingFiber.alternate.hooks[hookIndex];

  const hook: Hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
    deps: oldHook ? oldHook.deps : undefined,
  };

  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    hook.state =
      typeof action === "function"
        ? (action as (prev: T) => T)(hook.state)
        : action;
  });

  const setState = (action: T | ((prev: T) => T)) => {
    hook.queue.push(action);

    const currentRoot = getCurrentRoot();
    if (!currentRoot) {
      return;
    }

    const workInProgressRoot = {
      vnode: {
        factory: currentRoot.vnode.factory,
        props: currentRoot.vnode.props,
      },
      _nativeElement: currentRoot._nativeElement,
      alternate: currentRoot,
    };

    setWorkInProgressRoot(workInProgressRoot);
    setNextUnitOfWork(workInProgressRoot);
    setDeletions([]);
    workLoop();
  };

  currentlyRenderingFiber.hooks![hookIndex] = hook;
  incrementHookIndex();
  return [hook.state, setState];
}

export function useEffect(effect: () => (() => void) | void, deps?: any[]) {
  const currentlyRenderingFiber = getCurrentlyRenderingFiber();
  if (!currentlyRenderingFiber)
    throw new Error("useEffect must be called in a component");

  const hookIndex = getHookIndex();
  const oldHook = currentlyRenderingFiber.alternate?.hooks?.[hookIndex];

  let hasChanged = true;
  if (deps && oldHook && oldHook.deps) {
    if (
      deps.length === oldHook.deps.length &&
      deps.every((dep, i) => dep === oldHook.deps![i])
    ) {
      hasChanged = false;
    }
  }

  if (hasChanged) {
    const newHook: Hook = {
      state: effect,
      queue: [],
      deps,
      cleanup: oldHook?.cleanup,
    };
    currentlyRenderingFiber.hooks![hookIndex] = newHook;
    currentlyRenderingFiber.effectTag = "UPDATE";
  } else {
    if (oldHook) {
      oldHook.state = effect; // Always update the effect function
      currentlyRenderingFiber.hooks![hookIndex] = oldHook;
    }
  }

  incrementHookIndex();
}
