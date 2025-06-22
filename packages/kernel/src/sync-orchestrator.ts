// ===================================================================
//
//                     The Synchronous Orchestrator
//
// ===================================================================

export namespace SyncOrchestrator {
  export type PipelineContext = Record<string, any>;

  export const BREAK = Symbol("SyncOrchestrator.BREAK");

  export type StepHandler<TContext extends PipelineContext> = (
    ctx: TContext
  ) => unknown;

  export interface Kernel<TContext extends PipelineContext> {
    run(initialContext: Partial<TContext>): TContext;
    clone(): Kernel<TContext>;
  }
  class KernelImpl<TContext extends PipelineContext>
    implements Kernel<TContext>
  {
    private steps: StepHandler<TContext>[];

    constructor(steps: StepHandler<TContext>[]) {
      this.steps = steps;
    }

    public run(ctx: Partial<TContext> = {}): TContext {
      const context = ctx as TContext;
      for (const handler of this.steps) {
        const result = handler(context);
        if (result === BREAK) {
          break;
        }
      }
      return context;
    }

    public clone(): Kernel<TContext> {
      // The steps array is copied, preserving immutability.
      return new KernelImpl<TContext>([...this.steps]);
    }
  }
  export function create<TContext extends PipelineContext>(
    steps: StepHandler<TContext>[] = []
  ): Kernel<TContext> {
    return new KernelImpl<TContext>(steps);
  }
}
