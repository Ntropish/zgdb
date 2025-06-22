import { Orchestrator, StepHandler } from "@tsmk/kernel";
import { Schema } from "@tsmk/schema";
import { IncomingMessage, ServerResponse } from "http";

// This will be refined with a strongly-typed HttpContext.
export interface Context {
  request: IncomingMessage;
  response: ServerResponse & {
    body?: any;
    statusCode?: number;
    headers?: Record<string, string>;
  };
  params: Record<string, string>;
  [key: string]: any;
}

export type Next = () => Promise<void>;

export type Handler<T extends Context = Context> = (
  ctx: T,
  next: Next
) => Promise<void>;

export type ErrorHandler = (err: Error, ctx: any) => any;

export type { StepHandler };

export interface ServerDefinition {
  type: "server";
  middleware: StepHandler[];
  items: Array<GroupDefinition | RouteDefinition>;
}

export interface GroupDefinition {
  type: "group";
  path: string;
  middleware: StepHandler[];
  items: Array<GroupDefinition | RouteDefinition>;
}

export interface RouteDefinition {
  type: "route";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  handler: StepHandler;
  schema?: Schema<any, any>;
}
