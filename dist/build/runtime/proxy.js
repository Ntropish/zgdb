"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNodeSetProxy = createNodeSetProxy;
exports.createNodeProxy = createNodeProxy;
const flatbuffers = __importStar(require("flatbuffers"));
const makeKey = (nodeType, id) => `${nodeType}/${id}`;
const textEncoder = new TextEncoder();
// --- Proxy for the Set-like object (e.g., zg.user) ---
function createNodeSetProxy(context, nodeType) {
    const nodeConfig = context.config.nodes[nodeType];
    return new Proxy({}, {
        get(target, prop, receiver) {
            if (prop === "add") {
                return (data) => {
                    const { db, config } = context;
                    const key = makeKey(nodeType, data.id);
                    const keyBytes = textEncoder.encode(key);
                    // Use the generated serializer
                    const builder = new flatbuffers.Builder(1024);
                    const dataOffset = nodeConfig.serialize(builder, data);
                    builder.finish(dataOffset);
                    const valueBytes = builder.asUint8Array();
                    db.insertSync(keyBytes, valueBytes);
                    // TODO: Update relationship indexes here
                    return createNodeProxy(context, nodeType, data.id);
                };
            }
            if (prop === "get") {
                return (id) => {
                    const key = makeKey(nodeType, id);
                    if (context.nodeCache.has(key))
                        return context.nodeCache.get(key);
                    const valueBytes = context.db.getSync(textEncoder.encode(key));
                    if (!valueBytes)
                        return null;
                    return createNodeProxy(context, nodeType, id);
                };
            }
            // TODO: Implement [Symbol.iterator] using a PTree scan/cursor
            // for `chain(zg.user)` to work.
            return Reflect.get(target, prop, receiver);
        },
    });
}
// --- Proxy for an individual node object (e.g., a specific user) ---
function createNodeProxy(context, nodeType, id) {
    const cacheKey = makeKey(nodeType, id);
    if (context.nodeCache.has(cacheKey)) {
        return context.nodeCache.get(cacheKey);
    }
    const nodeConfig = context.config.nodes[nodeType];
    const proxy = new Proxy({}, {
        get(target, prop, receiver) {
            if (prop === "id")
                return id;
            // Check if this is a defined relationship
            const relation = nodeConfig.relations[prop];
            if (relation) {
                // TODO: Implement relationship traversal logic using the schema
                // e.g., for `user.posts`, scan an index for posts with `author_id === user.id`
                console.warn(`Relationship traversal for '${prop}' not yet implemented.`);
                return relation.kind === "one-to-many" ? [] : null;
            }
            // Otherwise, assume it's a primitive property
            const keyBytes = textEncoder.encode(cacheKey);
            const valueBytes = context.db.getSync(keyBytes);
            if (!valueBytes)
                return null;
            // Use the generated deserializer
            const fbsObject = nodeConfig.deserialize(valueBytes);
            // Access the property on the FlatBuffers object
            if (typeof fbsObject[prop] === "function") {
                return fbsObject[prop]();
            }
            return null;
        },
    });
    context.nodeCache.set(cacheKey, proxy);
    return proxy;
}
