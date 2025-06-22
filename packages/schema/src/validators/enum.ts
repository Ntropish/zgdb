import { BREAK } from "@tsmk/kernel";
import { ValidationStep, ValidationPipelineContext } from "..";
import { deepEqual } from "../utils";

type EnumValues = readonly any[];

export function enumStep(expectedValues: EnumValues): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    const found = expectedValues.some((val) => deepEqual(ctx.output, val));
    if (!found) {
      ctx.issues.push({
        path: ctx.path,
        message: `Expected one of [${expectedValues
          .map((v) => JSON.stringify(v))
          .join(", ")}], but received ${JSON.stringify(ctx.output)}`,
      });
      return BREAK;
    }
  };
}
