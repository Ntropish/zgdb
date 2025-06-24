export type VNode = any;
export type ComponentContext<P extends Record<any, any>> = {
  props: P;
  style: Record<string, string>;
  children: VNode[];
};
