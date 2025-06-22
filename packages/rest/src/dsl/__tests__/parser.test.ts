import { r } from "../r";
import { StepHandler } from "@tsmk/kernel";

const mockHandler: StepHandler = () => {};
const mockMiddleware: StepHandler = () => {};

const authenticationMiddleware: StepHandler = (ctx) => {
  ctx.user = { id: "user-123", roles: ["user"] };
};

const adminAuthorizationMiddleware: StepHandler = (ctx) => {
  if (!ctx.user?.roles.includes("admin")) {
    throw new Error("Forbidden");
  }
};

describe("r-DSL Parser", () => {
  it("should parse a simple server definition", () => {
    const serverDef = r`
      @use ${mockMiddleware}

      GET /health {
        handler: ${mockHandler}
      }

      group /api/v1 {
        GET /users/$id {
          handler: ${mockHandler}
        }
      }
    `;

    expect(serverDef.middleware).toHaveLength(1);
    expect(serverDef.middleware[0]).toBe(mockMiddleware);
    expect(serverDef.items).toHaveLength(2);

    const healthRoute = serverDef.items[0];
    expect(healthRoute.type).toBe("route");
    if (healthRoute.type !== "route") return;
    expect(healthRoute.method).toBe("GET");
    expect(healthRoute.path).toBe("/health");
    expect(healthRoute.handler).toBe(mockHandler);

    const apiGroup = serverDef.items[1];
    expect(apiGroup.type).toBe("group");
    if (apiGroup.type !== "group") return;
    expect(apiGroup.path).toBe("/api/v1");
    expect(apiGroup.items).toHaveLength(1);

    const userRoute = apiGroup.items[0];
    expect(userRoute.type).toBe("route");
    if (userRoute.type !== "route") return;
    expect(userRoute.method).toBe("GET");
    expect(userRoute.path).toBe("/users/$id");
    expect(userRoute.handler).toBe(mockHandler);
  });

  it("should handle nested middleware correctly", () => {
    const serverDef = r`
      @use ${authenticationMiddleware}

      group /admin {
        @use ${adminAuthorizationMiddleware}

        GET /dashboard {
          handler: ${mockHandler}
        }
      }
    `;

    expect(serverDef.middleware).toHaveLength(1);
    expect(serverDef.middleware[0]).toBe(authenticationMiddleware);

    expect(serverDef.items).toHaveLength(1);
    const adminGroup = serverDef.items[0];
    expect(adminGroup.type).toBe("group");
    if (adminGroup.type !== "group") return;
    expect(adminGroup.path).toBe("/admin");

    expect(adminGroup.middleware).toHaveLength(1);
    expect(adminGroup.middleware[0]).toBe(adminAuthorizationMiddleware);

    expect(adminGroup.items).toHaveLength(1);
    const dashboardRoute = adminGroup.items[0];
    expect(dashboardRoute.type).toBe("route");
  });
});
