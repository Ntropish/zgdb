import { VNode, AnyComponentFactory } from "@tsmk/kernel";

type Children =
  | (VNode | string | boolean | undefined | null | (VNode | string)[])[]
  | VNode
  | string;

function createVNode(
  factory: AnyComponentFactory<any> | string,
  props?: Record<string, any>,
  children?: Children
): VNode {
  return {
    factory,
    props: {
      ...props,
      children: Array.isArray(children)
        ? (children.flat().filter((c) => c != null && c !== false) as (
            | VNode
            | string
          )[])
        : children
        ? [children]
        : [],
    },
  };
}

/**
 * The hyperscript factory function returned for each tag.
 * e.g., h.div(props, children)
 */
type HyperscriptFactory = (
  props?: Record<string, any>,
  children?: Children
) => VNode;

export interface HProxy {
  (
    factory: AnyComponentFactory<any> | string,
    props?: Record<string, any>,
    children?: Children
  ): VNode;
  [tag: string]: HyperscriptFactory;
}

const handler: ProxyHandler<any> = {
  get(_target, tag: string): HyperscriptFactory {
    // For h.div, h.span, etc.
    return (props?: Record<string, any>, children?: Children): VNode => {
      return createVNode(tag, props, children);
    };
  },
  apply(
    _target,
    _thisArg,
    [factory, props, children]: [
      AnyComponentFactory<any> | string,
      Record<string, any>?,
      Children?
    ]
  ): VNode {
    // for h(Component, props, children)
    return createVNode(factory, props, children);
  },
};

const hTarget = () => {}; // dummy function target
export const h = new Proxy(hTarget, handler) as HProxy;
