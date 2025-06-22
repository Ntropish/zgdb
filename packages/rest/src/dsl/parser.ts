import { VNode, AsyncComponentFactory, StepHandler } from "@tsmk/kernel";
import { Route } from "@tsmk/router";

const PLACEHOLDER_PREFIX = "__VALUE_";
const getPlaceholder = (index: number) => `${PLACEHOLDER_PREFIX}${index}__`;

export function parseDsl(
  strings: TemplateStringsArray,
  ...values: any[]
): VNode {
  let fullString = strings[0];
  for (let i = 0; i < values.length; i++) {
    fullString += getPlaceholder(i) + strings[i + 1];
  }

  return parse(fullString, values);
}

function parse(dsl: string, values: any[]): VNode {
  const children: VNode[] = [];
  const middleware: StepHandler<any>[] = [];

  let remainingDsl = dsl.replace(/#.*$/gm, "").trim();

  const findNextBlock = () => {
    const blockRegex = /^(?:(@use)|(group)|(GET|POST|PUT|PATCH|DELETE))\s+/;
    const match = remainingDsl.match(blockRegex);
    return match;
  };

  let match;
  while ((match = findNextBlock()) && remainingDsl.length > 0) {
    const keyword = match[1] || match[2] || match[3];
    remainingDsl = remainingDsl.substring(match[0].length).trim();

    if (keyword === "@use") {
      const placeholderMatch = remainingDsl.match(
        new RegExp(`^${PLACEHOLDER_PREFIX}(\\d+)__`)
      );
      if (!placeholderMatch) throw new Error("Expected placeholder after @use");

      const valueIndex = parseInt(placeholderMatch[1], 10);
      const handler = values[valueIndex];
      if (typeof handler !== "function")
        throw new Error("Expected a function for @use");

      middleware.push(handler);
      remainingDsl = remainingDsl.substring(placeholderMatch[0].length).trim();
    } else if (keyword === "group") {
      const pathMatch = remainingDsl.match(/^(\S+)/);
      if (!pathMatch) throw new Error("Expected path after 'group'");
      const path = pathMatch[1];
      remainingDsl = remainingDsl.substring(path.length).trim();

      const { body, remaining } = extractBlock(remainingDsl);
      const groupVNode = parse(body, values);

      // We need to prepend the group's path to all child routes
      const childRoutes = (groupVNode.props?.children as VNode[]).map(
        (child: VNode) => {
          return {
            ...child,
            props: {
              ...child.props,
              path: `${path}${child.props?.path}`,
            },
          };
        }
      );

      children.push(...childRoutes);
      remainingDsl = remaining;
    } else {
      const method = keyword as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      const pathMatch = remainingDsl.match(/^(\S+)/);
      if (!pathMatch) throw new Error(`Expected path after '${method}'`);
      const path = pathMatch[1];
      remainingDsl = remainingDsl.substring(path.length).trim();

      const { body, remaining } = extractBlock(remainingDsl);
      const handler = parseRouteBody(body, values);

      const component: AsyncComponentFactory<any> = async (ctx) => {
        if (ctx.req.method !== method) {
          return {
            factory: "div",
            props: { children: ["Method Not Allowed"] },
          };
        }

        for (const mw of middleware) {
          await mw(ctx);
          if (ctx.res.writableEnded) {
            return { factory: "div", props: {} };
          }
        }

        const result = await handler(ctx);

        if (!ctx.res.writableEnded) {
          ctx.res.statusCode = 200;
          ctx.res.setHeader("Content-Type", "application/json");
          ctx.res.end(JSON.stringify(result));
        }
        return { factory: "div", props: {} };
      };

      children.push({
        factory: Route,
        props: {
          path,
          component,
        },
      });
      remainingDsl = remaining;
    }
  }

  return {
    factory: "div",
    props: {
      children,
    },
  };
}

function parseRouteBody(body: string, values: any[]): StepHandler<any> {
  let handler: StepHandler<any> = () => {
    throw new Error("Handler not implemented");
  };

  const lines = body.split("\n").filter((l) => l.trim().length > 0);
  for (const line of lines) {
    const trimmedLine = line.trim();
    const [key, placeholder] = trimmedLine.split(/:\s*/);

    if (key === "handler") {
      const placeholderMatch = placeholder?.match(
        new RegExp(`^${PLACEHOLDER_PREFIX}(\\d+)__`)
      );
      if (!placeholderMatch) continue;

      const valueIndex = parseInt(placeholderMatch[1], 10);
      handler = values[valueIndex];
    }
  }

  return handler;
}

function extractBlock(dsl: string): { body: string; remaining: string } {
  if (!dsl.startsWith("{")) {
    throw new Error("Invalid block: must start with '{'");
  }

  let braceCount = 0;
  let endIndex = -1;

  for (let i = 0; i < dsl.length; i++) {
    if (dsl[i] === "{") {
      braceCount++;
    } else if (dsl[i] === "}") {
      braceCount--;
    }

    if (braceCount === 0) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    throw new Error("Invalid block: unbalanced braces");
  }

  const body = dsl.substring(1, endIndex).trim();
  const remaining = dsl.substring(endIndex + 1).trim();

  return { body, remaining };
}
