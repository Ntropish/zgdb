import { ValidationStep, ValidationPipelineContext } from "..";
import { Orchestrator } from "@tsmk/kernel";

export function union(schemas: ValidationStep[][]): ValidationStep {
  return async (ctx: ValidationPipelineContext) => {
    const originalValue = ctx.value;
    const allIssues: any[] = [];

    for (const steps of schemas) {
      const orchestrator = Orchestrator.create(steps);
      const subCtx: ValidationPipelineContext = {
        value: originalValue,
        issues: [],
        path: ctx.path,
        output: originalValue,
      };

      await orchestrator.run(subCtx);

      if (subCtx.issues.length === 0) {
        // A schema passed. The union is valid.
        ctx.output = subCtx.output;
        return; // Success, exit the union step.
      } else {
        // A schema failed, collect the issues.
        allIssues.push(...subCtx.issues);
      }
    }

    // If we get here, all schemas failed.
    ctx.issues.push({
      path: ctx.path,
      message: "Input did not match any of the union schemas.",
    });
    // For detailed debugging, we could add all issues, but it might be too verbose.
    // For now, let's keep the primary error message clean.
    ctx.issues.push(...allIssues);
  };
}
