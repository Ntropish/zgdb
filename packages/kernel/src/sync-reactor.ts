// ===================================================================
//
//                      The Synchronous Reactor
//
// ===================================================================

import { SyncOrchestrator } from "./sync-orchestrator";
import { LoggerPlugins, StepHandler } from "./types";

export namespace SyncReactor {
  export type ContextMap = Record<string, SyncOrchestrator.PipelineContext>;

  export type EventMap<TContextMap extends ContextMap> = {
    [K in keyof TContextMap]: StepHandler<TContextMap[K]>[];
  };

  export type Hooks<
    TContextMap extends ContextMap,
    TEventName extends keyof TContextMap
  > = {
    onSuccess?: StepHandler<TContextMap[TEventName]>[];
    onError?: StepHandler<TContextMap[TEventName]>[];
  };

  /** A type-safe synchronous EventEmitter with Orchestrator handlers.
   */
  class SyncEventEmitter<TContextMap extends ContextMap> {
    private errorHandler: Function;
    private logger?: LoggerPlugins;
    private reactorId: number;

    constructor({
      errorHandler,
      logger,
      reactorId,
    }: {
      errorHandler: Function;
      logger?: LoggerPlugins;
      reactorId: number;
    }) {
      this.errorHandler = errorHandler;
      this.logger = logger;
      this.reactorId = reactorId;
    }
    private events: Map<keyof TContextMap, StepHandler<any>[]> = new Map();

    public on<TEventName extends keyof TContextMap>(
      eventName: TEventName,
      listeners: StepHandler<TContextMap[TEventName]>[]
    ): void {
      if (!this.events.has(eventName)) {
        this.events.set(eventName, []);
      }
      this.events.get(eventName)!.push(...listeners);
    }

    public emit<TEventName extends keyof TContextMap>(
      eventName: TEventName,
      ctx: TContextMap[TEventName],
      hooks?: Hooks<TContextMap, TEventName>
    ): TContextMap[TEventName] | symbol {
      const listeners = this.events.get(eventName);
      let finalContext: TContextMap[TEventName] | symbol = ctx;

      if (listeners && listeners.length > 0) {
        if (this.logger) {
          SyncOrchestrator.create(this.logger.info).run({
            message: "Triggering event",
            data: {
              reactorId: this.reactorId,
              eventName: String(eventName),
              listeners: listeners.length,
            },
          });
        }
        try {
          finalContext = SyncOrchestrator.create(listeners).run(ctx);
          if (typeof finalContext === "symbol") return finalContext;

          if (hooks?.onSuccess) {
            finalContext = SyncOrchestrator.create(hooks.onSuccess).run(
              finalContext
            );
          }
        } catch (e: any) {
          if (hooks?.onError) {
            finalContext = SyncOrchestrator.create(hooks.onError).run(e);
          } else {
            this.errorHandler(e);
          }
        }
      } else {
        if (this.logger) {
          SyncOrchestrator.create(this.logger.warn).run({
            message: "No handler for event",
            data: {
              reactorId: this.reactorId,
              eventName: String(eventName),
            },
          });
        }
      }
      return finalContext;
    }

    public destroy(): void {
      this.events.clear();
    }
  }

  /** The public interface for the SyncReactor Kernel. */
  export interface Kernel<TContextMap extends ContextMap> {
    trigger<TEventName extends keyof TContextMap>(
      eventName: TEventName,
      ctx?: TContextMap[TEventName],
      hooks?: Hooks<TContextMap, TEventName>
    ): TContextMap[TEventName] | symbol;
    destroy(): void;
  }

  class KernelImpl<TContextMap extends ContextMap>
    implements Kernel<TContextMap>
  {
    private emitter: SyncEventEmitter<TContextMap>;

    constructor({
      errorHandler,
      eventMap,
      logger,
      reactorId,
    }: {
      errorHandler?: Function;
      eventMap: EventMap<TContextMap>;
      logger?: LoggerPlugins;
      reactorId: number;
    }) {
      this.emitter = new SyncEventEmitter<TContextMap>({
        errorHandler: errorHandler ?? console.error,
        logger,
        reactorId,
      });

      for (const eventName in eventMap) {
        const handlers = eventMap[eventName];
        this.emitter.on(eventName, handlers);
      }
    }

    public trigger<TEventName extends keyof TContextMap>(
      eventName: TEventName,
      ctx: TContextMap[TEventName],
      hooks?: Hooks<TContextMap, TEventName>
    ): TContextMap[TEventName] | symbol {
      return this.emitter.emit(eventName, ctx, hooks);
    }

    public destroy(): void {
      this.emitter.destroy();
    }
  }

  let reactorCounter = 0;

  /** Factory function to create a new SyncReactor Kernel instance. */
  export function create<
    TContextMap extends ContextMap,
    TEventMap extends EventMap<TContextMap> = EventMap<TContextMap>
  >({
    errorHandler,
    eventMap = {},
    logger,
  }: {
    errorHandler?: Function;
    eventMap?: Partial<TEventMap>;
    logger?: LoggerPlugins;
  }): Kernel<TContextMap> {
    const reactorId = reactorCounter++;
    if (logger) {
      SyncOrchestrator.create(logger.info).run({
        message: "SyncReactor created",
        data: { reactorId },
      });
    }
    return new KernelImpl<TContextMap>({
      errorHandler,
      eventMap: eventMap as any,
      logger,
      reactorId,
    });
  }

  type InferContextFromHandler<THandler> = THandler extends (
    ...args: any[]
  ) => any
    ? Parameters<THandler>[0]
    : never;

  type InferContextFromSteps<TSteps> = TSteps extends (infer S)[]
    ? InferContextFromHandler<S>
    : never;

  type InputEventMap = Record<string, StepHandler<any>[]>;

  export type InferContextMapFromInput<TInput extends InputEventMap> = {
    [K in keyof TInput]: InferContextFromSteps<TInput[K]>;
  } & ContextMap;

  /**
   * Utility to create a typed SyncReactor Kernel by inferring context
   * types directly from an event map object. This avoids the need
   * to pre-define a context map type.
   */
  export function fromEventMap<TInput extends InputEventMap>(
    eventMap: TInput
  ): Kernel<InferContextMapFromInput<TInput>> {
    return create<InferContextMapFromInput<TInput>>({
      eventMap: eventMap as any,
    });
  }
}
