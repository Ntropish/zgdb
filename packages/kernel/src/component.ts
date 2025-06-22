/**
 * A VNode (Virtual Node) is the basic building block for a declarative component tree.
 * It represents a component to be mounted, including its factory, props, and any children.
 */
export type VNode = {
  factory: AnyComponentFactory<any> | string;
  props?: {
    children?: (VNode | string)[];
    [key: string]: any;
  };
};

/**
 * A ComponentFactory is a function that takes props and returns a VNode.
 * This is the core building block for creating components.
 * It can be a simple function for stateless components or a more complex one
 * that uses hooks for state and side effects.
 */
export type ComponentFactory<P = {}> = (props: P) => VNode;

/**
 * An AsyncComponentFactory is a function that takes props and returns a Promise of a VNode.
 * This is used for components that need to perform asynchronous operations.
 */
export type AsyncComponentFactory<P = {}> = (props: P) => Promise<VNode>;

/**
 * A union of ComponentFactory and AsyncComponentFactory.
 */
export type AnyComponentFactory<P = {}> =
  | ComponentFactory<P>
  | AsyncComponentFactory<P>;
