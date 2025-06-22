import { LoggerPlugins, StepHandler, Orchestrator, BREAK } from "@tsmk/kernel";
import { LogLevel, LogLevels, LogRecord, Transport } from "./types";
import { safeStringify } from "./safe-stringify";

/**
 * The context for a log-processing pipeline. It starts with the properties
 * passed to the logger call (e.g., `message`, `data`) and is enriched
 * with logging-specific fields like `level` and `time`.
 */
type LogPipelineContext = Partial<LogRecord> & {
  message: string;
  data?: Record<string, any>;
  error?: any;
};

function createLogPipelineSteps(transport: Transport): StepHandler[] {
  return [
    // Step 1: Add timestamp and prepare error for serialization
    (ctx: LogPipelineContext) => {
      ctx.time = Date.now();
      if (ctx.error) {
        const err =
          ctx.error instanceof Error ? ctx.error : new Error(String(ctx.error));
        ctx.error = {
          name: err.name,
          message: err.message,
          stack: err.stack,
        };
      }
    },
    // Step 2: Format to JSON string
    (ctx: LogPipelineContext) => {
      const formatted = safeStringify(ctx);
      // Pass the formatted string to the next step
      (ctx as any).__formatted = formatted;
    },
    // Step 3: Dispatch to transport
    async (ctx: LogPipelineContext) => {
      const formatted = (ctx as any).__formatted;
      await transport.send(formatted);
    },
  ];
}

export type CreateLoggerParams = {
  minLevel?: LogLevel;
  transport: Transport;
};

export type CreateLoggerResult = {
  plugins: LoggerPlugins;
};

/**
 * Creates a set of logger plugins that can be injected into a kernel.
 */
export function createLogger({
  minLevel = "info",
  transport,
}: CreateLoggerParams): CreateLoggerResult {
  const plugins: LoggerPlugins = {
    info: [],
    warn: [],
    error: [],
  };

  const createLogFunction = (
    level: LogLevel
  ): StepHandler<LogPipelineContext> => {
    return (context: LogPipelineContext) => {
      const pipelineSteps: StepHandler<LogPipelineContext>[] = [
        (ctx) => {
          ctx.level = level;
          ctx.time = Date.now();
          if (ctx.error) {
            const err =
              ctx.error instanceof Error
                ? ctx.error
                : new Error(String(ctx.error));
            ctx.error = {
              name: err.name,
              message: err.message,
              stack: err.stack,
            };
          }
        },
        (ctx) => {
          const formatted = safeStringify(ctx);
          (ctx as any).__formatted = formatted;
        },
        async (ctx) => {
          const formatted = (ctx as any).__formatted;
          await transport.send(formatted);
        },
      ];

      const kernel = Orchestrator.create(pipelineSteps);
      return kernel.run(context);
    };
  };

  // Create a plugin for each log level defined in LoggerPlugins
  for (const level of Object.keys(plugins) as (keyof LoggerPlugins)[]) {
    if (LogLevels[level] >= LogLevels[minLevel]) {
      plugins[level] = [createLogFunction(level as LogLevel) as any];
    }
  }

  return { plugins };
}
