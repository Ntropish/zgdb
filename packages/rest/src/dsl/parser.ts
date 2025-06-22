import {
  ServerDefinition,
  RouteDefinition,
  GroupDefinition,
  StepHandler,
} from "./types";

const PLACEHOLDER_PREFIX = "__VALUE_";
const getPlaceholder = (index: number) => `${PLACEHOLDER_PREFIX}${index}__`;

export function parseDsl(
  strings: TemplateStringsArray,
  ...values: any[]
): ServerDefinition {
  let fullString = strings[0];
  for (let i = 0; i < values.length; i++) {
    fullString += getPlaceholder(i) + strings[i + 1];
  }

  return parse(fullString, values);
}

function parse(dsl: string, values: any[]): ServerDefinition {
  const serverDef: ServerDefinition = {
    type: "server",
    middleware: [],
    items: [],
  };

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

      serverDef.middleware.push(handler);
      remainingDsl = remainingDsl.substring(placeholderMatch[0].length).trim();
    } else if (keyword === "group") {
      const pathMatch = remainingDsl.match(/^(\S+)/);
      if (!pathMatch) throw new Error("Expected path after 'group'");
      const path = pathMatch[1];
      remainingDsl = remainingDsl.substring(path.length).trim();

      const { body, remaining } = extractBlock(remainingDsl);
      const parsedGroup = parse(body, values);
      const groupDef: GroupDefinition = {
        type: "group",
        path: path,
        middleware: parsedGroup.middleware,
        items: parsedGroup.items,
      };
      serverDef.items.push(groupDef);
      remainingDsl = remaining;
    } else {
      const method = keyword as RouteDefinition["method"];
      const pathMatch = remainingDsl.match(/^(\S+)/);
      if (!pathMatch) throw new Error(`Expected path after '${method}'`);
      const path = pathMatch[1];
      remainingDsl = remainingDsl.substring(path.length).trim();

      const { body, remaining } = extractBlock(remainingDsl);
      const routeDef = parseRouteBody(body, values);
      routeDef.method = method;
      routeDef.path = path;
      serverDef.items.push(routeDef);
      remainingDsl = remaining;
    }
  }

  return serverDef;
}

function parseRouteBody(body: string, values: any[]): RouteDefinition {
  const routeDef: RouteDefinition = {
    type: "route",
    method: "GET",
    path: "",
    handler: () => {
      throw new Error("Handler not implemented");
    },
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
      routeDef.handler = values[valueIndex];
    }
  }

  return routeDef;
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
