import { Orchestrator } from "@tsmk/kernel";

/**
 * The core function signature for middleware and request handlers.
 */
export type Handler<TContext extends ServerContext> = (
  ctx: TContext,
  next: () => Promise<void>
) => Promise<void> | void;

/**
 * A standard structure for the response part of the context.
 */
export interface ServerResponse {
  statusCode?: number;
  body?: any;
  headers?: Record<string, string | number | string[]>;
}

/**
 * A generic context object that is passed through the middleware chain.
 * Transports can extend this to add protocol-specific properties.
 */
export interface ServerContext {
  readonly request: unknown;
  response: ServerResponse;
  readonly state: Map<any, any>;
  [key: string]: any;
}

export interface PipelineContext {
  [key: string]: any;
}

/**
 * Defines the contract for a transport-layer adapter that connects
 * the server engine to a specific protocol (e.g., HTTP, WebSockets).
 */
export interface TransportAdapter<TContext extends PipelineContext> {
  start(engine: Orchestrator.Kernel<TContext>): any;
  close(): Promise<void>;
}
