import { VNode } from "@tsmk/kernel";

/**
 * The hyperscript factory function returned for each tag.
 * e.g., h.div(props, children)
 */
type HyperscriptFactory = (
  props?: Record<string, any>,
  children?: (VNode | string | undefined | null)[] | VNode | string
) => VNode;

/**
 * A type that represents the h proxy, allowing access to any
 * property, which will in turn return a HyperscriptFactory.
 */
type H = {
  [tag: string]: HyperscriptFactory;
};

const handler: ProxyHandler<H> = {
  get(_target, tag: string): HyperscriptFactory {
    // For any property access (e.g., h.div), return a function
    // that creates a VNode with that tag as its type.
    return (
      props?: Record<string, any>,
      children?: (VNode | string | undefined | null)[] | VNode | string
    ): VNode => {
      return {
        factory: tag,
        props: {
          ...props,
          children: Array.isArray(children)
            ? (children.flat().filter((c) => c != null) as (VNode | string)[])
            : children
            ? [children]
            : [],
        },
      };
    };
  },
};

export const h = new Proxy<H>({} as H, handler);
