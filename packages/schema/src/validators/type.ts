import { ValidationStep, ValidationPipelineContext } from "..";
import { BREAK } from "@tsmk/kernel";

export function type(
  expectedType:
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "undefined"
    | "bigint"
): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output !== expectedType) {
      ctx.issues.push({
        path: ctx.path,
        message: `Expected ${expectedType}, received ${typeof ctx.output}`,
      });
      return BREAK;
    }
  };
}
