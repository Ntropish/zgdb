import { VNode, AnyComponentFactory } from "@tsmk/kernel";

type RouteNode = {
  path: string;
  children: RouteNode[];
  parent?: RouteNode;
  handler?: AnyComponentFactory;
};

type RouteProps = {
  path: string;
  handler: AnyComponentFactory;
  children?: VNode[];
};

export const Route: AnyComponentFactory<RouteProps> = (props) => {
  const { handler, ...rest } = props;
  return {
    factory: "route",
    props: {
      ...rest,
      handler: handler,
    },
  };
};

async function buildRouteTree(vnode: VNode, parent: RouteNode): Promise<void> {
  const factory = vnode.factory;

  // Render functional components to find nested Routes
  if (typeof factory === "function" && factory !== Route) {
    const rendered = await factory(vnode.props);
    if (rendered) {
      if (Array.isArray(rendered)) {
        for (const child of rendered) {
          await buildRouteTree(child, parent);
        }
      } else {
        await buildRouteTree(rendered, parent);
      }
    }
    return;
  }

  // Extract props and children, whether from a Route or a native 'route' VNode
  const props =
    factory === Route ? vnode.props : factory === "route" ? vnode.props : null;

  if (props) {
    const routeNode: RouteNode = {
      path: props.path,
      handler: props.handler || props.component,
      children: [],
      parent: parent,
    };
    parent.children.push(routeNode);

    // Recursively process children
    if (props.children) {
      for (const child of props.children) {
        if (typeof child === "object") {
          await buildRouteTree(child, routeNode);
        }
      }
    }
  } else if (vnode.props?.children) {
    for (const child of vnode.props.children) {
      if (typeof child === "object") {
        await buildRouteTree(child, parent);
      }
    }
  }
}

type MatchResult = {
  handler: AnyComponentFactory;
  params: Record<string, string>;
} | null;

function findMatch(node: RouteNode, segments: string[]): MatchResult {
  const staticMatches = node.children.filter(
    (child) => !child.path.includes(":") && child.path !== "*"
  );
  const dynamicMatches = node.children.filter((child) =>
    child.path.includes(":")
  );

  // Prioritize static routes
  for (const child of staticMatches) {
    const routeSegments = child.path.split("/").filter(Boolean);
    if (segments.length < routeSegments.length) {
      continue;
    }

    let isMatch = true;
    for (let i = 0; i < routeSegments.length; i++) {
      if (routeSegments[i] !== segments[i]) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      const remainingSegments = segments.slice(routeSegments.length);
      if (remainingSegments.length === 0) {
        if (child.handler) return { handler: child.handler, params: {} };
      } else {
        const nestedMatch = findMatch(child, remainingSegments);
        if (nestedMatch) return nestedMatch;
      }
    }
  }

  // Then check dynamic routes
  for (const child of dynamicMatches) {
    const routeSegments = child.path.split("/").filter(Boolean);
    const optionalSegments = routeSegments.filter((s) =>
      s.endsWith("?")
    ).length;

    if (
      segments.length < routeSegments.length - optionalSegments ||
      segments.length > routeSegments.length
    ) {
      continue;
    }

    const params: Record<string, string> = {};
    let isMatch = true;
    let consumedSegments = 0;

    for (let i = 0; i < routeSegments.length; i++) {
      let routeSegment = routeSegments[i];
      const pathSegment = segments[i];

      if (!pathSegment && routeSegment.endsWith("?")) {
        // Optional segment not present, this is a valid match for this segment
        consumedSegments++;
        continue;
      }

      consumedSegments++;

      if (routeSegment.startsWith(":")) {
        const isOptional = routeSegment.endsWith("?");
        const paramName = routeSegment.substring(
          1,
          isOptional ? routeSegment.length - 1 : undefined
        );
        params[paramName] = pathSegment;
      } else if (routeSegment !== pathSegment) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      const remainingSegments = segments.slice(consumedSegments);
      if (remainingSegments.length === 0) {
        if (child.handler) {
          return { handler: child.handler, params };
        }
      } else {
        const nestedMatch = findMatch(child, remainingSegments);
        if (nestedMatch)
          return {
            ...nestedMatch,
            params: { ...params, ...nestedMatch.params },
          };
      }
    }
  }

  // If no specific match is found, look for a wildcard route
  const wildcard = node.children.find((child) => child.path === "*");
  if (wildcard && wildcard.handler) {
    return { handler: wildcard.handler, params: {} };
  }

  return null;
}

export async function createRouter(vnodes: VNode | VNode[]) {
  const root: RouteNode = { path: "/", children: [] };
  if (Array.isArray(vnodes)) {
    for (const vnode of vnodes) {
      await buildRouteTree(vnode, root);
    }
  } else {
    await buildRouteTree(vnodes, root);
  }

  return {
    tree: root,
    handle: (path: string): MatchResult => {
      const pathname = path.split("?")[0].split("#")[0];
      const segments = pathname.split("/").filter(Boolean);
      return findMatch(root, segments);
    },
  };
}
