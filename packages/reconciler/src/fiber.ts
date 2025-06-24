import { VNode } from "@tsmk/kernel";
import { HostInstance, HostTextInstance } from "./hostConfig";

export type EffectTag = "UPDATE" | "PLACEMENT" | "DELETION";

export type Hook = {
  state: any;
  queue: any[];
  deps?: any[];
  cleanup?: (() => void) | void;
};

export type Fiber = {
  vnode: VNode;
  parent?: Fiber;
  sibling?: Fiber;
  child?: Fiber;
  alternate?: Fiber;
  effectTag?: EffectTag;
  _nativeElement?: HostInstance | HostTextInstance;
  hooks?: Hook[];
  deletions?: Fiber[];
};
