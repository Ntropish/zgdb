/**
 * A VNode (Virtual Node) is the basic building block for a declarative component tree.
 * It represents a component to be mounted, including its factory, props, and any children.
 */
export type VNode = {
  factory: ComponentFactory<any> | string;
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
