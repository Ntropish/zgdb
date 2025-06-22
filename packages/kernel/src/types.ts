import { ComponentFactory } from "./component";

/**
 * A unique symbol used to signal that an orchestrator pipeline should halt execution.
 */
export const BREAK = Symbol.for("Orchestrator.BREAK");

/**
 * The most basic execution unit in the kernel. A function that accepts a context object
 * and can perform synchronous or asynchronous work.
 */
export type StepHandler<TContext extends Record<string, any> = any> = (
  ctx: TContext
) => unknown;

/**
 * The interface for a kernel that executes a linear pipeline of StepHandlers.
 */
export interface OrchestratorKernel<
  TContext extends Record<string, any> = any
> {
  run(ctx?: Partial<TContext>): Promise<TContext | typeof BREAK>;
  clone(): OrchestratorKernel<TContext>;
}

/**
 * A reactor's event handler is a self-contained orchestrator pipeline.
 */
export type EventHandler<TContext extends Record<string, any> = any> =
  OrchestratorKernel<TContext>;

/**
 * A structured collection of StepHandler arrays for logging at different levels.
 * This is designed to be injected into kernels to provide logging capabilities
 * without creating circular dependencies.
 */
export type LoggerPlugins = {
  info?: StepHandler[];
  warn?: StepHandler[];
  error?: StepHandler[];
};
