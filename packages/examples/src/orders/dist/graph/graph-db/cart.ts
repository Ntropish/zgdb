// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

export class Cart {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):Cart {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsCart(bb:flatbuffers.ByteBuffer, obj?:Cart):Cart {
  return (obj || new Cart()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsCart(bb:flatbuffers.ByteBuffer, obj?:Cart):Cart {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new Cart()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

id():string|null
id(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
id(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

itemsJson():string|null
itemsJson(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
itemsJson(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

status():string|null
status(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
status(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

customerIds(index: number):string
customerIds(index: number,optionalEncoding:flatbuffers.Encoding):string|Uint8Array
customerIds(index: number,optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__string(this.bb!.__vector(this.bb_pos + offset) + index * 4, optionalEncoding) : null;
}

customerIdsLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

discountIds(index: number):string
discountIds(index: number,optionalEncoding:flatbuffers.Encoding):string|Uint8Array
discountIds(index: number,optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.__string(this.bb!.__vector(this.bb_pos + offset) + index * 4, optionalEncoding) : null;
}

discountIdsLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

createdAt():bigint {
  const offset = this.bb!.__offset(this.bb_pos, 14);
  return offset ? this.bb!.readInt64(this.bb_pos + offset) : BigInt('0');
}

updatedAt():bigint {
  const offset = this.bb!.__offset(this.bb_pos, 16);
  return offset ? this.bb!.readInt64(this.bb_pos + offset) : BigInt('0');
}

static startCart(builder:flatbuffers.Builder) {
  builder.startObject(7);
}

static addId(builder:flatbuffers.Builder, idOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, idOffset, 0);
}

static addItemsJson(builder:flatbuffers.Builder, itemsJsonOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, itemsJsonOffset, 0);
}

static addStatus(builder:flatbuffers.Builder, statusOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, statusOffset, 0);
}

static addCustomerIds(builder:flatbuffers.Builder, customerIdsOffset:flatbuffers.Offset) {
  builder.addFieldOffset(3, customerIdsOffset, 0);
}

static createCustomerIdsVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startCustomerIdsVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static addDiscountIds(builder:flatbuffers.Builder, discountIdsOffset:flatbuffers.Offset) {
  builder.addFieldOffset(4, discountIdsOffset, 0);
}

static createDiscountIdsVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startDiscountIdsVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static addCreatedAt(builder:flatbuffers.Builder, createdAt:bigint) {
  builder.addFieldInt64(5, createdAt, BigInt('0'));
}

static addUpdatedAt(builder:flatbuffers.Builder, updatedAt:bigint) {
  builder.addFieldInt64(6, updatedAt, BigInt('0'));
}

static endCart(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  builder.requiredField(offset, 4) // id
  return offset;
}

static createCart(builder:flatbuffers.Builder, idOffset:flatbuffers.Offset, itemsJsonOffset:flatbuffers.Offset, statusOffset:flatbuffers.Offset, customerIdsOffset:flatbuffers.Offset, discountIdsOffset:flatbuffers.Offset, createdAt:bigint, updatedAt:bigint):flatbuffers.Offset {
  Cart.startCart(builder);
  Cart.addId(builder, idOffset);
  Cart.addItemsJson(builder, itemsJsonOffset);
  Cart.addStatus(builder, statusOffset);
  Cart.addCustomerIds(builder, customerIdsOffset);
  Cart.addDiscountIds(builder, discountIdsOffset);
  Cart.addCreatedAt(builder, createdAt);
  Cart.addUpdatedAt(builder, updatedAt);
  return Cart.endCart(builder);
}
}
