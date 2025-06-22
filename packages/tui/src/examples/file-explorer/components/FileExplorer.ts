import { VNode } from "@tsmk/kernel";
import { TuiNode } from "../../../types.js";
import { box, text, createText } from "../../../ui.js";
import * as fs from "fs/promises";
import * as path from "path";
import { Key } from "@tsmk/tty";
import { Align, FlexDirection } from "yoga-layout";

type File = { name: string; isDirectory: boolean };

// =================================================================================
// Component: FileExplorer
//
// Displays a list of files and handles navigation, scrolling, and borders.
// =================================================================================

export type FileExplorerProps = {
  isFocused: boolean;
  path: string;
  files: File[];
  selectedIndex: number;
  scrollTop: number;
  errorMessage: string | null;
};

export const FileExplorer = (props: FileExplorerProps): VNode => {
  return box({
    border: { type: "single" },
    isFocused: props.isFocused,
    flexDirection: FlexDirection.Column,
    flexGrow: 1,
    children: [
      box({
        height: 2,
        borderBottomWidth: 1,
        paddingHorizontal: 1,
        alignItems: Align.Center,
        flexDirection: FlexDirection.Column,
        children: [text({ content: props.path })],
      }),
      box({
        flexGrow: 1,
        paddingHorizontal: 1,
        flexDirection: FlexDirection.Column,
        children: props.errorMessage
          ? [
              text({
                style: { fg: "red" },
                content: props.errorMessage,
              }),
            ]
          : props.files.map((file, index) =>
              text({
                style:
                  index === props.selectedIndex
                    ? { bg: "blue", fg: "white" }
                    : undefined,
                content: file.isDirectory ? `[${file.name}]` : file.name,
              })
            ),
      }),
    ],
  });
};
