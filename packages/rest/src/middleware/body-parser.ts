import { StepHandler } from "@tsmk/kernel";
import { HttpContext } from "@tsmk/server";
import { parse } from "querystring";

export interface RequestWithBody extends HttpContext {
  body?: any;
}

function getBody(ctx: HttpContext): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    ctx.req.on("data", (chunk) => (body += chunk));
    ctx.req.on("end", () => resolve(body));
    ctx.req.on("error", (err) => reject(err));
  });
}

export function bodyParser(): StepHandler<RequestWithBody> {
  return async (ctx) => {
    const contentType = ctx.req.headers["content-type"];
    if (!contentType) {
      return;
    }

    const body = await getBody(ctx);
    if (!body) {
      return;
    }

    if (contentType.includes("application/json")) {
      try {
        ctx.body = JSON.parse(body);
      } catch (e) {
        // Handle JSON parsing error
        ctx.response.statusCode = 400;
        ctx.response.body = { error: "Invalid JSON" };
        return;
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      ctx.body = parse(body);
    }
  };
}
