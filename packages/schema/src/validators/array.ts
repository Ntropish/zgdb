import { Orchestrator, BREAK } from "@tsmk/kernel";
import { ValidationStep, ValidationPipelineContext } from "..";

/**
 * A factory for an array validation step.
 * @param elementSteps The validation steps for each element in the array.
 * @returns A single, complex validation step for the entire array.
 */
export function array(elementSteps: ValidationStep[]): ValidationStep {
  return async (ctx: ValidationPipelineContext) => {
    // First, check if the value is an array.
    if (!Array.isArray(ctx.value)) {
      ctx.issues.push({
        path: ctx.path,
        message: `Expected array, received ${typeof ctx.value}`,
      });
      return BREAK;
    }

    const input = ctx.value;
    const output: any[] = [];
    let hasIssues = false;
    const elementOrchestrator = Orchestrator.create(elementSteps);

    // Use Promise.all to run validations concurrently.
    await Promise.all(
      input.map(async (element, index) => {
        const subCtx: ValidationPipelineContext = {
          ...ctx,
          value: element,
          issues: [],
          path: [...ctx.path, index],
          output: element,
        };

        await elementOrchestrator.run(subCtx);

        if (subCtx.issues.length > 0) {
          hasIssues = true;
          for (const issue of subCtx.issues) {
            ctx.issues.push(issue);
          }
        } else {
          // Store validated output in a temporary array to preserve order.
          output[index] = subCtx.output;
        }
      })
    );

    if (!hasIssues) {
      ctx.output = output;
    }

    return;
  };
}
