export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

export const LogLevels: Record<LogLevel, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

export interface LogRecord {
  level: LogLevel;
  message: string;
  time: number;
  data?: Record<string, unknown>;
  error?: Error;
}

export interface Transport {
  send(payload: string): void | Promise<void>;
}
