import {
  VNode,
  ComponentFactory,
  LoggerPlugins,
  Orchestrator,
} from "@tsmk/kernel";

// ===================================================================
//
//                        TYPES
//
// ===================================================================

type EffectTag = "UPDATE" | "PLACEMENT" | "DELETION";

type Hook = {
  state: any;
  queue: any[];
  deps?: any[];
  effect?: () => (() => void) | void;
  cleanup?: (() => void) | void;
};

type Fiber = {
  vnode: VNode;
  parent?: Fiber;
  sibling?: Fiber;
  child?: Fiber;
  alternate?: Fiber;
  effectTag?: "PLACEMENT" | "UPDATE" | "DELETION";
  _nativeElement?: HostInstance | HostTextInstance;
  hooks?: Hook[];
  container?: HostInstance;
  deletions?: Fiber[];
};

// ===================================================================
//
//                      MODULE-LEVEL STATE
//
// ===================================================================

let workInProgressRoot: Fiber | null = null;
let currentRoot: Fiber | null = null;
let nextUnitOfWork: Fiber | null = null;
let deletions: Fiber[] | null = null;
let currentlyRenderingFiber: Fiber | null = null;
let hookIndex = 0;
let hostConfig: HostConfig | null = null;
let logger: LoggerPlugins | undefined | null = null;
let scheduleUpdate: (() => void) | null = null;

const roots = new Map<HostInstance, Fiber>();
const instanceToFiberMap = new Map<HostInstance, Fiber>();

// ===================================================================
//
//                        PUBLIC API
//
// ===================================================================

export function render(
  vnode: VNode | null,
  container: HostInstance,
  config: HostConfig,
  updateCallback: () => void
) {
  hostConfig = config;
  scheduleUpdate = updateCallback;

  const currentRoot =
    workInProgressRoot?.container === container ? workInProgressRoot : null;

  const newVNode = vnode
    ? { factory: "ROOT", props: { children: [vnode] } }
    : { factory: "ROOT", props: { children: [] } };

  workInProgressRoot = {
    vnode: newVNode,
    container,
    _nativeElement: container,
    alternate: currentRoot ?? undefined,
    hooks: [],
  };
  deletions = [];
  nextUnitOfWork = workInProgressRoot;

  // Start the work loop
  while (nextUnitOfWork) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }

  // Commit the tree
  if (workInProgressRoot) {
    commitRoot(workInProgressRoot);
  }
}

export function useState<T>(initialState: T): [T, (newState: T) => void] {
  if (!currentlyRenderingFiber) {
    throw new Error("useState can only be called inside a component");
  }

  const oldHook = currentlyRenderingFiber.alternate?.hooks?.[hookIndex];
  const hook: Hook = {
    state: oldHook ? oldHook.state : initialState,
    queue: [],
  };

  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    hook.state = action(hook.state);
  });

  const setState = (action: (prevState: T) => T) => {
    hook.queue.push(action);
    if (scheduleUpdate) {
      scheduleUpdate();
    }
  };

  currentlyRenderingFiber.hooks!.push(hook);
  hookIndex++;
  return [hook.state, (newState: T) => setState(() => newState)];
}

export function use<T>(signal: {
  read: () => T;
  subscribe: (fn: (value: T) => void) => () => void;
}): T {
  const [value, setValue] = useState(signal.read());

  useEffect(() => {
    return signal.subscribe(setValue);
  }, [signal]);

  return value;
}

export function useEffect(effect: () => (() => void) | void, deps?: any[]) {
  if (!currentlyRenderingFiber) {
    throw new Error("useEffect can only be called inside a component");
  }

  const oldHook = currentlyRenderingFiber.alternate?.hooks?.[hookIndex];

  const hasChanged = deps
    ? !oldHook || !oldHook.deps || deps.some((d, i) => d !== oldHook.deps?.[i])
    : true;

  const hook: Hook = {
    state: null,
    queue: [],
    deps,
  };

  if (hasChanged) {
    hook.effect = effect;
  }

  hook.cleanup = oldHook?.cleanup;

  currentlyRenderingFiber.hooks!.push(hook);
  hookIndex++;
}

// ===================================================================
//
//                     PHASE 1: RECONCILE (RENDER)
//
// ===================================================================

function performUnitOfWork(fiber: Fiber): Fiber | null {
  const isFunctionComponent = typeof fiber.vnode.factory === "function";

  if (isFunctionComponent) {
    currentlyRenderingFiber = fiber;
    hookIndex = 0;
    fiber.hooks = [];
    try {
      const Component = fiber.vnode.factory as ComponentFactory;
      const children = [Component(fiber.vnode.props ?? {})];
      reconcileChildren(fiber, children);
    } finally {
      currentlyRenderingFiber = null;
    }
  } else {
    updateHostComponent(fiber);
  }

  // Return next unit of work
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
  // This function is now empty as its logic is moved to performUnitOfWork
}

function updateHostComponent(fiber: Fiber) {
  if (!fiber._nativeElement) {
    if (fiber.vnode.factory === "TEXT_ELEMENT") {
      fiber._nativeElement = hostConfig!.createTextInstance(
        fiber.vnode.props?.nodeValue ?? ""
      );
    } else {
      fiber._nativeElement = hostConfig!.createInstance(
        fiber.vnode.factory as string,
        fiber.vnode.props ?? {}
      );
    }
  }
  const children = fiber.vnode.props?.children || [];
  reconcileChildren(fiber, children);
}

function reconcileChildren(wipFiber: Fiber, children: (VNode | string)[]) {
  let index = 0;
  let oldFiber = wipFiber.alternate?.child;
  let prevSibling: Fiber | null = null;

  while (index < children.length || oldFiber != null) {
    const child = children[index];
    let newFiber: Fiber | null = null;
    const vnode =
      typeof child === "string"
        ? { factory: "TEXT_ELEMENT", props: { nodeValue: child, children: [] } }
        : child;

    const sameType =
      oldFiber && vnode && vnode.factory === oldFiber.vnode.factory;

    if (sameType && oldFiber && vnode) {
      // Update
      newFiber = {
        vnode,
        parent: wipFiber,
        alternate: oldFiber,
        _nativeElement: oldFiber._nativeElement,
        effectTag: "UPDATE",
        hooks: oldFiber.hooks,
      };
    }
    if (vnode && !sameType) {
      // Placement
      newFiber = {
        vnode,
        parent: wipFiber,
        effectTag: "PLACEMENT",
        hooks: [],
      };
    }
    if (oldFiber && !sameType) {
      // Deletion
      oldFiber.effectTag = "DELETION";
      deletions!.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber ?? undefined;
    } else if (prevSibling) {
      prevSibling.sibling = newFiber ?? undefined;
    }

    prevSibling = newFiber;
    index++;
  }
}

// ===================================================================
//
//                      PHASE 2: COMMIT
//
// ===================================================================

function commitRoot(root: Fiber) {
  deletions!.forEach(commitWork);
  commitWork(root.child);
  runEffects(root);
  currentRoot = root;
}

function runEffects(fiber?: Fiber) {
  if (!fiber) return;

  if (fiber.effectTag === "UPDATE" || fiber.effectTag === "PLACEMENT") {
    fiber.hooks?.forEach((hook) => {
      if (hook.effect) {
        const cleanup = hook.effect();
        if (typeof cleanup === "function") {
          hook.cleanup = cleanup;
        }
      }
    });
  }

  runEffects(fiber.child);
  runEffects(fiber.sibling);
}

function commitWork(fiber?: Fiber) {
  if (!fiber) {
    return;
  }

  let parentFiber = fiber.parent;
  while (parentFiber && !parentFiber._nativeElement) {
    parentFiber = parentFiber.parent;
  }
  const parentDom = parentFiber?._nativeElement;

  if (fiber.effectTag === "PLACEMENT" && fiber._nativeElement) {
    hostConfig!.appendChild(parentDom, fiber._nativeElement);
  } else if (fiber.effectTag === "UPDATE" && fiber._nativeElement) {
    hostConfig!.commitUpdate(fiber._nativeElement, fiber.vnode.props ?? {});
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber);
    return; // No need to commit children of a deleted fiber
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber: Fiber) {
  let parentFiber = fiber.parent;
  while (parentFiber && !parentFiber._nativeElement) {
    parentFiber = parentFiber.parent;
  }
  const domParent = parentFiber!._nativeElement;
  commitDeletionRecursive(fiber, domParent);
}

function commitDeletionRecursive(fiber: Fiber, domParent: HostInstance) {
  if (fiber._nativeElement) {
    hostConfig!.removeChild(domParent, fiber._nativeElement);
  } else {
    if (fiber.child) {
      commitDeletionRecursive(fiber.child, domParent);
    }
  }

  // Also process siblings
  if (fiber.sibling) {
    commitDeletionRecursive(fiber.sibling, domParent);
  }

  // Run effect cleanups
  if (fiber.effectTag === "DELETION" && fiber.hooks) {
    fiber.hooks.forEach((hook) => hook.cleanup?.());
  }
}

// ===================================================================

// A generic handle for an instance in the host environment (e.g., a DOM element)
export type HostInstance = any;
export type HostTextInstance = any;

/**
 * The HostConfig interface is the bridge between the reconciler and the target
 * rendering environment (e.g., DOM, TUI, etc.). By implementing these methods,
 * you can "teach" the reconciler how to manage your specific host environment.
 */
export interface HostConfig {
  // Methods for creating instances in the host environment
  createInstance(type: string, props: object): HostInstance;

  // Methods for mutating the host tree
  appendChild(
    parent: HostInstance,
    child: HostInstance | HostTextInstance
  ): void;
  removeChild(
    parent: HostInstance,
    child: HostInstance | HostTextInstance
  ): void;
  insertBefore(
    parent: HostInstance,
    child: HostInstance | HostTextInstance,
    beforeChild: HostInstance | HostTextInstance
  ): void;

  // Methods for updating an instance's properties
  commitUpdate(instance: HostInstance, newProps: object): void;

  // New method for creating text instances
  createTextInstance(nodeValue: string): HostTextInstance;
}

// ===================================================================

// --- Event System ---

function getEventHandlerName(eventName: string) {
  return `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
}

export function dispatchEvent(
  target: HostInstance,
  eventName: string,
  payload: any
) {
  const handlerName = getEventHandlerName(eventName);
  let currentFiber = instanceToFiberMap.get(target);

  while (currentFiber) {
    const handler = currentFiber.vnode.props?.[handlerName];
    if (typeof handler === "function") {
      handler(payload);
      return; // Stop propagation after first handler
    }
    currentFiber = currentFiber.parent;
  }
}

/**
 * (For Testing Purposes Only)
 * Resets the internal state of the reconciler.
 * @private
 */
export function _reset() {
  roots.clear();
  instanceToFiberMap.clear();
  workInProgressRoot = null;
  currentRoot = null;
  nextUnitOfWork = null;
  deletions = null;
  currentlyRenderingFiber = null;
  hookIndex = 0;
  hostConfig = null;
  logger = null;
}
