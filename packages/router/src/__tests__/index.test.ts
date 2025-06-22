import { createRouter, Route } from "../";
import { VNode, ComponentFactory } from "@tsmk/kernel";

describe("Component Router", () => {
  const Home: ComponentFactory = () => ({
    eventMap: {},
    commands: {},
    render: () => ({ factory: "h1", props: { children: ["Home"] } }),
  });

  const UserList: ComponentFactory = () => ({
    eventMap: {},
    commands: {},
    render: () => ({ factory: "h1", props: { children: ["Users"] } }),
  });

  const UserProfile: ComponentFactory = (props: { id: string }) => ({
    eventMap: {},
    commands: {},
    render: () => ({
      factory: "h1",
      props: { children: [`User ${props.id}`] },
    }),
  });

  const app: VNode = {
    factory: Route,
    props: {
      path: "/",
      component: Home,
      children: [
        {
          factory: Route,
          props: {
            path: "users",
            component: UserList,
            children: [
              {
                factory: Route,
                props: { path: ":id", component: UserProfile },
              },
            ],
          },
        },
      ],
    },
  };

  const router = createRouter(app);

  it("should handle the root path", () => {
    const match = router.handle("/");
    expect(match).toBeDefined();
    expect(match?.handler).toBe(Home);
    expect(match?.params).toEqual({});
  });

  it("should handle a nested path", () => {
    const match = router.handle("/users");
    expect(match).toBeDefined();
    expect(match?.handler).toBe(UserList);
  });

  it("should handle a nested path with parameters", () => {
    const match = router.handle("/users/123");
    expect(match).toBeDefined();
    expect(match?.handler).toBe(UserProfile);
    expect(match?.params).toEqual({ id: "123" });
  });

  it("should return null for no match", () => {
    const match = router.handle("/not/found");
    expect(match).toBeNull();
  });

  describe("Edge Cases", () => {
    it("should prioritize static routes over dynamic ones", () => {
      const NewUser: ComponentFactory = () => ({
        eventMap: {},
        commands: {},
        render: () => ({ factory: "h1", props: { children: ["New User"] } }),
      });

      const appWithPrecedence: VNode = {
        factory: Route,
        props: {
          path: "/users",
          component: UserList,
          children: [
            {
              factory: Route,
              props: { path: "new", component: NewUser },
            },
            {
              factory: Route,
              props: { path: ":id", component: UserProfile },
            },
          ],
        },
      };

      const routerWithPrecedence = createRouter(appWithPrecedence);
      const match = routerWithPrecedence.handle("/users/new");
      expect(match).toBeDefined();
      expect(match?.handler).toBe(NewUser);
    });

    it("should handle trailing slashes gracefully", () => {
      const match = router.handle("/users/");
      expect(match).toBeDefined();
      expect(match?.handler).toBe(UserList);
    });

    it("should be case-sensitive", () => {
      const match = router.handle("/Users");
      expect(match).toBeNull();
    });

    it("should not match partially complete nested routes", () => {
      const match = router.handle("/users/123/profile");
      expect(match).toBeNull();
    });

    it("should handle empty path segments", () => {
      const match = router.handle("/users//123");
      expect(match).toBeDefined();
      expect(match?.handler).toBe(UserProfile);
      expect(match?.params).toEqual({ id: "123" });
    });

    it("should not match handlerless routes but should match their children", () => {
      const AdminDashboard: ComponentFactory = () => ({
        eventMap: {},
        commands: {},
        render: () => ({ factory: "h1", props: { children: ["Dashboard"] } }),
      });

      const appWithHandlerless: VNode = {
        factory: Route,
        props: {
          path: "/admin",
          // No component/handler here
          children: [
            {
              factory: Route,
              props: { path: "dashboard", component: AdminDashboard },
            },
          ],
        },
      };

      const routerWithHandlerless = createRouter(appWithHandlerless);

      const noMatch = routerWithHandlerless.handle("/admin");
      expect(noMatch).toBeNull();

      const didMatch = routerWithHandlerless.handle("/admin/dashboard");
      expect(didMatch).toBeDefined();
      expect(didMatch?.handler).toBe(AdminDashboard);
    });

    it("should handle multi-segment static routes", () => {
      const AdminProfile: ComponentFactory = () => ({
        eventMap: {},
        commands: {},
        render: () => ({
          factory: "h1",
          props: { children: ["Admin Profile"] },
        }),
      });

      const appWithMultiSegment: VNode = {
        factory: Route,
        props: {
          path: "/admin/settings/profile",
          component: AdminProfile,
        },
      };

      const routerWithMultiSegment = createRouter(appWithMultiSegment);
      const match = routerWithMultiSegment.handle("/admin/settings/profile");
      expect(match).toBeDefined();
      expect(match?.handler).toBe(AdminProfile);
    });

    it("should handle wildcard/catch-all routes", () => {
      const NotFound: ComponentFactory = () => ({
        eventMap: {},
        commands: {},
        render: () => ({ factory: "h1", props: { children: ["Not Found"] } }),
      });

      const appWithWildcard: VNode = {
        factory: Route,
        props: {
          path: "/",
          component: Home,
          children: [
            {
              factory: Route,
              props: { path: "*", component: NotFound },
            },
          ],
        },
      };

      const routerWithWildcard = createRouter(appWithWildcard);

      const homeMatch = routerWithWildcard.handle("/");
      expect(homeMatch?.handler).toBe(Home);

      const notFoundMatch = routerWithWildcard.handle("/something/else");
      expect(notFoundMatch).toBeDefined();
      expect(notFoundMatch?.handler).toBe(NotFound);
    });

    it("should prioritize static routes regardless of definition order", () => {
      const NewUser: ComponentFactory = () => ({
        eventMap: {},
        commands: {},
        render: () => ({ factory: "h1", props: { children: ["New User"] } }),
      });

      const appWithReversed: VNode = {
        factory: Route,
        props: {
          path: "/users",
          component: UserList,
          children: [
            // Dynamic route is defined FIRST
            {
              factory: Route,
              props: { path: ":id", component: UserProfile },
            },
            {
              factory: Route,
              props: { path: "new", component: NewUser },
            },
          ],
        },
      };

      const routerWithReversed = createRouter(appWithReversed);
      const match = routerWithReversed.handle("/users/new");
      expect(match).toBeDefined();
      expect(match?.handler).toBe(NewUser);
    });

    it("should ignore query strings and hash fragments", () => {
      const match = router.handle("/users/123?query=param#hash");
      expect(match).toBeDefined();
      expect(match?.handler).toBe(UserProfile);
      expect(match?.params).toEqual({ id: "123" });
    });

    it("should handle optional parameters", () => {
      const UserOrNew: ComponentFactory = () => ({
        eventMap: {},
        commands: {},
        render: () => ({ factory: "h1", props: { children: ["User or New"] } }),
      });

      const appWithOptional: VNode = {
        factory: Route,
        props: {
          path: "/users/:id?",
          component: UserOrNew,
        },
      };

      const routerWithOptional = createRouter(appWithOptional);

      const matchWithParam = routerWithOptional.handle("/users/123");
      expect(matchWithParam).toBeDefined();
      expect(matchWithParam?.handler).toBe(UserOrNew);
      expect(matchWithParam?.params).toEqual({ id: "123" });

      const matchWithoutParam = routerWithOptional.handle("/users");
      expect(matchWithoutParam).toBeDefined();
      expect(matchWithoutParam?.handler).toBe(UserOrNew);
      expect(matchWithoutParam?.params).toEqual({});
    });
  });
});
