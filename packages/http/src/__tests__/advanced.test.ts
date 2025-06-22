import * as http from "http";
import request from "supertest";
import { createHttpServer, HttpContext } from "../http";
import { s, validate, Schema } from "@tsmk/schema";
import { StepHandler, BREAK } from "@tsmk/kernel";
import { createRouter } from "@tsmk/router";

const createValidationStep = <T>(
  schema: Schema<any, any>,
  getTarget: (ctx: HttpContext) => T,
  propName: "body" | "params" | "query" = "body"
): StepHandler<HttpContext> => {
  return async (ctx) => {
    const target = getTarget(ctx);
    const result = await validate(schema, target);
    if (!result.success) {
      ctx.res.statusCode = 400;
      ctx.res.setHeader("Content-Type", "application/json");
      ctx.res.end(
        JSON.stringify({
          error: `Validation failed for ${propName}`,
          details: result.error,
        })
      );
      return BREAK;
    }
    // Mutate context with validated data
    ctx[propName] = result.data;
  };
};

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
    // Schemas for our rigid validation
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

    // -- Middleware-like Pipeline Steps --
    const checkAuth: StepHandler<HttpContext> = async (ctx) => {
      const authHeader = ctx.req.headers.authorization;
      const result = await validate(AuthHeaderSchema, authHeader);
      if (!result.success) {
        ctx.res.statusCode = 401;
        ctx.res.end("Unauthorized");
        return BREAK;
      }
    };

    const processOrder: StepHandler<HttpContext> = (ctx) => {
      ctx.res.statusCode = 200;
      ctx.body = {
        message: "Order updated successfully",
        orderId: ctx.params.orderId,
        itemsAdded: (ctx.body.orderItems as any[]).length,
      };
    };

    // -- Server Setup --
    server = createHttpServer((router) => {
      router.all("/api/orders/:orderId/items", [
        checkAuth,
        createValidationStep(OrderIdParamSchema, (ctx) => ctx.params, "params"),
        createValidationStep(BodySchema, (ctx) => ctx.body, "body"),
        processOrder,
      ]);
    });

    // -- Test Cases --
    const validCuid = "ch72gsb320000udocl363eofy"; // A real CUID
    const validCuid2 = "tz4a98xxat96iws9zmbrgj3a";

    // Case 1: Happy Path
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

    // Case 2: Missing Auth
    const response2 = await request(server)
      .post(`/api/orders/${validCuid2}/items`)
      .send({
        orderItems: [{ productId: validCuid, quantity: 1, price: 10 }],
      });
    expect(response2.status).toBe(401);

    // Case 3: Invalid orderId
    const response3 = await request(server)
      .post(`/api/orders/not-a-cuid/items`)
      .set("Authorization", "Bearer valid-token")
      .send({
        orderItems: [{ productId: validCuid, quantity: 1, price: 10 }],
      });
    expect(response3.status).toBe(400);
    const json3 = response3.body;
    expect(json3.error).toContain("params");

    // Case 4: Invalid body
    const response4 = await request(server)
      .post(`/api/orders/${validCuid2}/items`)
      .set("Authorization", "Bearer valid-token")
      .send({
        orderItems: [{ productId: "not-a-cuid", quantity: 1, price: 10 }],
      });
    expect(response4.status).toBe(400);
    const json4 = response4.body;
    expect(json4.error).toContain("body");
  });

  test("Scenario: Composed routes with error boundary", async () => {
    server = createHttpServer((router) => {
      router.all("/public/home", [
        (ctx) => {
          ctx.res.statusCode = 200;
          ctx.body = { message: "Welcome to the public home!" };
        },
      ]);
      router.all("/admin/dashboard", [
        () => {
          throw new Error("DB Connection Failed!");
        },
      ]);
    });

    // Case 1: Hit a route in the public router
    const res1 = await request(server).get("/public/home");
    expect(res1.status).toBe(200);
    expect(res1.body).toEqual({ message: "Welcome to the public home!" });

    // Case 2: Hit a route in the admin router that throws
    const res2 = await request(server).get("/admin/dashboard");
    expect(res2.status).toBe(500);
    expect(res2.text).toEqual("Internal Server Error");

    // Case 3: Hit a route that doesn't exist anywhere
    const res3 = await request(server).get("/non-existent");
    expect(res3.status).toBe(404);
  });
});
