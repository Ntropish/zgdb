import { StepHandler } from "@tsmk/kernel";
import { HttpContext } from "@tsmk/server";
import { safeStringify } from "@tsmk/log";

export function jsonSerializer(): StepHandler<HttpContext> {
  return (ctx) => {
    const body = ctx.response.body;

    if (typeof body === "object" && body !== null && !Buffer.isBuffer(body)) {
      const jsonBody = safeStringify(body);
      ctx.response.headers = {
        ...ctx.response.headers,
        "Content-Type": "application/json",
        "Content-Length": String(Buffer.byteLength(jsonBody)),
      };
      ctx.response.body = jsonBody;
    }
  };
}
