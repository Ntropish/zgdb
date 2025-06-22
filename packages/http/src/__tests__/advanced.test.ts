import * as http from "http";
import request from "supertest";
import { createHttpServer, HttpContext } from "../http";
import { s, validate, Schema } from "@tsmk/schema";
import { VNode, AsyncComponentFactory, ComponentFactory } from "@tsmk/kernel";
import { Route } from "@tsmk/router";

describe("Advanced HTTP Scenarios", () => {
  let server: http.Server;

  afterEach((done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  test("Scenario: Multi-step validation and processing pipeline", async () => {
    const AuthHeaderSchema = s(s.string, s.startsWith("Bearer "));
    const OrderIdParamSchema = s.object({
      orderId: s(s.string, s.cuid2),
    });
    const OrderItemSchema = s.object({
      productId: s(s.string, s.cuid),
      quantity: s(s.number, s.int, s.positive),
      price: s(s.number, s.positive),
    });
    const BodySchema = s.object({
      orderItems: s(s.array(OrderItemSchema), s.minLength(1)),
    });

    const handler: AsyncComponentFactory<HttpContext> = async (
      ctx: HttpContext
    ) => {
      // 1. Auth Check
      const authHeader = ctx.req.headers.authorization;
      const authResult = await validate(AuthHeaderSchema, authHeader);
      if (!authResult.success) {
        ctx.res.statusCode = 401;
        ctx.res.end("Unauthorized");
        return { factory: "auth-failed", props: {} };
      }

      // 2. Params Validation
      const paramsResult = await validate(OrderIdParamSchema, ctx.params);
      if (!paramsResult.success) {
        ctx.res.statusCode = 400;
        ctx.res.setHeader("Content-Type", "application/json");
        ctx.res.end(
          JSON.stringify({
            error: "Validation failed for params",
            details: paramsResult.error,
          })
        );
        return { factory: "params-validation-failed", props: {} };
      }
      ctx.params = paramsResult.data;

      // 3. Body Validation
      const bodyResult = await validate(BodySchema, ctx.body);
      if (!bodyResult.success) {
        ctx.res.statusCode = 400;
        ctx.res.setHeader("Content-Type", "application/json");
        ctx.res.end(
          JSON.stringify({
            error: "Validation failed for body",
            details: bodyResult.error,
          })
        );
        return { factory: "body-validation-failed", props: {} };
      }
      ctx.body = bodyResult.data;

      // 4. Process Order
      ctx.res.statusCode = 200;
      ctx.res.setHeader("Content-Type", "application/json");
      const responseBody = {
        message: "Order updated successfully",
        orderId: ctx.params.orderId,
        itemsAdded: (ctx.body.orderItems as any[]).length,
      };
      ctx.res.end(JSON.stringify(responseBody));
      return { factory: "order-processed", props: {} };
    };

    const app: VNode = {
      factory: Route,
      props: {
        path: "/api/orders/:orderId/items",
        component: handler,
      },
    };

    server = await createHttpServer(app);

    const validCuid = "ch72gsb320000udocl363eofy";
    const validCuid2 = "tz4a98xxat96iws9zmbrgj3a";

    const response1 = await request(server)
      .post(`/api/orders/${validCuid2}/items`)
      .set("Authorization", "Bearer valid-token")
      .send({
        orderItems: [{ productId: validCuid, quantity: 2, price: 99.99 }],
      });
    expect(response1.status).toBe(200);
    expect(response1.body).toEqual({
      message: "Order updated successfully",
      orderId: validCuid2,
      itemsAdded: 1,
    });

    const response2 = await request(server)
      .post(`/api/orders/${validCuid2}/items`)
      .send({
        orderItems: [{ productId: validCuid, quantity: 1, price: 10 }],
      });
    expect(response2.status).toBe(401);

    const response3 = await request(server)
      .post(`/api/orders/not-a-cuid/items`)
      .set("Authorization", "Bearer valid-token")
      .send({
        orderItems: [{ productId: validCuid, quantity: 1, price: 10 }],
      });
    expect(response3.status).toBe(400);
    expect(response3.body.error).toContain("params");

    const response4 = await request(server)
      .post(`/api/orders/${validCuid2}/items`)
      .set("Authorization", "Bearer valid-token")
      .send({
        orderItems: [{ productId: "not-a-cuid", quantity: 1, price: 10 }],
      });
    expect(response4.status).toBe(400);
    expect(response4.body.error).toContain("body");
  });

  test("Scenario: Composed routes with error boundary", async () => {
    const publicHome: ComponentFactory<HttpContext> = (ctx: HttpContext) => {
      ctx.res.statusCode = 200;
      ctx.res.setHeader("Content-Type", "application/json");
      ctx.res.end(JSON.stringify({ message: "Welcome to the public home!" }));
      return { factory: "public-home", props: {} };
    };

    const adminDashboard: ComponentFactory<HttpContext> = () => {
      throw new Error("DB Connection Failed!");
    };

    const app: VNode = {
      factory: "div",
      props: {
        children: [
          {
            factory: Route,
            props: { path: "/public/home", component: publicHome },
          },
          {
            factory: Route,
            props: { path: "/admin/dashboard", component: adminDashboard },
          },
        ],
      },
    };

    server = await createHttpServer(app);

    const res1 = await request(server).get("/public/home");
    expect(res1.status).toBe(200);
    expect(res1.body).toEqual({ message: "Welcome to the public home!" });

    const res2 = await request(server).get("/admin/dashboard");
    expect(res2.status).toBe(500);
    expect(res2.text).toEqual("Internal Server Error");

    const res3 = await request(server).get("/non-existent");
    expect(res3.status).toBe(404);
  });
});
