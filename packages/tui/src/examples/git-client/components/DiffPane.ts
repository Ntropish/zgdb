import { VNode } from "@tsmk/kernel";
import { box, text } from "../../../ui.js";

export type DiffPaneProps = {
  content: string;
  isFocused: boolean;
};

export const DiffPane = (props: DiffPaneProps): VNode => {
  return box({
    isFocused: props.isFocused,
    border: { type: "single" },
    children: [text({ content: props.content })],
  });
};
