import * as flatbuffers from 'flatbuffers';
export declare class PostTagEdge {
    bb: flatbuffers.ByteBuffer | null;
    bb_pos: number;
    __init(i: number, bb: flatbuffers.ByteBuffer): PostTagEdge;
    static getRootAsPostTagEdge(bb: flatbuffers.ByteBuffer, obj?: PostTagEdge): PostTagEdge;
    static getSizePrefixedRootAsPostTagEdge(bb: flatbuffers.ByteBuffer, obj?: PostTagEdge): PostTagEdge;
    id(): string | null;
    id(optionalEncoding: flatbuffers.Encoding): string | Uint8Array | null;
    postId(): string | null;
    postId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array | null;
    tagId(): string | null;
    tagId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array | null;
    createdAt(): bigint;
    static startPostTagEdge(builder: flatbuffers.Builder): void;
    static addId(builder: flatbuffers.Builder, idOffset: flatbuffers.Offset): void;
    static addPostId(builder: flatbuffers.Builder, postIdOffset: flatbuffers.Offset): void;
    static addTagId(builder: flatbuffers.Builder, tagIdOffset: flatbuffers.Offset): void;
    static addCreatedAt(builder: flatbuffers.Builder, createdAt: bigint): void;
    static endPostTagEdge(builder: flatbuffers.Builder): flatbuffers.Offset;
    static createPostTagEdge(builder: flatbuffers.Builder, idOffset: flatbuffers.Offset, postIdOffset: flatbuffers.Offset, tagIdOffset: flatbuffers.Offset, createdAt: bigint): flatbuffers.Offset;
}
