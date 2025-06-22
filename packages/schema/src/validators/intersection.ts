import { BREAK } from "@tsmk/kernel";
import { ValidationStep, ValidationPipelineContext, Schema } from "..";
import { validate } from "../s";

export function intersection(
  left: Schema<any, any>,
  right: Schema<any, any>
): ValidationStep {
  return async (ctx: ValidationPipelineContext) => {
    // Both schemas must pass validation.
    const leftResult = await validate(left, ctx.value);
    const rightResult = await validate(right, ctx.value);

    if (!leftResult.success || !rightResult.success) {
      if (!leftResult.success) {
        ctx.issues.push(...leftResult.error);
      }
      if (!rightResult.success) {
        ctx.issues.push(...rightResult.error);
      }
      return BREAK;
    }

    // For object intersections, merge the outputs.
    // This is the most common use case.
    const leftData = leftResult.data;
    const rightData = rightResult.data;

    if (
      typeof leftData === "object" &&
      leftData !== null &&
      typeof rightData === "object" &&
      rightData !== null
    ) {
      ctx.output = { ...leftData, ...rightData };
    } else {
      // For non-object intersections, Zod's behavior is to take the right-hand side's value.
      // Let's replicate that.
      ctx.output = rightData;
    }
  };
}
