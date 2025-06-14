"use strict";
/**
 * This is the main entry point for the Zod Graph DB library itself.
 * It's intended to be used by the generated code, not directly by the end-user.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = void 0;
// The createClient function will be moved to its own file.
var client_1 = require("./runtime/client");
Object.defineProperty(exports, "createClient", { enumerable: true, get: function () { return client_1.createClient; } });
