import {
  AsyncComponentFactory,
  LoggerPlugins,
  StepHandler,
  VNode,
  Orchestrator,
} from "@tsmk/kernel";
import { HttpContext } from "@tsmk/http";
import { Schema, validate } from "@tsmk/schema";
import { Route } from "@tsmk/router";

type BaseContext = HttpContext;
type Handler<TContext extends BaseContext> = (ctx: TContext) => any;

interface RouteBuilder<TContext extends BaseContext> {
  body(schema: Schema<any, any>): RouteBuilder<TContext>;
  query(schema: Schema<any, any>): RouteBuilder<TContext>;
  params(schema: Schema<any, any>): RouteBuilder<TContext>;
  handler(handler: Handler<TContext>): void;
}

class RestBuilder<TContext extends BaseContext> {
  private routes: VNode[] = [];
  private logger?: LoggerPlugins;

  constructor(logger?: LoggerPlugins) {
    this.logger = logger;
  }

  private addRoute(
    method: string,
    path: string,
    builderCallback: (builder: RouteBuilder<TContext>) => void
  ) {
    const pipeline: StepHandler<TContext>[] = [];
    let routeHandler: Handler<TContext> = () => {};

    const routeBuilder: RouteBuilder<TContext> = {
      body: (schema) => {
        pipeline.push(async (ctx) => {
          const result = await validate(schema, (ctx as any).body);
          if (!result.success) {
            ctx.res.statusCode = 400;
            ctx.res.setHeader("Content-Type", "application/json");
            ctx.res.end(
              JSON.stringify({
                error: "Body validation failed",
                details: result.error,
              })
            );
            return;
          }
          (ctx as any).body = result.data;
        });
        return routeBuilder;
      },
      query: (schema) => {
        pipeline.push(async (ctx) => {
          const result = await validate(schema, (ctx as any).query);
          if (!result.success) {
            ctx.res.statusCode = 400;
            ctx.res.setHeader("Content-Type", "application/json");
            ctx.res.end(
              JSON.stringify({
                error: "Query validation failed",
                details: result.error,
              })
            );
            return;
          }
          (ctx as any).query = result.data;
        });
        return routeBuilder;
      },
      params: (schema) => {
        pipeline.push(async (ctx) => {
          const result = await validate(schema, (ctx as any).params);
          if (!result.success) {
            ctx.res.statusCode = 400;
            ctx.res.setHeader("Content-Type", "application/json");
            ctx.res.end(
              JSON.stringify({
                error: "Params validation failed",
                details: result.error,
              })
            );
            return;
          }
          (ctx as any).params = result.data;
        });
        return routeBuilder;
      },
      handler: (handler) => {
        routeHandler = handler;
      },
    };

    builderCallback(routeBuilder);

    const component: AsyncComponentFactory<TContext> = async (ctx) => {
      if (ctx.req.method !== method) {
        return { factory: "div", props: { children: ["Method Not Allowed"] } };
      }

      for (const step of pipeline) {
        await step(ctx);
        if (ctx.res.writableEnded) {
          return { factory: "div", props: {} };
        }
      }

      const result = await routeHandler(ctx);

      if (!ctx.res.writableEnded) {
        ctx.res.statusCode = 200;
        ctx.res.setHeader("Content-Type", "application/json");
        ctx.res.end(JSON.stringify(result));
      }
      return { factory: "div", props: {} };
    };

    this.routes.push({
      factory: Route,
      props: {
        path,
        handler: component,
      },
    });

    return this;
  }

  post(
    path: string,
    builderCallback: (builder: RouteBuilder<TContext>) => void
  ) {
    return this.addRoute("POST", path, builderCallback);
  }

  get(
    path: string,
    builderCallback: (builder: RouteBuilder<TContext>) => void
  ) {
    return this.addRoute("GET", path, builderCallback);
  }

  // ... other HTTP methods ...

  build(): VNode[] {
    return this.routes;
  }
}

export function rest<TContext extends BaseContext>(opts?: {
  logger?: LoggerPlugins;
}) {
  return new RestBuilder<TContext>(opts?.logger);
}
