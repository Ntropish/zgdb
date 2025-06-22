import { Orchestrator, BREAK } from "@tsmk/kernel";
import { ValidationStep, ValidationPipelineContext } from "..";

export function min(min: number): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "number") {
      if (ctx.output < min) {
        ctx.issues.push({
          path: ctx.path,
          message: `Number must be at least ${min}.`,
        });
        return BREAK;
      }
    }
  };
}

export function max(max: number): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "number") {
      if (ctx.output > max) {
        ctx.issues.push({
          path: ctx.path,
          message: `Number must be at most ${max}.`,
        });
        return BREAK;
      }
    }
  };
}

export function positive(): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "number") {
      if (ctx.output <= 0) {
        ctx.issues.push({
          path: ctx.path,
          message: `Number must be positive.`,
        });
        return BREAK;
      }
    }
  };
}

export function negative(): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "number") {
      if (ctx.output >= 0) {
        ctx.issues.push({
          path: ctx.path,
          message: `Number must be less than 0.`,
        });
        return BREAK;
      }
    }
  };
}

export function gt(value: number): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "number") {
      if (ctx.output <= value) {
        ctx.issues.push({
          path: ctx.path,
          message: `Number must be greater than ${value}.`,
        });
        return BREAK;
      }
    }
  };
}

export function lt(value: number): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "number") {
      if (ctx.output >= value) {
        ctx.issues.push({
          path: ctx.path,
          message: `Number must be less than ${value}.`,
        });
        return BREAK;
      }
    }
  };
}

export function int(): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "number") {
      if (!Number.isInteger(ctx.output)) {
        ctx.issues.push({
          path: ctx.path,
          message: `Number must be an integer.`,
        });
        return BREAK;
      }
    }
  };
}

export function multipleOf(value: number): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "number") {
      if (ctx.output % value !== 0) {
        ctx.issues.push({
          path: ctx.path,
          message: `Number must be a multiple of ${value}.`,
        });
        return BREAK;
      }
    }
  };
}
