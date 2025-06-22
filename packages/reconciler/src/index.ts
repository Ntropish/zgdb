import {
  VNode,
  ComponentFactory,
  LoggerPlugins,
  Orchestrator,
} from "@tsmk/kernel";

// ===================================================================
//
//         Module-level state for the reconciler.
//
// ===================================================================

type EffectTag = "UPDATE" | "PLACEMENT" | "DELETION";

type Hook = {
  state: any;
  queue: any[];
  deps?: any[];
  cleanup?: () => void;
};

type Fiber = {
  vnode: VNode;
  parent?: Fiber;
  sibling?: Fiber;
  child?: Fiber;
  alternate?: Fiber;
  effectTag?: EffectTag;
  _nativeElement?: any;
  hooks?: Hook[];
};

let workInProgressRoot: Fiber | null = null;
let currentRoot: Fiber | null = null;
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
//                        Hooks Implementation
//
// ===================================================================

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

export function useState<T>(initialState: T): [T, (newState: T) => void] {
  const oldHook = currentlyRenderingFiber?.alternate?.hooks?.[hookIndex];
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

  currentlyRenderingFiber?.hooks?.push(hook);
  hookIndex++;
  return [hook.state, (newState: T) => setState(() => newState)];
}

export function useEffect(didUpdate: () => (() => void) | void, deps?: any[]) {
  const oldHook = currentlyRenderingFiber?.alternate?.hooks?.[hookIndex] as
    | Hook
    | undefined;

  const hasChanged = deps
    ? !oldHook || !oldHook.deps || deps.some((d, i) => d !== oldHook.deps?.[i])
    : true;

  const hook: Hook = {
    state: null,
    queue: [],
    deps,
    cleanup: undefined,
  };

  if (hasChanged) {
    // We run the effect after the commit phase
    // For now, we'll just prepare it
    if (oldHook?.cleanup) {
      oldHook.cleanup();
    }
    const newCleanup = didUpdate();
    hook.cleanup = typeof newCleanup === "function" ? newCleanup : undefined;
  } else {
    hook.cleanup = oldHook?.cleanup;
  }

  currentlyRenderingFiber?.hooks?.push(hook);
  hookIndex++;
}

export function render(
  vnode: VNode,
  container: HostInstance,
  config: HostConfig,
  updateCallback: () => void,
  options?: { logger?: LoggerPlugins }
) {
  hostConfig = config;
  logger = options?.logger;
  scheduleUpdate = updateCallback;
  const logOrchestrator = Orchestrator.create(logger?.info ?? []);
  logOrchestrator.run({
    message: "render: start",
    data: { vnode, container },
  });

  workInProgressRoot = {
    vnode: { factory: "ROOT", props: { children: [vnode] } },
    _nativeElement: container,
    alternate: currentRoot ?? undefined,
  };
  deletions = [];
  reconcile(workInProgressRoot, config, logOrchestrator);
  if (workInProgressRoot) {
    commitRoot(workInProgressRoot, config, logOrchestrator);
    currentRoot = workInProgressRoot;
    workInProgressRoot = null;
  }

  logOrchestrator.run({ message: "render: end" });
}

function reconcile(
  fiber: Fiber,
  hostConfig: HostConfig,
  logOrchestrator: Orchestrator.Kernel<any>
) {
  logOrchestrator.run({
    message: "reconcile: visiting",
    data: { factory: fiber.vnode.factory, props: fiber.vnode.props },
  });

  const isFunctionComponent = typeof fiber.vnode.factory === "function";

  if (isFunctionComponent) {
    reconcileFunctionComponent(fiber, hostConfig, logOrchestrator);
  } else {
    reconcileHostComponent(fiber, hostConfig, logOrchestrator);
  }
}

function reconcileFunctionComponent(
  fiber: Fiber,
  hostConfig: HostConfig,
  logOrchestrator: Orchestrator.Kernel<any>
) {
  const Component = fiber.vnode.factory as ComponentFactory;
  const childVNode = Component(fiber.vnode.props ?? {});
  reconcileChildren([childVNode], fiber, hostConfig, logOrchestrator);
}

function reconcileHostComponent(
  fiber: Fiber,
  hostConfig: HostConfig,
  logOrchestrator: Orchestrator.Kernel<any>
) {
  if (!fiber._nativeElement) {
    fiber._nativeElement = hostConfig.createInstance(
      fiber.vnode.factory as string,
      fiber.vnode.props ?? {}
    );
    logOrchestrator.run({
      message: "reconcile: created host instance",
      data: { factory: fiber.vnode.factory },
    });
    instanceToFiberMap.set(fiber._nativeElement, fiber);
  }

  const children = (fiber.vnode.props?.children || []).flat();
  reconcileChildren(children, fiber, hostConfig, logOrchestrator);
}

function reconcileChildren(
  children: (VNode | string)[],
  fiber: Fiber,
  hostConfig: HostConfig,
  logOrchestrator: Orchestrator.Kernel<any>
) {
  const newChildren = children.filter((c): c is VNode => typeof c !== "string");
  let oldFiber = fiber.alternate?.child;
  let i = 0;
  let prevSibling: Fiber | null = null;

  while (i < newChildren.length || oldFiber) {
    const childVNode = newChildren[i];
    let newFiber: Fiber | null = null;

    const sameType =
      oldFiber && childVNode && oldFiber.vnode.factory === childVNode.factory;

    if (sameType && oldFiber) {
      // Update
      newFiber = {
        vnode: childVNode,
        parent: fiber,
        alternate: oldFiber,
        _nativeElement: oldFiber._nativeElement,
        effectTag: "UPDATE",
      };
    } else {
      if (childVNode) {
        // Placement
        newFiber = {
          vnode: childVNode,
          parent: fiber,
          effectTag: "PLACEMENT",
        };
      }
      if (oldFiber) {
        // Deletion
        oldFiber.effectTag = "DELETION";
        deletions?.push(oldFiber);
      }
    }

    if (i > 0 && newFiber) {
      if (prevSibling) {
        prevSibling.sibling = newFiber;
      }
    } else {
      fiber.child = newFiber ?? undefined;
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (newFiber) {
      prevSibling = newFiber;
      reconcile(newFiber, hostConfig, logOrchestrator);
    }
    i++;
  }
}

function commitRoot(
  root: Fiber,
  hostConfig: HostConfig,
  logOrchestrator: Orchestrator.Kernel<any>
) {
  deletions?.forEach((f) => commitWork(f, hostConfig, logOrchestrator));
  commitWork(root.child, hostConfig, logOrchestrator);
}

function commitWork(
  fiber: Fiber | undefined,
  hostConfig: HostConfig,
  logOrchestrator: Orchestrator.Kernel<any>
) {
  if (!fiber) return;
  logOrchestrator.run({
    message: "commit: visiting",
    data: { factory: fiber.vnode.factory, effectTag: fiber.effectTag },
  });

  let parentFiber = fiber.parent;
  while (parentFiber && !parentFiber._nativeElement) {
    parentFiber = parentFiber.parent;
  }
  const parentElement = parentFiber?._nativeElement;

  if (
    fiber.effectTag === "PLACEMENT" &&
    fiber._nativeElement &&
    parentElement
  ) {
    hostConfig.appendChild(parentElement, fiber._nativeElement);
    logOrchestrator.run({
      message: "commit: appended child",
      data: {
        parent: parentFiber?.vnode.factory,
        child: fiber.vnode.factory,
      },
    });
  } else if (fiber.effectTag === "UPDATE" && fiber._nativeElement) {
    hostConfig.commitUpdate(fiber._nativeElement, fiber.vnode.props ?? {});
    logOrchestrator.run({
      message: "commit: updated instance",
      data: { factory: fiber.vnode.factory },
    });
  } else if (fiber.effectTag === "DELETION") {
    if (parentElement && fiber._nativeElement) {
      hostConfig.removeChild(parentElement, fiber._nativeElement);
      logOrchestrator.run({
        message: "commit: removed child",
        data: {
          parent: parentFiber?.vnode.factory,
          child: fiber.vnode.factory,
        },
      });
    }
    return; // Don't commit children of a deleted node.
  }

  commitWork(fiber.child, hostConfig, logOrchestrator);
  commitWork(fiber.sibling, hostConfig, logOrchestrator);
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
  deletions = [];
  currentlyRenderingFiber = null;
  hookIndex = 0;
  hostConfig = null;
  logger = null;
}
