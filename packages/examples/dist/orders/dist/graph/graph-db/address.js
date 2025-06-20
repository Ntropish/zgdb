// automatically generated by the FlatBuffers compiler, do not modify
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import * as flatbuffers from 'flatbuffers';
export class Address {
    bb = null;
    bb_pos = 0;
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsAddress(bb, obj) {
        return (obj || new Address()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsAddress(bb, obj) {
        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
        return (obj || new Address()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    id(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    type(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    street(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    city(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    zip(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    customerIds(index, optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.__string(this.bb.__vector(this.bb_pos + offset) + index * 4, optionalEncoding) : null;
    }
    customerIdsLength() {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    createdAt() {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt('0');
    }
    updatedAt() {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt('0');
    }
    static startAddress(builder) {
        builder.startObject(8);
    }
    static addId(builder, idOffset) {
        builder.addFieldOffset(0, idOffset, 0);
    }
    static addType(builder, typeOffset) {
        builder.addFieldOffset(1, typeOffset, 0);
    }
    static addStreet(builder, streetOffset) {
        builder.addFieldOffset(2, streetOffset, 0);
    }
    static addCity(builder, cityOffset) {
        builder.addFieldOffset(3, cityOffset, 0);
    }
    static addZip(builder, zipOffset) {
        builder.addFieldOffset(4, zipOffset, 0);
    }
    static addCustomerIds(builder, customerIdsOffset) {
        builder.addFieldOffset(5, customerIdsOffset, 0);
    }
    static createCustomerIdsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    }
    static startCustomerIdsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addCreatedAt(builder, createdAt) {
        builder.addFieldInt64(6, createdAt, BigInt('0'));
    }
    static addUpdatedAt(builder, updatedAt) {
        builder.addFieldInt64(7, updatedAt, BigInt('0'));
    }
    static endAddress(builder) {
        const offset = builder.endObject();
        builder.requiredField(offset, 4); // id
        return offset;
    }
    static createAddress(builder, idOffset, typeOffset, streetOffset, cityOffset, zipOffset, customerIdsOffset, createdAt, updatedAt) {
        Address.startAddress(builder);
        Address.addId(builder, idOffset);
        Address.addType(builder, typeOffset);
        Address.addStreet(builder, streetOffset);
        Address.addCity(builder, cityOffset);
        Address.addZip(builder, zipOffset);
        Address.addCustomerIds(builder, customerIdsOffset);
        Address.addCreatedAt(builder, createdAt);
        Address.addUpdatedAt(builder, updatedAt);
        return Address.endAddress(builder);
    }
}
