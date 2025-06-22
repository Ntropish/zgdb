import { Transport } from "./types";

export class ConsoleTransport implements Transport {
  send(payload: string): void {
    console.log(payload);
  }
}

export function memoryTransport(): Transport & { getMessages: () => string[] } {
  const messages: string[] = [];
  return {
    send(payload: string) {
      messages.push(payload);
    },
    getMessages() {
      return messages;
    },
  };
}
