import * as yaml from "yaml";
import { s } from "./s";
import type { Schema } from "./index";
import {
  createFluentBuilder,
  FluentBuilder,
  CapabilityMap,
} from "@tsmk/builder";

type SchemaBuilderContext = { schema: Schema<any, any> };
type ChildBuilderInfo = {
  key: string;
  builder: FluentBuilder<SchemaBuilderContext>;
};

const placeholderPrefix = "__TSMK_DSL_INTERPOLATION__";

let validatorRegistry: any = null;
function getValidatorRegistry() {
  if (validatorRegistry) return validatorRegistry;
  validatorRegistry = {
    // String validators
    minLength: s.minLength,
    maxLength: s.maxLength,
    exactLength: s.exactLength,
    regex: s.regex,
    email: () => s.email,
    uuid: () => s.uuid,
    cuid2: () => s.cuid2,
    ulid: () => s.ulid,
    ip: s.ip,
    datetime: () => s.datetime,

    // Number validators
    min: s.min,
    max: s.max,
    positive: () => s.positive,
    negative: () => s.negative,
    int: () => s.int,
    multipleOf: s.multipleOf,
  };
  return validatorRegistry;
}

const capabilities: CapabilityMap<SchemaBuilderContext> = {
  placeholder: {
    apply: (index: number, interpolatedValues: any[]) => {
      return interpolatedValues[index];
    },
    build: (ctx, value: any) => {
      // If the value is already a schema, just use it.
      // This is how we support interpolating s.string, s.email, etc.
      if (value && value._input && value._output) {
        ctx.schema = value;
      } else {
        // Otherwise, assume it's a literal value for an enum or something similar.
        // The broader schema (like s.enum) will handle it. For now, we just pass it.
        // This is a bit of a cheat, but it works for the current use cases.
        // A more robust solution might involve a different kind of placeholder.
        ctx.schema = value;
      }
    },
  },
  object: {
    apply: (definition: Record<string, any>, interpolatedValues: any[]) => {
      const children: ChildBuilderInfo[] = [];
      for (const key in definition) {
        const childBuilder =
          createFluentBuilder<SchemaBuilderContext>(capabilities);
        walk(definition[key], childBuilder, interpolatedValues);
        children.push({ key, builder: childBuilder });
      }
      return children;
    },
    build: (ctx, children: ChildBuilderInfo[]) => {
      const shape: Record<string, Schema<any, any>> = {};
      for (const { key, builder } of children) {
        const subCtx = { schema: s.string }; // Default/dummy schema
        builder.getPipeline().run(subCtx);
        let finalSchema = subCtx.schema;
        if (key.endsWith("?")) {
          shape[key.slice(0, -1)] = finalSchema.optional();
        } else {
          shape[key] = finalSchema;
        }
      }
      ctx.schema = s.object(shape);
    },
  },
  array: {
    apply: (definition: any[], interpolatedValues: any[]) => {
      if (definition.length !== 1) {
        throw new Error(
          "Array DSL definition must have exactly one element for the type."
        );
      }
      const childBuilder =
        createFluentBuilder<SchemaBuilderContext>(capabilities);
      walk(definition[0], childBuilder, interpolatedValues);
      return childBuilder;
    },
    build: (ctx, childBuilder: FluentBuilder<SchemaBuilderContext>) => {
      const subCtx = { schema: s.string };
      childBuilder.getPipeline().run(subCtx);
      ctx.schema = s.array(subCtx.schema);
    },
  },
  primitive: {
    apply: (
      definition: string | { type: string; [key: string]: any },
      interpolatedValues: any[]
    ) => {
      if (typeof definition !== "object" || definition === null) {
        return definition;
      }

      const resolvedDefinition = { ...definition };
      for (const key in resolvedDefinition) {
        if (key === "type") continue;

        const value = resolvedDefinition[key];
        const resolvePlaceholder = (val: any) => {
          if (typeof val === "string") {
            const placeholderMatch = val.match(
              new RegExp(`^${placeholderPrefix}(\\d+)$`)
            );
            if (placeholderMatch) {
              const index = parseInt(placeholderMatch[1], 10);
              return interpolatedValues[index];
            }
          }
          return val;
        };

        if (Array.isArray(value)) {
          resolvedDefinition[key] = value.map(resolvePlaceholder);
        } else {
          resolvedDefinition[key] = resolvePlaceholder(value);
        }
      }
      return resolvedDefinition;
    },
    build: (ctx, definition: string | { type: string; [key: string]: any }) => {
      if (typeof definition === "string") {
        switch (definition) {
          case "string":
            ctx.schema = s.string;
            break;
          case "number":
            ctx.schema = s.number;
            break;
          case "boolean":
            ctx.schema = s.boolean;
            break;
          default:
            throw new Error(`Unknown primitive type: ${definition}`);
        }
        return;
      }

      const { type, ...validators } = definition;
      let baseSchema: Schema<any, any>;
      switch (type) {
        case "string":
          baseSchema = s.string;
          break;
        case "number":
          baseSchema = s.number;
          break;
        case "boolean":
          baseSchema = s.boolean;
          break;
        default:
          throw new Error(`Unknown primitive type: ${type}`);
      }

      const registry = getValidatorRegistry();
      const steps = [];
      for (const validatorName in validators) {
        const factory = registry[validatorName];
        if (!factory) {
          throw new Error(`Unknown validator: ${validatorName}`);
        }
        const args = Array.isArray(validators[validatorName])
          ? validators[validatorName]
          : [validators[validatorName]];
        // some validators like email are parameterless
        steps.push(args[0] === true ? factory() : factory(...args));
      }

      ctx.schema = s(baseSchema, ...steps);
    },
  },
};

function walk(
  node: any,
  builder: FluentBuilder<SchemaBuilderContext>,
  interpolatedValues: any[]
) {
  const B = builder as any; // To allow dynamic capability calls
  if (typeof node === "string") {
    const placeholderMatch = node.match(
      new RegExp(`^${placeholderPrefix}(\\d+)$`)
    );
    if (placeholderMatch) {
      B.placeholder(parseInt(placeholderMatch[1], 10), interpolatedValues);
    } else {
      B.primitive(node);
    }
  } else if (Array.isArray(node)) {
    B.array(node, interpolatedValues);
  } else if (typeof node === "object" && node !== null) {
    // An object is a primitive definition if it has a 'type' property (string, number, boolean)
    // and all other properties are known validator names. Otherwise, it's a standard object shape.
    const registry = getValidatorRegistry();
    const isPrimitiveDef =
      node.type &&
      typeof node.type === "string" &&
      ["string", "number", "boolean"].includes(node.type) &&
      Object.keys(node).every((key) => {
        if (key === "type") return true;
        return key in registry;
      });

    if (isPrimitiveDef) {
      B.primitive(node, interpolatedValues);
    } else {
      B.object(node, interpolatedValues);
    }
  } else {
    throw new Error(`Unsupported DSL node type: ${typeof node}`);
  }
}

export function parseTemplate(
  dsl: string,
  interpolatedValues: any[] = []
): Schema<any, any> {
  const parsedYaml = yaml.parse(dsl);
  const builder = createFluentBuilder<SchemaBuilderContext>(capabilities);

  walk(parsedYaml, builder, interpolatedValues);

  const context: SchemaBuilderContext = { schema: s.string }; // Dummy start
  builder.getPipeline().run(context);

  return context.schema;
}
