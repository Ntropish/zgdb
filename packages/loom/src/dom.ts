import { VNode } from "@tsmk/kernel";
import {
  render as tsmkRender,
  HostConfig,
  HostInstance,
} from "@tsmk/reconciler";

// The HostConfig tells the reconciler how to interact with the DOM.
const domHostConfig: HostConfig = {
  createInstance: (type: string, props: Record<string, any>): Element => {
    const el = document.createElement(type);

    // Apply attributes and properties first
    for (const key in props) {
      if (key !== "children") {
        if (key.startsWith("on")) {
          const eventName = key.slice(2).toLowerCase();
          el.addEventListener(eventName, props[key]);
        } else {
          (el as any)[key] = props[key];
        }
      }
    }

    // Set text content if it exists
    if (props.children && typeof props.children[0] === "string") {
      el.textContent = props.children[0];
    }

    return el;
  },

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
    const el = instance as Element;

    // Update properties and attributes
    for (const key in newProps) {
      if (key !== "children") {
        if (key.startsWith("on")) {
          const eventName = key.slice(2).toLowerCase();
          el.addEventListener(eventName, newProps[key]);
        } else {
          (el as any)[key] = newProps[key];
        }
      }
    }

    // Update text content
    const newText =
      newProps.children && typeof newProps.children[0] === "string"
        ? newProps.children[0]
        : null;
    if (el.textContent !== newText) {
      el.textContent = newText;
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
