import * as flatbuffers from 'flatbuffers';
export declare class Tag {
    bb: flatbuffers.ByteBuffer | null;
    bb_pos: number;
    __init(i: number, bb: flatbuffers.ByteBuffer): Tag;
    static getRootAsTag(bb: flatbuffers.ByteBuffer, obj?: Tag): Tag;
    static getSizePrefixedRootAsTag(bb: flatbuffers.ByteBuffer, obj?: Tag): Tag;
    id(): string | null;
    id(optionalEncoding: flatbuffers.Encoding): string | Uint8Array | null;
    name(): string | null;
    name(optionalEncoding: flatbuffers.Encoding): string | Uint8Array | null;
    postsIds(index: number): string;
    postsIds(index: number, optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
    postsIdsLength(): number;
    createdAt(): bigint;
    updatedAt(): bigint;
    static startTag(builder: flatbuffers.Builder): void;
    static addId(builder: flatbuffers.Builder, idOffset: flatbuffers.Offset): void;
    static addName(builder: flatbuffers.Builder, nameOffset: flatbuffers.Offset): void;
    static addPostsIds(builder: flatbuffers.Builder, postsIdsOffset: flatbuffers.Offset): void;
    static createPostsIdsVector(builder: flatbuffers.Builder, data: flatbuffers.Offset[]): flatbuffers.Offset;
    static startPostsIdsVector(builder: flatbuffers.Builder, numElems: number): void;
    static addCreatedAt(builder: flatbuffers.Builder, createdAt: bigint): void;
    static addUpdatedAt(builder: flatbuffers.Builder, updatedAt: bigint): void;
    static endTag(builder: flatbuffers.Builder): flatbuffers.Offset;
    static createTag(builder: flatbuffers.Builder, idOffset: flatbuffers.Offset, nameOffset: flatbuffers.Offset, postsIdsOffset: flatbuffers.Offset, createdAt: bigint, updatedAt: bigint): flatbuffers.Offset;
}
