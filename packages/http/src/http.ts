import * as nodeHttp from "http";
import { Orchestrator, LoggerPlugins } from "@tsmk/kernel";
import { createRouter, RouteContext } from "@tsmk/router";
import { URL } from "url";

export type HttpContext = RouteContext & {
  req: nodeHttp.IncomingMessage;
  res: nodeHttp.ServerResponse;
  query: URLSearchParams;
  body?: any;
};

type RouterConfigurator = (
  router: ReturnType<typeof createRouter<HttpContext>>
) => void;

export function createHttpServer(
  configure: RouterConfigurator,
  logger?: LoggerPlugins
): nodeHttp.Server {
  const router = createRouter<HttpContext>({ logger });
  configure(router);
  const kernel = router.kernel();

  const server = nodeHttp.createServer(async (req, res) => {
    const startTime = process.hrtime();
    if (logger?.info) {
      await Orchestrator.create(logger.info).run({
        message: "Incoming request",
        data: {
          http: {
            method: req.method,
            url: req.url,
            headers: req.headers,
          },
          network: {
            remoteAddress: req.socket.remoteAddress,
          },
        },
      });
    }

    const url = new URL(req.url!, `http://${req.headers.host}`);

    const context: HttpContext = {
      req,
      res,
      path: url.pathname,
      method: req.method?.toUpperCase(),
      params: {},
      query: url.searchParams,
      matched: false,
    };

    if (["POST", "PUT", "PATCH"].includes(req.method ?? "")) {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const data = Buffer.concat(buffers).toString();
      if (req.headers["content-type"] === "application/json" && data) {
        try {
          context.body = JSON.parse(data);
        } catch {
          // Keep body as string if JSON parsing fails
          context.body = data;
        }
      } else {
        context.body = data;
      }
    }

    try {
      await kernel.run(context);
    } catch (err) {
      console.error("Unhandled error during kernel execution:", err);
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain");
        res.end("Internal Server Error");
      }
    }

    if (!context.matched) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain");
      res.end("Not Found");
    }

    const duration = process.hrtime(startTime);
    const durationMs = duration[0] * 1000 + duration[1] / 1e6;
    if (logger?.info) {
      await Orchestrator.create(logger.info).run({
        message: "Request completed",
        data: {
          http: {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
          },
          duration: {
            ms: durationMs,
          },
        },
      });
    }
  });

  server.on("error", (err) => {
    console.error("HTTP Server Error:", err);
  });

  return server;
}
