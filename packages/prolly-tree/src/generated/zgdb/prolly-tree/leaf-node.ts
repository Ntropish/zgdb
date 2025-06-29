// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

import { Entry } from '../../zgdb/prolly-tree/entry.js';


export class LeafNode {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):LeafNode {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsLeafNode(bb:flatbuffers.ByteBuffer, obj?:LeafNode):LeafNode {
  return (obj || new LeafNode()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsLeafNode(bb:flatbuffers.ByteBuffer, obj?:LeafNode):LeafNode {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new LeafNode()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

entries(index: number, obj?:Entry):Entry|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new Entry()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

entriesLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startLeafNode(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addEntries(builder:flatbuffers.Builder, entriesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, entriesOffset, 0);
}

static createEntriesVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startEntriesVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endLeafNode(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createLeafNode(builder:flatbuffers.Builder, entriesOffset:flatbuffers.Offset):flatbuffers.Offset {
  LeafNode.startLeafNode(builder);
  LeafNode.addEntries(builder, entriesOffset);
  return LeafNode.endLeafNode(builder);
}
}
