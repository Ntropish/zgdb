import { Server, HttpAdapter, HttpContext } from "@tsmk/server";
import {
  ServerDefinition,
  GroupDefinition,
  StepHandler,
  RouteDefinition,
} from "./types";
import { createRouter, RouteContext } from "@tsmk/router";
import { Orchestrator, LoggerPlugins, BREAK } from "@tsmk/kernel";
import { bodyParser, RequestWithBody } from "../middleware/body-parser";
import { compression } from "../middleware/compression";
import { jsonSerializer } from "../middleware/json-serializer";

type FullContext = HttpContext & RouteContext & RequestWithBody;
type RouterInstance = ReturnType<typeof createRouter<FullContext>>;

function createMethodCheck(
  method: RouteDefinition["method"]
): StepHandler<FullContext> {
  return (ctx) => {
    if (ctx.req?.method !== method) {
      return BREAK;
    }
  };
}

function walk(
  def: ServerDefinition | GroupDefinition,
  router: RouterInstance,
  prefix = "",
  parentMiddleware: StepHandler[] = [],
  loggerPlugins?: LoggerPlugins
) {
  const currentMiddleware = [...parentMiddleware, ...(def.middleware || [])];

  for (const item of def.items) {
    const currentPath = `${prefix}${item.path}`;
    if (item.type === "group") {
      walk(item, router, currentPath, currentMiddleware, loggerPlugins);
    } else if (item.type === "route") {
      const methodCheck = createMethodCheck(item.method);
      const handlerChain = [methodCheck, ...currentMiddleware, item.handler];
      router.all(currentPath, handlerChain);
    }
  }
}

export function run(
  def: ServerDefinition,
  options: { port: number; loggerPlugins?: LoggerPlugins }
) {
  // THIS IS A TEST
  const adapter = new HttpAdapter<FullContext>({ port: options.port });
  const server = new Server<FullContext>(adapter, {
    loggerPlugins: options.loggerPlugins,
  });
  const router = createRouter<FullContext>({ logger: options.loggerPlugins });
  walk(def, router, "", [], options.loggerPlugins);
  const routerKernel = router.kernel();

  const rootKernel = Orchestrator.create<FullContext>(
    [
      bodyParser(),
      (ctx) => {
        if (!ctx.req) {
          throw new Error("Request object is missing from context.");
        }
        ctx.path = new URL(
          ctx.req.url!,
          `http://${ctx.req.headers.host}`
        ).pathname;
        ctx.params = {};
      },
      routerKernel.run,
      (ctx) => {
        if (!ctx.response.body && !ctx.matched) {
          ctx.response.statusCode = 404;
          ctx.response.body = `Not Found: ${ctx.req.method} ${ctx.req.url}`;
        }
      },
      jsonSerializer(),
      compression(),
    ],
    options.loggerPlugins
  );

  server.use(rootKernel.run);

  return server.listen();
}
