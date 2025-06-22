import { parseDsl } from "./parser";
import { ServerDefinition } from "./types";

/**
 * The `r` tagged template literal for defining REST servers.
 * It parses the DSL and returns a server definition.
 *
 * In the future, this will return a runnable server instance.
 */
export function r(
  strings: TemplateStringsArray,
  ...values: any[]
): ServerDefinition {
  const serverDef = parseDsl(strings, ...values);
  return serverDef;
}
