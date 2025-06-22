export type Key = {
  name: string;
  sequence: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
};

export type Mouse = {
  type: "mousedown" | "mouseup" | "mousemove" | "wheel";
  x: number;
  y: number;
  button: "left" | "right" | "middle" | "wheelUp" | "wheelDown" | "none";
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
};

export type Resize = {
  width: number;
  height: number;
};

export type TtyEventMap = {
  key: Key;
  mouse: Mouse;
  resize: Resize;
  focusin: {};
  focusout: {};
};
