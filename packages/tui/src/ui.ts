import { VNode } from "@tsmk/kernel";
import { BoxNode, TextNode } from "./types.js";

type OmitType<T> = Omit<T, "type">;

export function box(props: OmitType<BoxNode>): VNode {
  return { factory: "box", props };
}

export function text(props: OmitType<TextNode>): VNode {
  return { factory: "text", props };
}

export function createText(content: string): VNode {
  return {
    factory: "text",
    props: {
      content,
    },
  };
}
