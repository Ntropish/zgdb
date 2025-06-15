import * as flatbuffers from 'flatbuffers';
export declare class Familiar {
    bb: flatbuffers.ByteBuffer | null;
    bb_pos: number;
    __init(i: number, bb: flatbuffers.ByteBuffer): Familiar;
    static getRootAsFamiliar(bb: flatbuffers.ByteBuffer, obj?: Familiar): Familiar;
    static getSizePrefixedRootAsFamiliar(bb: flatbuffers.ByteBuffer, obj?: Familiar): Familiar;
    id(): string | null;
    id(optionalEncoding: flatbuffers.Encoding): string | Uint8Array | null;
    name(): string | null;
    name(optionalEncoding: flatbuffers.Encoding): string | Uint8Array | null;
    age(): number;
    userIds(index: number): string;
    userIds(index: number, optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
    userIdsLength(): number;
    createdAt(): bigint;
    updatedAt(): bigint;
    static startFamiliar(builder: flatbuffers.Builder): void;
    static addId(builder: flatbuffers.Builder, idOffset: flatbuffers.Offset): void;
    static addName(builder: flatbuffers.Builder, nameOffset: flatbuffers.Offset): void;
    static addAge(builder: flatbuffers.Builder, age: number): void;
    static addUserIds(builder: flatbuffers.Builder, userIdsOffset: flatbuffers.Offset): void;
    static createUserIdsVector(builder: flatbuffers.Builder, data: flatbuffers.Offset[]): flatbuffers.Offset;
    static startUserIdsVector(builder: flatbuffers.Builder, numElems: number): void;
    static addCreatedAt(builder: flatbuffers.Builder, createdAt: bigint): void;
    static addUpdatedAt(builder: flatbuffers.Builder, updatedAt: bigint): void;
    static endFamiliar(builder: flatbuffers.Builder): flatbuffers.Offset;
    static createFamiliar(builder: flatbuffers.Builder, idOffset: flatbuffers.Offset, nameOffset: flatbuffers.Offset, age: number, userIdsOffset: flatbuffers.Offset, createdAt: bigint, updatedAt: bigint): flatbuffers.Offset;
}
