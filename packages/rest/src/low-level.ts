import { BREAK, StepHandler, LoggerPlugins } from "@tsmk/kernel";
import { HttpContext } from "@tsmk/server";
import { Schema, validate } from "@tsmk/schema";

/**
 * A low-level factory for creating a validation step for any part of the context.
 * @param schema The @tsmk/schema to validate against.
 * @param getTarget A function to extract the data to be validated from the context.
 * @param logger An optional LoggerPlugins object for logging.
 * @param onFail An optional step to run if validation fails. Defaults to sending a 400 response.
 */
export function createValidateStep<TContext extends HttpContext, T>(
  schema: Schema<any, any>,
  getTarget: (ctx: TContext) => T,
  logger?: LoggerPlugins,
  onFail?: StepHandler<TContext>
): StepHandler<TContext> {
  const defaultOnFail = async (ctx: TContext, errors: any) => {
    ctx.response.statusCode = 400;
    if (!ctx.response.headers) ctx.response.headers = {};
    ctx.response.headers["Content-Type"] = "text/plain";
    ctx.response.body = "Bad Request";
  };

  return async (ctx) => {
    const target = getTarget(ctx);
    const result = await validate(schema, target);
    if (!result.success) {
      logger?.warn?.forEach((log) =>
        log({
          message: "Validation failed",
          data: { error: result.error, target: "hidden" },
        })
      );
      try {
        if (onFail) {
          await onFail(ctx);
        } else {
          await defaultOnFail(ctx, result.error);
        }
      } catch (e) {
        console.error("Error in onFail handler:", e);
        // Ensure a response is sent even if the error handler fails.
        if (ctx.response.statusCode === undefined) {
          ctx.response.statusCode = 500;
          if (!ctx.response.headers) ctx.response.headers = {};
          ctx.response.headers["Content-Type"] = "text/plain";
          ctx.response.body = "Internal Server Error";
        }
      }
      return BREAK;
    }
    // Mutate context with validated data.
    // This assumes getTarget returns a reference that can be modified,
    // which is not ideal. A better implementation might use lenses or immer.
    // For now, we'll rely on convention (e.g., getTarget returns ctx.body).
    const validatedData = result.data;
    if (typeof target === "object" && target !== null) {
      Object.assign(target, validatedData);
    } else {
      // This part is tricky. If the target is not an object, how do we
      // reliably place the validated data back into the context?
      // The high-level API will need to solve this cleanly.
      // For now, let's just assign it to a temporary property.
      (ctx as any).validatedData = validatedData;
    }
  };
}

/**
 * A low-level factory for a step that sends the final HTTP response.
 * It serializes objects to JSON and other types to plain text.
 */
export function createResponseStep<TContext extends HttpContext>(
  logger?: LoggerPlugins
): StepHandler<TContext> {
  return (ctx: TContext) => {
    if (ctx.response.body) {
      logger?.info?.forEach((log) =>
        log({ message: "Response body already set, skipping." })
      );
      return;
    }
    const body = (ctx as any).handlerResult ?? (ctx as any).body;
    if (typeof body === "object" && body !== null) {
      if (!ctx.response.headers) ctx.response.headers = {};
      ctx.response.headers["Content-Type"] = "application/json";
      ctx.response.body = body;
    } else if (typeof body !== "undefined") {
      if (!ctx.response.headers) ctx.response.headers = {};
      ctx.response.headers["Content-Type"] = "text/plain";
      ctx.response.body = String(body);
    } else {
      ctx.response.statusCode = 204;
    }
    logger?.info?.forEach((log) =>
      log({
        message: "Response prepared",
        data: {
          statusCode: ctx.response.statusCode,
          contentType: ctx.response.headers?.["Content-Type"],
        },
      })
    );
  };
}
