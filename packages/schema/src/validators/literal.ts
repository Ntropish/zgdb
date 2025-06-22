import { BREAK } from "@tsmk/kernel";
import { ValidationStep, ValidationPipelineContext } from "..";
import { deepEqual } from "../utils";

export function literal(expectedValue: any): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (!deepEqual(ctx.output, expectedValue)) {
      ctx.issues.push({
        path: ctx.path,
        message: `Expected literal value ${JSON.stringify(
          expectedValue
        )}, but received ${JSON.stringify(ctx.output)}`,
      });
      return BREAK;
    }
  };
}
