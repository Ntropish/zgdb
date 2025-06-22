import { Orchestrator, BREAK } from "@tsmk/kernel";
import { ValidationStep, ValidationPipelineContext } from "..";

/**
 * A factory for an object validation step. The facade provides the resolved
 * steps for each field in the shape.
 * @param shape A record where keys are field names and values are the validation steps for that field.
 * @returns A single, complex validation step for the entire object.
 */
export function object(
  shape: Record<string, ValidationStep[]>
): ValidationStep {
  return async (ctx: ValidationPipelineContext) => {
    // First, check if the value is a non-array object.
    if (
      typeof ctx.value !== "object" ||
      ctx.value === null ||
      Array.isArray(ctx.value)
    ) {
      ctx.issues.push({
        path: ctx.path,
        message: `Expected object, received ${
          ctx.value === null ? "null" : typeof ctx.value
        }`,
      });
      return BREAK;
    }

    const input = ctx.value as Record<string, any>;
    const output: Record<string, any> = {};
    let hasIssues = false;

    // Use Promise.all to run validations concurrently for performance.
    await Promise.all(
      Object.keys(shape).map(async (key) => {
        const fieldSteps = shape[key];
        const fieldOrchestrator = Orchestrator.create(fieldSteps);

        const subCtx: ValidationPipelineContext = {
          ...ctx,
          value: input?.[key],
          issues: [],
          path: [...ctx.path, key],
          output: input?.[key],
        };

        await fieldOrchestrator.run(subCtx);

        if (subCtx.issues.length > 0) {
          hasIssues = true;
          // Add path to issues and push to main context
          for (const issue of subCtx.issues) {
            ctx.issues.push(issue);
          }
        } else {
          output[key] = subCtx.output;
        }
      })
    );

    // After all fields have been validated...
    if (!hasIssues) {
      ctx.output = output;
    }

    // We don't BREAK if there are issues, because we want to collect
    // all errors from all fields in a single pass.
    return;
  };
}
