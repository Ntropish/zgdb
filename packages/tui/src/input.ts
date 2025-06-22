import { Reactor } from "@tsmk/kernel";
import { createTtyReactor, TtyEventMap } from "@tsmk/tty";

// ===================================================================
//
//                      Input Reactor
//
// ===================================================================

/** The context map for all possible input events. */
export type InputContextMap = {
  key: {
    key: string;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
  };
  resize: {
    width: number;
    height: number;
  };
  mouse: {
    type: "mousedown" | "mouseup" | "mousemove";
    x: number;
    y: number;
    button: "left" | "right" | "middle" | "none";
  };
};

export type InputEventMap = {
  key: TtyEventMap["key"];
  pointer: TtyEventMap["mouse"];
  resize: TtyEventMap["resize"];
};

/**
 * Creates a higher-level input reactor that bridges the raw TTY events
 * into a more abstract input system for the TUI.
 *
 * @param eventMap - Handlers for the abstract input events.
 * @returns An object containing the reactor kernel and a cleanup function.
 */
export function createInputReactor(eventMap: Reactor.EventMap<InputEventMap>): {
  reactor: Reactor.Kernel<InputEventMap>;
  cleanup: () => void;
} {
  const inputReactor = Reactor.create<InputEventMap>({ eventMap });

  const { reactor: ttyReactor, stop: stopTty } = createTtyReactor({
    key: [(key: TtyEventMap["key"]) => inputReactor.trigger("key", key)],
    mouse: [
      (mouse: TtyEventMap["mouse"]) => inputReactor.trigger("pointer", mouse),
    ],
    resize: [
      (resize: TtyEventMap["resize"]) => inputReactor.trigger("resize", resize),
    ],
    focusin: [() => {}],
    focusout: [() => {}],
  });

  const cleanup = () => {
    stopTty(); // This handles raw mode and other tty-level cleanup.
  };

  return { reactor: inputReactor, cleanup };
}
