import { VNode, ComponentFactory } from "@tsmk/kernel";

type RouteNode = {
  path: string;
  children: RouteNode[];
  parent?: RouteNode;
  handler?: ComponentFactory;
};

type RouteProps = {
  path: string;
  component: ComponentFactory;
  children?: VNode[];
};

export const Route: ComponentFactory<RouteProps> = (props) => {
  const { component, ...rest } = props;
  return {
    eventMap: {},
    commands: {},
    render: () => ({
      factory: "route",
      props: {
        ...rest,
        // The component factory itself is passed to the host config,
        // which will instantiate it when the route is matched.
        component: component,
      },
    }),
  };
};

function buildRouteTree(vnode: VNode, parent: RouteNode): void {
  const factory = vnode.factory;

  // Render functional components to find nested Routes
  if (typeof factory === "function" && factory !== Route) {
    const blueprint = factory(vnode.props);
    const rendered = blueprint.render?.(vnode.props);
    if (rendered) {
      buildRouteTree(rendered, parent);
    }
    return;
  }

  // Extract props and children, whether from a Route or a native 'route' VNode
  const props =
    factory === Route ? vnode.props : factory === "route" ? vnode.props : null;

  if (props) {
    const routeNode: RouteNode = {
      path: props.path,
      handler: props.component,
      children: [],
      parent: parent,
    };
    parent.children.push(routeNode);

    // Recursively process children
    if (props.children) {
      for (const child of props.children) {
        if (typeof child === "object") {
          buildRouteTree(child, routeNode);
        }
      }
    }
  }
}

type MatchResult = {
  handler: ComponentFactory;
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

export function createRouter(app: VNode) {
  const root: RouteNode = { path: "/", children: [] };
  buildRouteTree(app, root);

  return {
    tree: root,
    handle: (path: string): MatchResult => {
      const pathname = path.split("?")[0].split("#")[0];
      const segments = pathname.split("/").filter(Boolean);
      return findMatch(root, segments);
    },
  };
}
