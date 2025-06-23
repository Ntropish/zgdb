import { VNode } from "@tsmk/kernel";
import {
  render as tsmkRender,
  HostConfig,
  HostInstance,
} from "@tsmk/reconciler";

// The HostConfig tells the reconciler how to interact with the DOM.
const domHostConfig: HostConfig = {
  createInstance: (type: string): Element => document.createElement(type),

  appendChild: (parent: Element, child: Element | Text) =>
    parent.appendChild(child),

  removeChild: (parent: Element, child: Element | Text) =>
    parent.removeChild(child),

  insertBefore: (
    parent: Element,
    child: Element | Text,
    beforeChild: Element | Text
  ) => parent.insertBefore(child, beforeChild),

  commitUpdate: (instance: HostInstance, newProps: Record<string, any>) => {
    // A simplified update commit. In a real implementation, this would
    // be much more robust, handling event listeners, styles, etc.
    for (const key in newProps) {
      if (key !== "children") {
        if (key.startsWith("on")) {
          const eventName = key.slice(2).toLowerCase();
          // This is a naive implementation for event handlers.
          // A real one would need to handle listener removal and updates.
          (instance as Element).addEventListener(eventName, newProps[key]);
        } else {
          (instance as any)[key] = newProps[key];
        }
      }
    }
    if (typeof newProps.children?.[0] === "string") {
      (instance as Element).textContent = newProps.children[0];
    }
  },
};

/**
 * Renders a VNode into a DOM container.
 *
 * @param vnode The VNode to render.
 * @param container The DOM element to render into.
 */
export function render(vnode: VNode, container: HTMLElement) {
  // The update callback is the key to reactivity.
  // When state changes, we call this to re-render.
  const update = () => tsmkRender(vnode, container, domHostConfig, update);

  // Initial render
  update();
}
