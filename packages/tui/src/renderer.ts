import { StepHandler, SyncReactor, Reactor } from "@tsmk/kernel";
import {
  BorderStyle,
  BoxNode,
  TuiNode,
  TuiStyle,
  TextNode,
  Pattern,
  ScrollbarInfo,
  FlexStyle,
} from "./types.js";
import { LoggerPlugins } from "@tsmk/kernel";
import { Orchestrator } from "@tsmk/kernel";
import { TuiHostInstance } from "./reconciler.js";
import Yoga from "yoga-layout";
import * as fs from "fs";

type YogaNode = ReturnType<typeof Yoga.Node.create>;

const borderChars = {
  single: {
    t: "─",
    b: "─",
    l: "│",
    r: "│",
    tl: "┌",
    tr: "┐",
    bl: "└",
    br: "┘",
  },
  double: {
    t: "═",
    b: "═",
    l: "║",
    r: "║",
    tl: "╔",
    tr: "╗",
    bl: "╚",
    br: "╝",
  },
  rounded: {
    t: "─",
    b: "─",
    l: "│",
    r: "│",
    tl: "╭",
    tr: "╮",
    bl: "╰",
    br: "╯",
  },
  thick: { t: "█", b: "█", l: "█", r: "█", tl: "█", tr: "█", bl: "█", br: "█" },
  "dashed-1": {
    t: "╌",
    b: "╌",
    l: "╎",
    r: "╎",
    tl: "┌",
    tr: "┐",
    bl: "└",
    br: "┘",
  },
  "dashed-2": {
    t: "┄",
    b: "┄",
    l: "┆",
    r: "┆",
    tl: "┌",
    tr: "┐",
    bl: "└",
    br: "┘",
  },
};

type Bounds = { x: number; y: number; width: number; height: number };

type DrawCommand =
  | { type: "text"; x: number; y: number; content: string; style?: TuiStyle }
  | { type: "clear"; bounds: Bounds };

function applyStyle(char: string, style?: TuiStyle): string {
  if (!style) return char;

  let styledChar = "";
  let hasStyle = false;

  if (style.fg) {
    hasStyle = true;
    if (style.fg.startsWith("\x1b")) {
      styledChar += style.fg;
    } else {
      styledChar += `\x1b[38;2;${style.fg}m`;
    }
  }
  if (style.bg) {
    hasStyle = true;
    if (typeof style.bg === "object" && "color" in style.bg) {
      styledChar += `\x1b[48;2;${style.bg.color}m`;
    } else if (typeof style.bg === "string" && style.bg.startsWith("\x1b")) {
      styledChar += style.bg;
    }
  }
  if (style.bold) {
    hasStyle = true;
    styledChar += "\x1b[1m";
  }
  if (style.italic) {
    hasStyle = true;
    styledChar += "\x1b[3m";
  }
  if (style.underline) {
    hasStyle = true;
    styledChar += "\x1b[4m";
  }

  if (!hasStyle) {
    return char;
  }

  styledChar += char;
  styledChar += "\x1b[0m";
  return styledChar;
}

function write(x: number, y: number, content: string, style?: TuiStyle) {
  process.stdout.write(`\x1b[${y + 1};${x + 1}H`);
  process.stdout.write(applyStyle(content, style));
}

function applyFlexboxStyles(node: YogaNode, style: FlexStyle) {
  if (style.alignContent) node.setAlignContent(style.alignContent);
  if (style.alignItems) node.setAlignItems(style.alignItems);
  if (style.alignSelf) node.setAlignSelf(style.alignSelf);
  if (style.flex) node.setFlex(style.flex);
  if (style.flexBasis) node.setFlexBasis(style.flexBasis);
  if (style.flexDirection) node.setFlexDirection(style.flexDirection);
  if (style.flexGrow) node.setFlexGrow(style.flexGrow);
  if (style.flexShrink) node.setFlexShrink(style.flexShrink);
  if (style.flexWrap) node.setFlexWrap(style.flexWrap);
  if (style.height) node.setHeight(style.height);
  if (style.justifyContent) node.setJustifyContent(style.justifyContent);
  if (style.margin) node.setMargin(Yoga.EDGE_ALL, style.margin);
  if (style.marginBottom) node.setMargin(Yoga.EDGE_BOTTOM, style.marginBottom);
  if (style.marginHorizontal)
    node.setMargin(Yoga.EDGE_HORIZONTAL, style.marginHorizontal);
  if (style.marginLeft) node.setMargin(Yoga.EDGE_LEFT, style.marginLeft);
  if (style.marginRight) node.setMargin(Yoga.EDGE_RIGHT, style.marginRight);
  if (style.marginTop) node.setMargin(Yoga.EDGE_TOP, style.marginTop);
  if (style.marginVertical)
    node.setMargin(Yoga.EDGE_VERTICAL, style.marginVertical);
  if (style.maxHeight) node.setMaxHeight(style.maxHeight);
  if (style.maxWidth) node.setMaxWidth(style.maxWidth);
  if (style.minHeight) node.setMinHeight(style.minHeight);
  if (style.minWidth) node.setMinWidth(style.minWidth);
  if (style.overflow) node.setOverflow(style.overflow);
  if (style.padding) node.setPadding(Yoga.EDGE_ALL, style.padding);
  if (style.paddingBottom)
    node.setPadding(Yoga.EDGE_BOTTOM, style.paddingBottom);
  if (style.paddingHorizontal)
    node.setPadding(Yoga.EDGE_HORIZONTAL, style.paddingHorizontal);
  if (style.paddingLeft) node.setPadding(Yoga.EDGE_LEFT, style.paddingLeft);
  if (style.paddingRight) node.setPadding(Yoga.EDGE_RIGHT, style.paddingRight);
  if (style.paddingTop) node.setPadding(Yoga.EDGE_TOP, style.paddingTop);
  if (style.paddingVertical)
    node.setPadding(Yoga.EDGE_VERTICAL, style.paddingVertical);
  if (style.position) node.setPositionType(style.position);
  if (style.width) node.setWidth(style.width);
  if (style.display) node.setDisplay(style.display);
  if (style.borderWidth) node.setBorder(Yoga.EDGE_ALL, style.borderWidth);
  if (style.borderBottomWidth)
    node.setBorder(Yoga.EDGE_BOTTOM, style.borderBottomWidth);
  if (style.borderLeftWidth)
    node.setBorder(Yoga.EDGE_LEFT, style.borderLeftWidth);
  if (style.borderRightWidth)
    node.setBorder(Yoga.EDGE_RIGHT, style.borderRightWidth);
  if (style.borderTopWidth) node.setBorder(Yoga.EDGE_TOP, style.borderTopWidth);
}

function buildYogaTree(tuiNode: TuiHostInstance): YogaNode {
  const yogaNode = Yoga.Node.create();
  applyFlexboxStyles(yogaNode, tuiNode.props);

  if (tuiNode.type === "text" && tuiNode.props.content) {
    const { content } = tuiNode.props;
    yogaNode.setMeasureFunc((width, widthMode, height, heightMode) => {
      // For now, we assume text is a single line and its width is its length.
      // A more sophisticated implementation could handle text wrapping.
      return {
        width: content.length,
        height: 1,
      };
    });
  }

  (tuiNode as any).yogaNode = yogaNode;

  if (tuiNode.children) {
    for (let i = 0; i < tuiNode.children.length; i++) {
      const childTuiNode = tuiNode.children[i];
      const childYogaNode = buildYogaTree(childTuiNode);
      yogaNode.insertChild(childYogaNode, i);
    }
  }

  return yogaNode;
}

export function createRenderReactor(
  commands: DrawCommand[],
  context: { focusedId?: string },
  logger?: LoggerPlugins
): SyncReactor.Kernel<any> {
  let reactor: SyncReactor.Kernel<any>;
  const renderHandlers = {
    box: [
      (ctx: { node: TuiHostInstance; bounds: Bounds }) => {
        const { node, bounds } = ctx;
        const { props } = node;

        if (props.clear) {
          commands.push({ type: "clear", bounds });
        }

        drawBorder(commands, bounds, node);

        // Children are rendered by the top-level render function now
      },
    ],
    text: [
      (ctx: { node: TuiHostInstance; bounds: Bounds }) => {
        const { node, bounds } = ctx;
        const { props } = node;
        (node as any).bounds = bounds;
        const content = props.content?.toString() ?? "";
        const visibleContent = content.substring(0, bounds.width);
        commands.push({
          type: "text",
          x: bounds.x,
          y: bounds.y,
          content: visibleContent,
          style: props.style,
        });
      },
    ],
  };

  reactor = SyncReactor.create({ eventMap: renderHandlers as any });
  return reactor;
}

const throttledQueue: (() => void)[] = [];
let isThrottled = false;

function drawScrollbar(
  commands: DrawCommand[],
  bounds: Bounds,
  style: BorderStyle,
  scroll: ScrollbarInfo
) {
  const { contentLength, scrollTop, viewHeight } = scroll;
  if (!viewHeight || contentLength <= viewHeight) return;

  const scrollbarHeight = viewHeight - (style.type ? 2 : 0);
  const thumbHeight = Math.max(
    1,
    Math.floor((viewHeight / contentLength) * scrollbarHeight)
  );
  const thumbY = Math.floor((scrollTop / contentLength) * scrollbarHeight);

  for (let i = 0; i < scrollbarHeight; i++) {
    commands.push({
      type: "text",
      x: bounds.x + bounds.width - (style.type ? 1 : 0),
      y: bounds.y + (style.type ? 1 : 0) + i,
      content: i >= thumbY && i < thumbY + thumbHeight ? "█" : "░",
      style: style.style,
    });
  }
}

function drawBorder(
  commands: DrawCommand[],
  bounds: Bounds,
  node: TuiHostInstance
) {
  const { props } = node;
  const borderProp = props.border;

  // Use the full border style if present
  if (borderProp && borderProp.type) {
    const { isFocused } = props;
    const charSet = borderChars[borderProp.type];
    const borderStyle = isFocused
      ? { ...borderProp.style, bold: true }
      : borderProp.style;

    // Draw corners
    commands.push({
      type: "text",
      x: bounds.x,
      y: bounds.y,
      content: charSet.tl,
      style: borderStyle,
    });
    commands.push({
      type: "text",
      x: bounds.x + bounds.width - 1,
      y: bounds.y,
      content: charSet.tr,
      style: borderStyle,
    });
    commands.push({
      type: "text",
      x: bounds.x,
      y: bounds.y + bounds.height - 1,
      content: charSet.bl,
      style: borderStyle,
    });
    commands.push({
      type: "text",
      x: bounds.x + bounds.width - 1,
      y: bounds.y + bounds.height - 1,
      content: charSet.br,
      style: borderStyle,
    });

    // Draw sides
    for (let i = 1; i < bounds.width - 1; i++) {
      commands.push({
        type: "text",
        x: bounds.x + i,
        y: bounds.y,
        content: charSet.t,
        style: borderStyle,
      });
      commands.push({
        type: "text",
        x: bounds.x + i,
        y: bounds.y + bounds.height - 1,
        content: charSet.b,
        style: borderStyle,
      });
    }
    for (let i = 1; i < bounds.height - 1; i++) {
      commands.push({
        type: "text",
        x: bounds.x,
        y: bounds.y + i,
        content: charSet.l,
        style: borderStyle,
      });
      commands.push({
        type: "text",
        x: bounds.x + bounds.width - 1,
        y: bounds.y + i,
        content: charSet.r,
        style: borderStyle,
      });
    }
    return;
  }

  // Otherwise, draw individual border lines based on flex props
  const charSet = borderChars.single; // Default to single
  const borderStyle = props.style; // TuiStyle
  const hasTop = props.borderTopWidth && props.borderTopWidth > 0;
  const hasBottom = props.borderBottomWidth && props.borderBottomWidth > 0;
  const hasLeft = props.borderLeftWidth && props.borderLeftWidth > 0;
  const hasRight = props.borderRightWidth && props.borderRightWidth > 0;

  if (!hasTop && !hasBottom && !hasLeft && !hasRight) return;

  // Top
  if (hasTop) {
    for (let i = hasLeft ? 1 : 0; i < bounds.width - (hasRight ? 1 : 0); i++) {
      commands.push({
        type: "text",
        x: bounds.x + i,
        y: bounds.y,
        content: charSet.t,
        style: borderStyle,
      });
    }
  }
  // Bottom
  if (hasBottom) {
    const y = bounds.y + bounds.height - 1;
    for (let i = hasLeft ? 1 : 0; i < bounds.width - (hasRight ? 1 : 0); i++) {
      commands.push({
        type: "text",
        x: bounds.x + i,
        y,
        content: charSet.b,
        style: borderStyle,
      });
    }
  }
  // Left
  if (hasLeft) {
    for (let i = hasTop ? 1 : 0; i < bounds.height - (hasBottom ? 1 : 0); i++) {
      commands.push({
        type: "text",
        x: bounds.x,
        y: bounds.y + i,
        content: charSet.l,
        style: borderStyle,
      });
    }
  }
  // Right
  if (hasRight) {
    const x = bounds.x + bounds.width - 1;
    for (let i = hasTop ? 1 : 0; i < bounds.height - (hasBottom ? 1 : 0); i++) {
      commands.push({
        type: "text",
        x,
        y: bounds.y + i,
        content: charSet.r,
        style: borderStyle,
      });
    }
  }

  // Corners
  if (hasTop && hasLeft)
    commands.push({
      type: "text",
      x: bounds.x,
      y: bounds.y,
      content: charSet.tl,
      style: borderStyle,
    });
  if (hasTop && hasRight)
    commands.push({
      type: "text",
      x: bounds.x + bounds.width - 1,
      y: bounds.y,
      content: charSet.tr,
      style: borderStyle,
    });
  if (hasBottom && hasLeft)
    commands.push({
      type: "text",
      x: bounds.x,
      y: bounds.y + bounds.height - 1,
      content: charSet.bl,
      style: borderStyle,
    });
  if (hasBottom && hasRight)
    commands.push({
      type: "text",
      x: bounds.x + bounds.width - 1,
      y: bounds.y + bounds.height - 1,
      content: charSet.br,
      style: borderStyle,
    });
}

const executeDrawCommands: StepHandler<{ commands: DrawCommand[] }> = (ctx) => {
  const { commands } = ctx;
  for (const command of commands) {
    if (command.type === "text") {
      write(command.x, command.y, command.content, command.style);
    } else if (command.type === "clear") {
      for (
        let y = command.bounds.y;
        y < command.bounds.y + command.bounds.height;
        y++
      ) {
        write(command.bounds.x, y, " ".repeat(command.bounds.width));
      }
    }
  }
};

function traverseAndRender(
  tuiNode: TuiHostInstance,
  reactor: Reactor.Kernel<any>
) {
  const yogaNode = (tuiNode as any).yogaNode as YogaNode;
  const layout = yogaNode.getComputedLayout();
  const bounds = {
    x: layout.left,
    y: layout.top,
    width: layout.width,
    height: layout.height,
  };

  (tuiNode as any).bounds = bounds;

  reactor.trigger(tuiNode.type, { node: tuiNode, bounds });

  if (tuiNode.children) {
    for (const child of tuiNode.children) {
      traverseAndRender(child, reactor);
    }
  }
}

function logYogaTree(node: TuiHostInstance, indent = ""): string {
  const yogaNode = (node as any).yogaNode as YogaNode;
  const layout = yogaNode.getComputedLayout();
  let log = `${indent}${node.type} (${
    (node.props as any).content ? `"${(node.props as any).content}"` : ""
  }) ${JSON.stringify(layout)}\n`;

  if (node.children) {
    for (const child of node.children) {
      log += logYogaTree(child, indent + "  ");
    }
  }
  return log;
}

export function render(node: TuiHostInstance, logger?: LoggerPlugins) {
  process.stdout.write("\x1b[2J\x1b[H"); // Clear screen and move to home
  const { rows, columns } = process.stdout;
  fs.appendFileSync(
    "debug-layout.log",
    `\n--- RENDER (${columns}x${rows}) ---\n`
  );

  // 1. Build Yoga tree and calculate layout
  const rootYogaNode = buildYogaTree(node);
  rootYogaNode.calculateLayout(columns, rows, Yoga.DIRECTION_LTR);

  // --- DEBUG LOGGING ---
  const treeLog = logYogaTree(node);
  fs.writeFileSync("debug-layout.log", treeLog);
  // --- END DEBUG LOGGING ---

  // 2. Traverse the tree and render using the calculated layout
  const commands: DrawCommand[] = [];
  const renderReactor = createRenderReactor(commands, {}, logger);
  const orchestrator = Orchestrator.create([executeDrawCommands]);

  traverseAndRender(node, renderReactor);

  orchestrator.run({ commands });

  // Clean up yoga nodes
  rootYogaNode.freeRecursive();
}
