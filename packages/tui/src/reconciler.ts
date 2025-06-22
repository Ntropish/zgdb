import { HostConfig, HostInstance, HostTextInstance } from "@tsmk/reconciler";
import { VNode, LoggerPlugins, Orchestrator } from "@tsmk/kernel";
import { TuiNode } from "./types.js";

export type TuiHostInstance = {
  type: string;
  props: Record<string, any>;
  children: TuiHostInstance[];
};

export function createTuiHostConfig(
  orchestrator: Orchestrator.Kernel<any>,
  logger?: LoggerPlugins
): HostConfig {
  return {
    createInstance(type: string, props: any): HostInstance {
      const instance: TuiHostInstance = {
        type,
        props,
        children: [],
      };
      // Special handling for text content
      if (type === "text" && props.children?.[0]) {
        instance.props.content = props.children[0];
      }
      return instance;
    },
    appendChild(parent: TuiHostInstance, child: TuiHostInstance) {
      parent.children.push(child);
    },
    removeChild(parent: TuiHostInstance, child: TuiHostInstance) {
      const index = parent.children.indexOf(child);
      if (index > -1) {
        parent.children.splice(index, 1);
      }
    },
    insertBefore(
      parent: TuiHostInstance,
      child: TuiHostInstance,
      beforeChild: TuiHostInstance
    ) {
      const index = parent.children.indexOf(beforeChild);
      if (index > -1) {
        parent.children.splice(index, 0, child);
      } else {
        parent.children.push(child);
      }
    },
    commitUpdate(instance: TuiHostInstance, newProps: object) {
      instance.props = newProps;
    },
  };
}
