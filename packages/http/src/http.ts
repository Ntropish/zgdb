import * as nodeHttp from "http";
import { LoggerPlugins, VNode } from "@tsmk/kernel";
import { createRouter } from "@tsmk/router";
import { URL } from "url";

export type HttpContext = {
  req: nodeHttp.IncomingMessage;
  res: nodeHttp.ServerResponse;
  query: URLSearchParams;
  params: Record<string, string>;
  body?: any;
};

export async function createHttpServer(
  vnodes: VNode | VNode[],
  logger?: LoggerPlugins
): Promise<nodeHttp.Server> {
  const router = await createRouter(vnodes);

  const server = nodeHttp.createServer(async (req, res) => {
    const startTime = process.hrtime();

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const match = router.handle(url.pathname);

    if (match) {
      const context: HttpContext = {
        req,
        res,
        params: match.params,
        query: url.searchParams,
      };

      if (["POST", "PUT", "PATCH"].includes(req.method ?? "")) {
        const buffers = [];
        for await (const chunk of req) buffers.push(chunk);
        const data = Buffer.concat(buffers).toString();
        if (req.headers["content-type"] === "application/json" && data) {
          try {
            context.body = JSON.parse(data);
          } catch {
            context.body = data;
          }
        } else {
          context.body = data;
        }
      }

      try {
        const resultVNode = await match.handler(context);

        if (!res.writableEnded) {
          if (resultVNode.props?.body) {
            res.statusCode = (resultVNode.props.statusCode as number) || 200;
            const body = resultVNode.props.body;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(body));
          } else if (!res.headersSent) {
            res.statusCode = 204; // No Content
            res.end();
          }
        }
      } catch (err) {
        console.error("Unhandled error during handler execution:", err);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain");
          res.end("Internal Server Error");
        }
      }
    } else {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain");
      res.end("Not Found");
    }

    const duration = process.hrtime(startTime);
    const durationMs = duration[0] * 1000 + duration[1] / 1e6;
  });

  server.on("error", (err) => {
    console.error("HTTP Server Error:", err);
  });

  return server;
}
