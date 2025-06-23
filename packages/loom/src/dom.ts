import { VNode } from "@tsmk/kernel";
import {
  render as tsmkRender,
  HostConfig,
  HostInstance,
  HostTextInstance,
} from "@tsmk/reconciler";

// The HostConfig tells the reconciler how to interact with the DOM.
const domHostConfig: HostConfig = {
  createInstance: (type: string, props: Record<string, any>): HostInstance => {
    const el = document.createElement(type);
    for (const key in props) {
      if (key !== "children") {
        (el as any)[key] = props[key];
      }
    }
    return el;
  },
  createTextInstance: (text: string): HostTextInstance => {
    return document.createTextNode(text);
  },
  appendChild: (parent: HostInstance, child: HostInstance) => {
    parent.appendChild(child);
  },
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

const Empty = () => ({ factory: "div", props: { children: [] } });

const roots = new Map<HTMLElement, { vnode: VNode; update: () => void }>();

/**
 * Renders a VNode into a DOM container.
 *
 * @param vnode The VNode to render.
 * @param container The DOM element to render into.
 */
export function render(vnode: VNode | null, container: HTMLElement) {
  const vnodeToRender = vnode || { factory: Empty, props: {} };
  let root = roots.get(container);

  if (root) {
    root.vnode = vnodeToRender;
  } else {
    const update = () => {
      const currentRoot = roots.get(container);
      if (currentRoot) {
        tsmkRender(currentRoot.vnode, container, domHostConfig, update);
      }
    };
    root = { vnode: vnodeToRender, update };
    roots.set(container, root);
  }

  root.update();
}
