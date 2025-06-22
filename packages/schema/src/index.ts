import { Orchestrator, Reactor, StepHandler } from "@tsmk/kernel";

export type Schema<TInput, TOutput> = Reactor.Kernel<
  SchemaContextMap<TOutput>
> & {
  _input: TInput;
  _output: TOutput;
  _shape?: Record<string, Schema<any, any>>;

  optional(): Schema<TInput | undefined, TOutput | undefined>;
  nullable(): Schema<TInput | null, TOutput | null>;
} & (TOutput extends Record<string, any>
    ? {
        partial(): Schema<Partial<TInput>, Partial<TOutput>>;
        extend<TExtend extends Record<string, Schema<any, any>>>(
          shape: TExtend
        ): Schema<
          TInput & { [K in keyof TExtend]: inferSchemaInput<TExtend[K]> },
          TOutput & { [K in keyof TExtend]: inferSchemaOutput<TExtend[K]> }
        >;
        pick<K extends keyof TInput & keyof TOutput>(mask: {
          [P in K]: true;
        }): Schema<Pick<TInput, K>, Pick<TOutput, K>>;
        omit<K extends keyof TInput & keyof TOutput>(mask: {
          [P in K]: true;
        }): Schema<Omit<TInput, K>, Omit<TOutput, K>>;
      }
    : {});

export type inferSchemaInput<T> = T extends Schema<infer U, any> ? U : never;
export type inferSchemaOutput<T> = T extends Schema<any, infer U> ? U : never;

export type infer<T extends Schema<any, any>> = T["_output"];

export * from "./s";
export * from "./template";

/**
 * The structure for a single validation issue.
 */
export type ValidationIssue = {
  path: (string | number)[];
  message: string;
};

/**
 * The internal context object that is passed through the validation pipeline.
 */
export interface ValidationPipelineContext
  extends Orchestrator.PipelineContext {
  value: unknown;
  issues: ValidationIssue[];
  path: (string | number)[];
  output: any;
}

/**
 * A Validation Step is a step in an Orchestrator pipeline.
 */
export type ValidationStep = StepHandler<ValidationPipelineContext>;

/**
 * The result of a safe validation attempt.
 */
export type SafeValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationIssue[] };

/**
 * The context for the public 'safeValidate' event. The result of the
 * operation will be attached to the `result` property.
 */
export interface SafeValidateContext<T> {
  value: unknown;
  result?: SafeValidationResult<T>;
}

/**
 * The context for the public 'validate' event. The result or error of the
 * operation will be attached to the context object.
 */
export interface ValidateContext<T> {
  value: unknown;
  result?: T;
  error?: Error;
}

/**
 * The context map for the schema kernel, defining the events it can react to.
 */
export type SchemaContextMap<T> = {
  safeValidate: SafeValidateContext<T>;
  validate: ValidateContext<T>;
};

/**
 * Creates a new schema from an array of validation steps.
 *
 * @param steps An array of Orchestrator step handlers that perform validation.
 * @returns A new, pure Reactor.Kernel configured to handle validation events.
 */
export function createSchema<TOutput = unknown>(
  steps: ValidationStep[]
): Reactor.Kernel<SchemaContextMap<TOutput>> {
  const validationPipeline = Orchestrator.create(steps);

  const kernel = Reactor.create<SchemaContextMap<TOutput>>({
    eventMap: {
      safeValidate: [
        async (ctx) => {
          const pipelineCtx: ValidationPipelineContext = {
            value: ctx.value,
            issues: [],
            path: [],
            output: ctx.value,
          };
          await validationPipeline.run(pipelineCtx);
          if (pipelineCtx.issues.length > 0) {
            ctx.result = { success: false, error: pipelineCtx.issues };
          } else {
            ctx.result = { success: true, data: pipelineCtx.output as TOutput };
          }
        },
      ],
      validate: [
        async (ctx) => {
          const pipelineCtx: ValidationPipelineContext = {
            value: ctx.value,
            issues: [],
            path: [],
            output: ctx.value,
          };
          await validationPipeline.run(pipelineCtx);
          if (pipelineCtx.issues.length > 0) {
            const errorMessages = pipelineCtx.issues
              .map((e) => e.message)
              .join(", ");
            ctx.error = new Error(`Validation failed: ${errorMessages}`);
          } else {
            ctx.result = pipelineCtx.output as TOutput;
          }
        },
      ],
    },
  });

  return kernel;
}
