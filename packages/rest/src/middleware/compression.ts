import { StepHandler } from "@tsmk/kernel";
import { HttpContext } from "@tsmk/server";
import { promisify } from "util";
import { gzip } from "zlib";

const gzipAsync = promisify(gzip);

export function compression(): StepHandler<HttpContext> {
  return async (ctx) => {
    const acceptEncoding = ctx.req.headers["accept-encoding"] || "";
    if (!acceptEncoding.includes("gzip")) {
      return;
    }

    const body = ctx.response.body;
    if (!body) {
      return;
    }

    const bodyBuffer =
      typeof body === "string"
        ? Buffer.from(body)
        : Buffer.isBuffer(body)
        ? body
        : Buffer.from(JSON.stringify(body));

    const compressedBody = await gzipAsync(bodyBuffer);

    ctx.response.headers = {
      ...ctx.response.headers,
      "Content-Encoding": "gzip",
      "Content-Length": String(compressedBody.length),
    };
    ctx.response.body = compressedBody;
  };
}
