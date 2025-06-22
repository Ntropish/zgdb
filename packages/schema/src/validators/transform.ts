import { ValidationStep, ValidationPipelineContext } from "..";

export function transform<T>(transformFn: (value: any) => T): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    ctx.output = transformFn(ctx.output);
  };
}
