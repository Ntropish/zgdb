import { VNode } from "@tsmk/kernel";
import {
  render as tsmkRender,
  HostConfig,
  HostInstance,
  HostTextInstance,
} from "@tsmk/reconciler";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function setAttribute(el: Element, key: string, value: any) {
  if (key.startsWith("on")) {
    const eventName = key.slice(2).toLowerCase();
    el.addEventListener(eventName, value);
  } else if (typeof value === "boolean") {
    if (value) {
      el.setAttribute(key, "");
    } else {
      el.removeAttribute(key);
    }
  } else {
    el.setAttribute(key, value);
  }
}

// The HostConfig tells the reconciler how to interact with the DOM.
const domHostConfig: HostConfig = {
  createInstance: (
    type: string,
    props: Record<string, any>,
    parent: HostInstance | null
  ): HostInstance => {
    const parentIsSvg = parent && parent.namespaceURI === SVG_NAMESPACE;
    const el =
      type === "svg" || parentIsSvg
        ? document.createElementNS(SVG_NAMESPACE, type)
        : document.createElement(type);

    for (const key in props) {
      if (key !== "children") {
        setAttribute(el, key, props[key]);
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
    // Handle text node updates
    if (instance.nodeType === 3) {
      if (instance.nodeValue !== newProps.nodeValue) {
        instance.nodeValue = newProps.nodeValue;
      }
      return;
    }

    // Handle element updates
    const el = instance as Element;
    // NOTE: This simple implementation doesn't handle REMOVING attributes.
    // It only sets new ones. This is a limitation imposed by the reconciler's
    // HostConfig, which doesn't provide oldProps.
    for (const key in newProps) {
      if (key !== "children") {
        setAttribute(el, key, newProps[key]);
      }
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
