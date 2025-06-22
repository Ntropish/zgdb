import { Orchestrator, BREAK } from "@tsmk/kernel";
import { ValidationStep, ValidationPipelineContext } from "..";
import { regex as standardRegex } from "../regex";

// #region Validators

export function minLength(min: number): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "string") {
      if (ctx.output.length < min) {
        ctx.issues.push({
          path: ctx.path,
          message: `String must be at least ${min} characters long.`,
        });
        return BREAK;
      }
    }
  };
}

export function maxLength(max: number): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "string") {
      if (ctx.output.length > max) {
        ctx.issues.push({
          path: ctx.path,
          message: `String must be at most ${max} characters long.`,
        });
        return BREAK;
      }
    }
  };
}

export function exactLength(len: number): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "string") {
      if (ctx.output.length !== len) {
        ctx.issues.push({
          path: ctx.path,
          message: `String must be exactly ${len} characters long.`,
        });
        return BREAK;
      }
    }
  };
}

export function regex(re: RegExp): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "string") {
      if (!re.test(ctx.output)) {
        ctx.issues.push({
          path: ctx.path,
          message: "String does not match expected format.",
        });
        return BREAK;
      }
    }
  };
}

export function includes(search: string): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "string") {
      if (!ctx.output.includes(search)) {
        ctx.issues.push({
          path: ctx.path,
          message: `String must include "${search}".`,
        });
        return BREAK;
      }
    }
  };
}

export function startsWith(search: string): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "string") {
      if (!ctx.output.startsWith(search)) {
        ctx.issues.push({
          path: ctx.path,
          message: `String must start with "${search}".`,
        });
        return BREAK;
      }
    }
  };
}

export function endsWith(search: string): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "string") {
      if (!ctx.output.endsWith(search)) {
        ctx.issues.push({
          path: ctx.path,
          message: `String must end with "${search}".`,
        });
        return BREAK;
      }
    }
  };
}

export function uppercase(): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "string") {
      if (ctx.output !== ctx.output.toUpperCase()) {
        ctx.issues.push({
          path: ctx.path,
          message: "String must be uppercase.",
        });
        return BREAK;
      }
    }
  };
}

export function lowercase(): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "string") {
      if (ctx.output !== ctx.output.toLowerCase()) {
        ctx.issues.push({
          path: ctx.path,
          message: "String must be lowercase.",
        });
        return BREAK;
      }
    }
  };
}

function createFormatValidator(re: RegExp, formatName: string): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output === "string") {
      if (!re.test(ctx.output)) {
        ctx.issues.push({
          path: ctx.path,
          message: `Invalid ${formatName}`,
        });
        return BREAK;
      }
    }
  };
}

export const email = createFormatValidator(standardRegex.email, "email");
export const uuid = createFormatValidator(standardRegex.uuid, "uuid");
export const url = createFormatValidator(standardRegex.url, "URL");
export const emoji = createFormatValidator(standardRegex.emoji, "emoji");
export const base64 = createFormatValidator(standardRegex.base64, "base64");
export const base64url = createFormatValidator(
  standardRegex.base64url,
  "base64url"
);
export const cuid = createFormatValidator(standardRegex.cuid, "cuid");
export const cuid2 = createFormatValidator(standardRegex.cuid2, "cuid2");
export const ulid = createFormatValidator(standardRegex.ulid, "ulid");
export const ipv4 = createFormatValidator(standardRegex.ipv4, "IPv4 address");
export const ipv6 = createFormatValidator(standardRegex.ipv6, "IPv6 address");
export const cidrv4 = createFormatValidator(standardRegex.cidrv4, "IPv4 CIDR");
export const cidrv6 = createFormatValidator(standardRegex.cidrv6, "IPv6 CIDR");
export const isoDate = createFormatValidator(standardRegex.isoDate, "ISO Date");
export const isoTime = createFormatValidator(standardRegex.isoTime, "ISO Time");
export const isoDateTime = createFormatValidator(
  standardRegex.isoDateTime,
  "ISO DateTime"
);
export const isoDuration = createFormatValidator(
  standardRegex.isoDuration,
  "ISO Duration"
);
export const nanoid = createFormatValidator(/^[a-zA-Z0-9_-]+$/, "nanoid");

export const datetime = createFormatValidator(
  standardRegex.isoDateTime,
  "datetime"
);

export function ip(
  options?: { version?: "v4" | "v6" } | undefined
): ValidationStep {
  return (ctx: ValidationPipelineContext) => {
    if (typeof ctx.output !== "string") return;

    const v4 = standardRegex.ipv4.test(ctx.output);
    const v6 = standardRegex.ipv6.test(ctx.output);

    if (options?.version === "v4" && !v4) {
      ctx.issues.push({ path: ctx.path, message: "Invalid IPv4 address" });
    } else if (options?.version === "v6" && !v6) {
      ctx.issues.push({ path: ctx.path, message: "Invalid IPv6 address" });
    } else if (!options?.version && !v4 && !v6) {
      ctx.issues.push({ path: ctx.path, message: "Invalid IP address" });
    }
  };
}

// #endregion

// #region Transforms

export const trim: ValidationStep = (ctx: ValidationPipelineContext) => {
  if (typeof ctx.output === "string") {
    ctx.output = ctx.output.trim();
  }
};

export const toLowerCase: ValidationStep = (ctx: ValidationPipelineContext) => {
  if (typeof ctx.output === "string") {
    ctx.output = ctx.output.toLowerCase();
  }
};

export const toUpperCase: ValidationStep = (ctx: ValidationPipelineContext) => {
  if (typeof ctx.output === "string") {
    ctx.output = ctx.output.toUpperCase();
  }
};

// #endregion
