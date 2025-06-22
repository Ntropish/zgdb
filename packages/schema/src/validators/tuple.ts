import { Orchestrator, BREAK } from "@tsmk/kernel";
import {
  ValidationStep,
  ValidationPipelineContext,
  Schema,
  ValidationIssue,
} from "..";
import { validate } from "../s";

export function tuple(schemas: readonly Schema<any, any>[]): ValidationStep {
  return async (ctx: ValidationPipelineContext) => {
    if (!Array.isArray(ctx.value)) {
      ctx.issues.push({
        path: ctx.path,
        message: `Expected an array, received ${typeof ctx.value}`,
      });
      return BREAK;
    }

    const value: unknown[] = ctx.value;

    if (value.length !== schemas.length) {
      ctx.issues.push({
        path: ctx.path,
        message: `Expected a tuple of length ${schemas.length}, but received ${value.length}`,
      });
      return BREAK;
    }

    const output: any[] = [];
    const issues: ValidationIssue[] = [];
    let hasIssues = false;

    for (let i = 0; i < schemas.length; i++) {
      const schema = schemas[i];
      const result = await validate(schema, value[i]);

      if (!result.success) {
        hasIssues = true;
        issues.push(
          ...result.error.map((issue) => ({
            ...issue,
            path: [i, ...(issue.path || [])],
          }))
        );
      }
      output[i] = result.success ? result.data : undefined;
    }

    if (hasIssues) {
      ctx.issues.push(...issues);
      return BREAK;
    }

    ctx.output = output;
  };
}
