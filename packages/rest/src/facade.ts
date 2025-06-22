import { Orchestrator, LoggerPlugins, StepHandler, BREAK } from "@tsmk/kernel";
import { HttpContext } from "@tsmk/server";
import { Schema } from "@tsmk/schema";
import { createRouter, RouteContext } from "@tsmk/router";
import { createValidateStep, createResponseStep } from "./low-level";

type BaseContext = HttpContext & RouteContext;
type Handler<TContext extends BaseContext> = StepHandler<TContext>;

type RouterConfigurator<TContext extends BaseContext> = (
  router: ReturnType<typeof createRouter<TContext>>
) => void;

interface Route<TContext extends BaseContext> {
  method: string;
  path: string;
  pipeline: Handler<TContext>[];
}

interface RouteBuilder<TContext extends BaseContext> {
  body(schema: Schema<any, any>): RouteBuilder<TContext>;
  query(schema: Schema<any, any>): RouteBuilder<TContext>;
  params(schema: Schema<any, any>): RouteBuilder<TContext>;
  handler(handler: (ctx: TContext) => any): void;
}

class RestBuilder<TContext extends BaseContext> {
  private routes: Route<TContext>[] = [];
  private logger?: LoggerPlugins;

  constructor(logger?: LoggerPlugins) {
    this.logger = logger;
  }

  private addRoute(
    method: string,
    path: string,
    builderCallback: (builder: RouteBuilder<TContext>) => void
  ) {
    const route: Route<TContext> = {
      method,
      path,
      pipeline: [],
    };
    this.routes.push(route);

    const routeBuilder: RouteBuilder<TContext> = {
      body: (schema: Schema<any, any>) => {
        route.pipeline.push(
          createValidateStep(
            schema,
            (ctx: TContext) => (ctx as any).body,
            this.logger
          )
        );
        return routeBuilder;
      },
      query: (schema: Schema<any, any>) => {
        route.pipeline.push(
          createValidateStep(
            schema,
            (ctx: TContext) => (ctx as any).query,
            this.logger
          )
        );
        return routeBuilder;
      },
      params: (schema: Schema<any, any>) => {
        route.pipeline.push(
          createValidateStep(
            schema,
            (ctx: TContext) => (ctx as any).params,
            this.logger
          )
        );
        return routeBuilder;
      },
      handler: (handler: (ctx: TContext) => any) => {
        route.pipeline.push(async (ctx: TContext) => {
          (ctx as any).handlerResult = await handler(ctx);
        });
      },
    };
    builderCallback(routeBuilder);
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

  build(): RouterConfigurator<TContext> {
    return (router: ReturnType<typeof createRouter<TContext>>) => {
      for (const route of this.routes) {
        const methodCheck: Handler<TContext> = (ctx) => {
          if (ctx.req.method !== route.method) return BREAK;
        };

        const pipeline: StepHandler<TContext>[] = [
          methodCheck,
          ...route.pipeline,
          createResponseStep(this.logger),
        ];

        router.all(route.path, pipeline);
      }
    };
  }
}

export function rest<TContext extends BaseContext>(opts?: {
  logger?: LoggerPlugins;
}) {
  return new RestBuilder<TContext>(opts?.logger);
}
