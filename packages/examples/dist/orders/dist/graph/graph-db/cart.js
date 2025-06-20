// automatically generated by the FlatBuffers compiler, do not modify
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import * as flatbuffers from 'flatbuffers';
export class Cart {
    bb = null;
    bb_pos = 0;
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsCart(bb, obj) {
        return (obj || new Cart()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsCart(bb, obj) {
        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
        return (obj || new Cart()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    id(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    itemsJson(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    status(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    customerIds(index, optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.__string(this.bb.__vector(this.bb_pos + offset) + index * 4, optionalEncoding) : null;
    }
    customerIdsLength() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    discountIds(index, optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.__string(this.bb.__vector(this.bb_pos + offset) + index * 4, optionalEncoding) : null;
    }
    discountIdsLength() {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    createdAt() {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt('0');
    }
    updatedAt() {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt('0');
    }
    static startCart(builder) {
        builder.startObject(7);
    }
    static addId(builder, idOffset) {
        builder.addFieldOffset(0, idOffset, 0);
    }
    static addItemsJson(builder, itemsJsonOffset) {
        builder.addFieldOffset(1, itemsJsonOffset, 0);
    }
    static addStatus(builder, statusOffset) {
        builder.addFieldOffset(2, statusOffset, 0);
    }
    static addCustomerIds(builder, customerIdsOffset) {
        builder.addFieldOffset(3, customerIdsOffset, 0);
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
    static addDiscountIds(builder, discountIdsOffset) {
        builder.addFieldOffset(4, discountIdsOffset, 0);
    }
    static createDiscountIdsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    }
    static startDiscountIdsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addCreatedAt(builder, createdAt) {
        builder.addFieldInt64(5, createdAt, BigInt('0'));
    }
    static addUpdatedAt(builder, updatedAt) {
        builder.addFieldInt64(6, updatedAt, BigInt('0'));
    }
    static endCart(builder) {
        const offset = builder.endObject();
        builder.requiredField(offset, 4); // id
        return offset;
    }
    static createCart(builder, idOffset, itemsJsonOffset, statusOffset, customerIdsOffset, discountIdsOffset, createdAt, updatedAt) {
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
