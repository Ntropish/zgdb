// ===================================================================
//
//                         The Orchestrator
//
// ===================================================================

import { BREAK, LoggerPlugins, StepHandler, OrchestratorKernel } from "./types";

export type PipelineContext = Record<string, any>;

let orchestratorCounter = 0;

export namespace Orchestrator {
  export type Kernel<TContext extends PipelineContext> =
    OrchestratorKernel<TContext>;

  class KernelImpl<TContext extends PipelineContext>
    implements Kernel<TContext>
  {
    private steps: StepHandler<TContext>[];
    private logger?: LoggerPlugins;
    private orchestratorId: number;

    constructor(
      steps: StepHandler<TContext>[],
      logger?: LoggerPlugins,
      orchestratorId?: number
    ) {
      this.steps = steps;
      this.logger = logger;
      this.orchestratorId = orchestratorId ?? orchestratorCounter++;
      if (this.logger?.info) {
        this.logger.info.forEach((fn) =>
          fn({
            message: "Orchestrator constructor called",
            data: {
              orchestratorId: this.orchestratorId,
              steps: this.steps.length,
            },
          })
        );
      }
      this.run = this.run.bind(this);
    }

    public async run(
      ctx: Partial<TContext> = {}
    ): Promise<TContext | typeof BREAK> {
      if (!ctx.__isLog && this.logger?.info) {
        this.logger.info.forEach((fn) =>
          fn({
            message: "Orchestrator run called",
            data: { orchestratorId: this.orchestratorId },
          })
        );
      }
      let currentContext = ctx as TContext;
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        const stepId = `${this.orchestratorId}:${i}`;

        if (!ctx.__isLog && this.logger?.info) {
          const logCtx = {
            message: "Executing step",
            data: {
              orchestratorId: this.orchestratorId,
              stepId,
              contextBefore: currentContext,
            },
          };
          if (this.logger?.info) this.logger.info.forEach((fn) => fn(logCtx));
        }

        try {
          if (this.logger?.info) {
            this.logger.info.forEach((fn) =>
              fn({
                message: "Awaiting step result...",
                data: { orchestratorId: this.orchestratorId, stepId },
              })
            );
          }
          const result = await Promise.resolve(step(currentContext));
          if (!ctx.__isLog && this.logger?.info) {
            this.logger.info.forEach((fn) =>
              fn({
                message: "Step result received",
                data: {
                  orchestratorId: this.orchestratorId,
                  stepId,
                  result,
                },
              })
            );
          }

          if (this.logger?.info) {
            const logCtx = {
              message: "Step executed",
              data: {
                orchestratorId: this.orchestratorId,
                stepId,
                contextAfter: currentContext,
              },
            };
            if (!ctx.__isLog && this.logger?.info)
              this.logger.info.forEach((fn) => fn(logCtx));
          }

          if (result === BREAK) {
            if (!ctx.__isLog && this.logger?.warn) {
              const logCtx = {
                message: "Orchestrator broken",
                data: { orchestratorId: this.orchestratorId, stepId },
              };
              if (this.logger?.warn)
                this.logger.warn.forEach((fn) => fn(logCtx));
            }
            return BREAK;
          }

          if (typeof result === "object" && result !== null) {
            currentContext = { ...currentContext, ...result };
          }
        } catch (error) {
          if (!ctx.__isLog && this.logger?.error) {
            const logCtx = {
              message: "Step execution failed",
              error,
              data: { orchestratorId: this.orchestratorId, stepId },
            };
            if (this.logger?.error)
              this.logger.error.forEach((fn) => fn(logCtx));
          }
          throw error;
        }
      }
      return currentContext;
    }

    public clone(): Kernel<TContext> {
      return new KernelImpl<TContext>([...this.steps], this.logger);
    }
  }

  export function create<TContext extends PipelineContext>(
    steps: StepHandler<TContext>[] | StepHandler<TContext>,
    logger?: LoggerPlugins
  ): OrchestratorKernel<TContext> {
    if (logger?.info) {
      logger.info.forEach((fn) =>
        fn({
          message: "Orchestrator.create called",
          data: {
            steps: Array.isArray(steps) ? steps.length : 1,
          },
        })
      );
    }
    return new KernelImpl<TContext>(
      Array.isArray(steps) ? steps : [steps],
      logger
    );
  }
}
