import { VNode } from "@tsmk/kernel";
import { TuiStyle } from "../../../types.js";
import { box, text, createText } from "../../../ui.js";

const statusColors: Record<string, string> = {
  M: "yellow",
  "??": "green",
  D: "red",
  A: "green",
  R: "blue",
  C: "blue",
};

export type GitFile = {
  status: string;
  path: string;
};

export type StatusPaneProps = {
  files: GitFile[];
  selectedIndex: number;
  error: string | null;
  isFocused: boolean;
};

export const StatusPane = (props: StatusPaneProps): VNode => {
  if (props.error) {
    return box({
      border: { type: "single" },
      children: [text({ content: props.error })],
    });
  }

  if (props.files.length === 0) {
    return box({
      border: { type: "single" },
      children: [text({ content: "Working directory is clean." })],
    });
  }

  return box({
    isFocused: props.isFocused,
    border: { type: "single" },
    children: props.files.map((file, i) => {
      const isSelected = i === props.selectedIndex;
      const statusStyle: TuiStyle = {
        fg: statusColors[file.status] || undefined,
      };
      const pathStyle: TuiStyle = {};

      if (isSelected) {
        pathStyle.underline = true;
        if (props.isFocused) {
          pathStyle.bg = "white";
          pathStyle.fg = "black";
          statusStyle.bg = "white";
          statusStyle.fg = "black";
        }
      }
      return box({
        flexDirection: 1,
        children: [
          text({
            content: file.status,
            style: statusStyle,
          }),
          text({ content: ` ${file.path}`, style: pathStyle }),
        ],
      });
    }),
  });
};
