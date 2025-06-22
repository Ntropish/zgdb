import { Orchestrator } from "@tsmk/kernel";
import type { Key as TtyKey } from "@tsmk/tty";
import { Signal } from "@tsmk/signals";
import { VNode } from "@tsmk/kernel";
import type {
  Align,
  FlexDirection,
  Justify,
  Wrap,
  PositionType,
  Display,
  Overflow,
} from "yoga-layout";

type YogaValueAuto = number | "auto" | `${number}%`;
type YogaValue = number | `${number}%`;

export type FlexStyle = {
  alignContent?: Align;
  alignItems?: Align;
  alignSelf?: Align;
  flex?: number;
  flexBasis?: YogaValueAuto;
  flexDirection?: FlexDirection;
  flexGrow?: number;
  flexShrink?: number;
  flexWrap?: Wrap;
  height?: YogaValueAuto;
  justifyContent?: Justify;
  margin?: YogaValueAuto;
  marginBottom?: YogaValueAuto;
  marginHorizontal?: YogaValueAuto;
  marginLeft?: YogaValueAuto;
  marginRight?: YogaValueAuto;
  marginTop?: YogaValueAuto;
  marginVertical?: YogaValueAuto;
  maxHeight?: YogaValue;
  maxWidth?: YogaValue;
  minHeight?: YogaValue;
  minWidth?: YogaValue;
  overflow?: Overflow;
  padding?: YogaValue;
  paddingBottom?: YogaValue;
  paddingHorizontal?: YogaValue;
  paddingLeft?: YogaValue;
  paddingRight?: YogaValue;
  paddingTop?: YogaValue;
  paddingVertical?: YogaValue;
  position?: PositionType;
  width?: YogaValueAuto;
  display?: Display;
  borderWidth?: number;
  borderBottomWidth?: number;
  borderLeftWidth?: number;
  borderRightWidth?: number;
  borderTopWidth?: number;
};

export type SolidColor = { color: string };
export type CheckerboardPattern = {
  type: "checkerboard";
  char1: string;
  char2: string;
  style1?: TuiStyle;
  style2?: TuiStyle;
};

export type Pattern = CheckerboardPattern /* | OtherPatterns... */;

export type TuiStyle = {
  fg?: string;
  bg?: string | "checkerboard" | { color: string } | { pattern: Pattern };
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
};

export type ScrollbarInfo = {
  contentLength: number;
  scrollTop: number;
  viewHeight?: number;
};

export type BorderStyle = {
  type?: "single" | "double" | "rounded" | "thick" | "dashed-1" | "dashed-2";
  style?: TuiStyle;
};

export type Key = TtyKey;

export type TuiEventMap = {
  keyPress: { detail: { key: Key } };
  // Future events: click, focus, blur, etc.
};

export type TuiNodeCommon = {
  id?: string;
  style?: TuiStyle;
  focusable?: boolean;
  isFocused?: boolean;
  onKeyPress?: (event: TuiEventMap["keyPress"]) => void;
  dirty?: boolean;
};

// Render-time properties that are not part of the definition,
// but are added by the renderer. They are readonly to components.
type RenderProps = {
  readonly bounds: { x: number; y: number; width: number; height: number };
  readonly parent: TuiNode | null;
};

export type BoxNode = TuiNodeCommon &
  FlexStyle & {
    type: "box";
    children?: VNode[];
    border?: BorderStyle;
    scrollbar?: ScrollbarInfo;
    style?: TuiStyle;
    clear?: boolean;
    clearContent?: boolean;
  };

export type TextNode = TuiNodeCommon &
  FlexStyle & {
    type: "text";
    content: string;
    style?: TuiStyle;
    border?: BorderStyle;
  };

export type TuiNode = (BoxNode | TextNode) & Partial<RenderProps>;

export type Component = () => TuiNode;

export type TuiContext = {
  rootNode: TuiNode;
  focusedId?: string;
  hoveredId?: string;
  pointer: {
    x: number;
    y: number;
  };
};
