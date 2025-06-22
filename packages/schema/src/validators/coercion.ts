import { ValidationStep, ValidationPipelineContext } from "..";

/**
 * A validation step that attempts to coerce the input value to a string.
 * This step does not fail; it simply updates the `output` property on the
 * context for subsequent steps to validate.
 */
export const coerceString: ValidationStep = (
  ctx: ValidationPipelineContext
) => {
  if (ctx.value !== null && ctx.value !== undefined) {
    ctx.output = String(ctx.value);
  }
};

/**
 * A validation step that attempts to coerce the input value to a number.
 */
export const coerceNumber: ValidationStep = (
  ctx: ValidationPipelineContext
) => {
  if (typeof ctx.value === "string" && ctx.value.trim() !== "") {
    const num = Number(ctx.value);
    if (!isNaN(num)) {
      ctx.output = num;
    }
  } else if (typeof ctx.value === "boolean") {
    ctx.output = ctx.value ? 1 : 0;
  }
};

/**
 * A validation step that attempts to coerce the input value to a boolean.
 */
export const coerceBoolean: ValidationStep = (
  ctx: ValidationPipelineContext
) => {
  if (typeof ctx.value === "string") {
    if (ctx.value.toLowerCase() === "true") {
      ctx.output = true;
    } else if (ctx.value.toLowerCase() === "false") {
      ctx.output = false;
    }
  } else if (typeof ctx.value === "number") {
    ctx.output = ctx.value !== 0;
  }
};

/**
 * A validation step that attempts to coerce the input value to a BigInt.
 */
export const coerceBigInt: ValidationStep = (
  ctx: ValidationPipelineContext
) => {
  try {
    if (
      typeof ctx.value === "string" ||
      typeof ctx.value === "number" ||
      typeof ctx.value === "boolean"
    ) {
      ctx.output = BigInt(ctx.value);
    }
  } catch {
    // If BigInt constructor fails, do nothing. The subsequent type check
    // will catch the issue.
  }
};
