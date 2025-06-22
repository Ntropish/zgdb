import { parseDsl } from "./parser";
import { VNode } from "@tsmk/kernel";

/**
 * The `r` tagged template literal for defining REST servers.
 * It parses the DSL and returns a VNode tree.
 *
 * In the future, this will return a runnable server instance.
 */
export function r(strings: TemplateStringsArray, ...values: any[]): VNode {
  const serverVNode = parseDsl(strings, ...values);
  return serverVNode;
}
