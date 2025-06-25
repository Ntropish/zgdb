import { Reactor, Orchestrator, BREAK } from "@tsmk/kernel";
import {
  createSchema,
  ValidationStep,
  SafeValidationResult,
  SchemaContextMap,
  SafeValidateContext,
  Schema,
  ValidationPipelineContext,
} from "./index";
import { type } from "./validators/type";
import * as str from "./validators/string";
import {
  min,
  max,
  positive,
  negative,
  gt,
  lt,
  int,
  multipleOf,
} from "./validators/number";
import { object as createObjectStep } from "./validators/object";
import { array as createArrayStep } from "./validators/array";
import {
  coerceString,
  coerceNumber,
  coerceBoolean,
  coerceBigInt,
} from "./validators/coercion";
import { literal as createLiteralStep } from "./validators/literal";
import { enumStep } from "./validators/enum";
import { transform as createTransformStep } from "./validators/transform";
import { union as createUnionStep } from "./validators/union";
import { intersection as createIntersectionStep } from "./validators/intersection";
import { tuple as createTupleStep } from "./validators/tuple";

// A private registry to hold the validation steps for each schema
// created by the `s` factory. This allows for composition without
// polluting the kernel interface itself.
// const schemaSteps = new WeakMap<Schema<any, any>, ValidationStep[]>();

/**
 * An internal helper to build a kernel and register its steps.
 */
function buildSchema<TInput, TOutput>(
  steps: ValidationStep<TInput, TOutput>[]
): Schema<TInput, TOutput> {
  const kernel = createSchema<TOutput>(steps) as Schema<TInput, TOutput>;
  // schemaSteps.set(kernel, steps);

  kernel.optional = () => {
    const newSteps: ValidationStep[] = [
      (ctx: ValidationPipelineContext) => {
        if (ctx.value === undefined) {
          ctx.output = undefined;
          return BREAK;
        }
      },
      ...steps,
    ];
    return buildSchema(newSteps);
  };

  kernel.nullable = () => {
    const newSteps: ValidationStep[] = [
      (ctx: ValidationPipelineContext) => {
        if (ctx.value === null) {
          ctx.output = null;
          return BREAK;
        }
      },
      ...steps,
    ];
    return buildSchema(newSteps);
  };

  return kernel;
}

/**
 * A utility function to execute a schema's validation logic.
 *
 * @param schema The schema to execute.
 * @param value The value to validate.
 * @returns The result of the validation.
 */
export async function validate<TInput, TOutput>(
  schema: Schema<TInput, TOutput>,
  value: TInput
): Promise<SafeValidationResult<TOutput>> {
  const context: SafeValidateContext<TOutput> = { value };
  await schema.trigger("safeValidate", context);
  if (!context.result) {
    throw new Error(
      "Validation did not produce a result. This may be an issue with the schema's event handlers."
    );
  }
  return context.result;
}

type inferSchemaInput<T> = T extends Schema<infer U, any> ? U : never;
type inferSchemaOutput<T> = T extends Schema<any, infer U> ? U : never;

interface S {
  <TInput, TOutput>(
    base: Schema<TInput, TOutput>,
    ...newSteps: ValidationStep[]
  ): Schema<TInput, TOutput>;

  string: Schema<string, string>;
  number: Schema<number, number>;
  boolean: Schema<boolean, boolean>;
  undefined: Schema<undefined, undefined>;

  // String validators
  minLength: typeof str.minLength;
  maxLength: typeof str.maxLength;
  exactLength: typeof str.exactLength;
  regex: typeof str.regex;
  includes: typeof str.includes;
  startsWith: typeof str.startsWith;
  endsWith: typeof str.endsWith;
  uppercase: typeof str.uppercase;
  lowercase: typeof str.lowercase;
  email: ValidationStep;
  uuid: ValidationStep;
  url: ValidationStep;
  emoji: ValidationStep;
  base64: ValidationStep;
  base64url: ValidationStep;
  nanoid: ValidationStep;
  cuid: ValidationStep;
  cuid2: ValidationStep;
  ulid: ValidationStep;
  ipv4: ValidationStep;
  ipv6: ValidationStep;
  cidrv4: ValidationStep;
  cidrv6: ValidationStep;
  isoDate: ValidationStep;
  isoTime: ValidationStep;
  isoDateTime: ValidationStep;
  isoDuration: ValidationStep;
  datetime: ValidationStep;
  ip: typeof str.ip;

  // Number validators
  min: typeof min;
  max: typeof max;
  positive: typeof positive;
  negative: typeof negative;
  gt: typeof gt;
  lt: typeof lt;
  int: typeof int;
  multipleOf: typeof multipleOf;
  object<T extends Record<string, Schema<any, any>>>(
    shape: T
  ): Schema<
    { [K in keyof T]: inferSchemaInput<T[K]> },
    { [K in keyof T]: inferSchemaOutput<T[K]> }
  >;
  array<TInput, TOutput>(
    elementSchema: Schema<TInput, TOutput>
  ): Schema<TInput[], TOutput[]>;
  coerce: {
    string: Schema<unknown, string>;
    number: Schema<unknown, number>;
    boolean: Schema<unknown, boolean>;
    bigint: Schema<unknown, bigint>;
  };
  transform: (<TOutput>(fn: (value: any) => TOutput) => ValidationStep) & {
    trim: ValidationStep;
    toLowerCase: ValidationStep;
    toUpperCase: ValidationStep;
  };
  union<T extends [Schema<any, any>, ...Schema<any, any>[]]>(
    schemas: T
  ): Schema<inferSchemaInput<T[number]>, inferSchemaOutput<T[number]>>;
  intersection<TLeft extends Schema<any, any>, TRight extends Schema<any, any>>(
    left: TLeft,
    right: TRight
  ): Schema<
    inferSchemaInput<TLeft> & inferSchemaInput<TRight>,
    inferSchemaOutput<TLeft> & inferSchemaOutput<TRight>
  >;
  tuple<T extends readonly [Schema<any, any>, ...Schema<any, any>[]]>(
    schemas: T
  ): Schema<
    {
      [K in keyof T]: T[K] extends Schema<any, any>
        ? inferSchemaInput<T[K]>
        : never;
    },
    {
      [K in keyof T]: T[K] extends Schema<any, any>
        ? inferSchemaOutput<T[K]>
        : never;
    }
  >;
  bigint: Schema<bigint, bigint>;
  literal<T>(value: T): Schema<T, T>;
  enum<T extends readonly any[]>(values: T): Schema<T[number], T[number]>;
  void: Schema<void, void>;
}

const s_func = (base: Schema<any, any>, ...newSteps: ValidationStep[]): any => {
  const baseSteps = schemaSteps.get(base);
  if (!baseSteps) {
    throw new Error(
      "The provided base schema was not created by the `s` factory and cannot be extended."
    );
  }
  const allSteps = [...baseSteps, ...newSteps];
  return buildSchema(allSteps);
};

export const s: S = Object.assign(s_func, {
  string: buildSchema<string, string>([type("string")]),
  number: buildSchema<number, number>([type("number")]),
  boolean: buildSchema<boolean, boolean>([type("boolean")]),
  undefined: buildSchema<undefined, undefined>([type("undefined")]),

  // String validators
  minLength: str.minLength,
  maxLength: str.maxLength,
  exactLength: str.exactLength,
  regex: str.regex,
  includes: str.includes,
  startsWith: str.startsWith,
  endsWith: str.endsWith,
  uppercase: str.uppercase,
  lowercase: str.lowercase,
  email: str.email,
  uuid: str.uuid,
  url: str.url,
  emoji: str.emoji,
  base64: str.base64,
  base64url: str.base64url,
  nanoid: str.nanoid,
  cuid: str.cuid,
  cuid2: str.cuid2,
  ulid: str.ulid,
  ipv4: str.ipv4,
  ipv6: str.ipv6,
  cidrv4: str.cidrv4,
  cidrv6: str.cidrv6,
  isoDate: str.isoDate,
  isoTime: str.isoTime,
  isoDateTime: str.isoDateTime,
  isoDuration: str.isoDuration,
  datetime: str.datetime,
  ip: str.ip,

  // Number validators
  min,
  max,
  positive,
  negative,
  gt,
  lt,
  int,
  multipleOf,
  object: <T extends Record<string, Schema<any, any>>>(
    shape: T
  ): Schema<
    { [K in keyof T]: inferSchemaInput<T[K]> },
    { [K in keyof T]: inferSchemaOutput<T[K]> }
  > => {
    const newSchema = buildSchema<
      { [K in keyof T]: inferSchemaInput<T[K]> },
      { [K in keyof T]: inferSchemaOutput<T[K]> }
    >([
      createObjectStep(
        Object.fromEntries(
          Object.entries(shape).map(([key, schema]) => {
            const steps = schemaSteps.get(schema);
            if (!steps) {
              throw new Error(
                `Schema for key "${key}" was not created by the 's' factory.`
              );
            }
            return [key, steps];
          })
        )
      ),
    ]) as any;

    newSchema._shape = shape;

    newSchema.partial = () => {
      const partialShape = Object.fromEntries(
        Object.entries(shape).map(([key, schema]) => {
          return [key, schema.optional()];
        })
      );
      return s.object(partialShape);
    };

    newSchema.pick = (mask: any) => {
      const pickedShape = Object.keys(mask).reduce((acc, key) => {
        if (key in shape) {
          acc[key] = shape[key];
        }
        return acc;
      }, {} as Record<string, Schema<any, any>>);
      return s.object(pickedShape);
    };

    newSchema.omit = (mask: any) => {
      const omittedKeys = Object.keys(mask);
      const remainingShape = Object.keys(shape)
        .filter((key) => !omittedKeys.includes(key))
        .reduce((acc, key) => {
          acc[key] = shape[key];
          return acc;
        }, {} as Record<string, Schema<any, any>>);
      return s.object(remainingShape);
    };

    newSchema.extend = (extension: Record<string, Schema<any, any>>) => {
      const extendedShape = { ...shape, ...extension };
      return s.object(extendedShape);
    };

    return newSchema;
  },
  array: <TInput, TOutput>(
    elementSchema: Schema<TInput, TOutput>
  ): Schema<TInput[], TOutput[]> => {
    const elementSteps = schemaSteps.get(elementSchema);
    if (!elementSteps) {
      throw new Error(
        "The provided element schema was not created by the 's' factory."
      );
    }
    const arrStep = createArrayStep(elementSteps);
    return buildSchema<TInput[], TOutput[]>([arrStep]);
  },
  coerce: {
    string: buildSchema<unknown, string>([coerceString, type("string")]),
    number: buildSchema<unknown, number>([coerceNumber, type("number")]),
    boolean: buildSchema<unknown, boolean>([coerceBoolean, type("boolean")]),
    bigint: buildSchema<unknown, bigint>([coerceBigInt, type("bigint")]),
  },
  union: <T extends [Schema<any, any>, ...Schema<any, any>[]]>(
    schemas: T
  ): Schema<inferSchemaInput<T[number]>, inferSchemaOutput<T[number]>> => {
    const schemasWithSteps = schemas.map((schema) => {
      const steps = schemaSteps.get(schema);
      if (!steps) {
        throw new Error(
          "A schema provided to `s.union` was not created by the 's' factory."
        );
      }
      return steps;
    });

    const unionStep = createUnionStep(schemasWithSteps);
    return buildSchema([unionStep]);
  },
  intersection: <
    TLeft extends Schema<any, any>,
    TRight extends Schema<any, any>
  >(
    left: TLeft,
    right: TRight
  ) => {
    // If both are object schemas, we can merge their shapes directly.
    // This is the most common and powerful use case.
    if (left._shape && right._shape) {
      const mergedShape = { ...left._shape, ...right._shape };
      return s.object(mergedShape) as any; // Cast to avoid complex type errors
    }

    // Fallback for non-object intersections
    return buildSchema<
      inferSchemaInput<TLeft> & inferSchemaInput<TRight>,
      inferSchemaOutput<TLeft> & inferSchemaOutput<TRight>
    >([createIntersectionStep(left, right)]);
  },
  tuple: <T extends readonly [Schema<any, any>, ...Schema<any, any>[]]>(
    schemas: T
  ) => {
    return buildSchema([createTupleStep(schemas)]) as any;
  },
  transform: Object.assign(createTransformStep, {
    trim: str.trim,
    toLowerCase: str.toLowerCase,
    toUpperCase: str.toUpperCase,
  }),
  bigint: buildSchema<bigint, bigint>([type("bigint")]),
  literal: <T>(value: T): Schema<T, T> => {
    return buildSchema<T, T>([createLiteralStep(value)]);
  },
  enum: <T extends readonly any[]>(values: T): Schema<T[number], T[number]> => {
    return buildSchema<T[number], T[number]>([enumStep(values)]);
  },
  void: buildSchema<void, void>([type("undefined")]),
});

export namespace s {
  export type infer<T extends Schema<any, any>> = T["_output"];
}
