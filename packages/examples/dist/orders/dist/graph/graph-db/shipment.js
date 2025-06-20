// automatically generated by the FlatBuffers compiler, do not modify
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import * as flatbuffers from 'flatbuffers';
export class Shipment {
    bb = null;
    bb_pos = 0;
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsShipment(bb, obj) {
        return (obj || new Shipment()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsShipment(bb, obj) {
        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
        return (obj || new Shipment()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    id(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    address(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    status(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    orderIds(index, optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.__string(this.bb.__vector(this.bb_pos + offset) + index * 4, optionalEncoding) : null;
    }
    orderIdsLength() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    warehouseIds(index, optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.__string(this.bb.__vector(this.bb_pos + offset) + index * 4, optionalEncoding) : null;
    }
    warehouseIdsLength() {
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
    static startShipment(builder) {
        builder.startObject(7);
    }
    static addId(builder, idOffset) {
        builder.addFieldOffset(0, idOffset, 0);
    }
    static addAddress(builder, addressOffset) {
        builder.addFieldOffset(1, addressOffset, 0);
    }
    static addStatus(builder, statusOffset) {
        builder.addFieldOffset(2, statusOffset, 0);
    }
    static addOrderIds(builder, orderIdsOffset) {
        builder.addFieldOffset(3, orderIdsOffset, 0);
    }
    static createOrderIdsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    }
    static startOrderIdsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addWarehouseIds(builder, warehouseIdsOffset) {
        builder.addFieldOffset(4, warehouseIdsOffset, 0);
    }
    static createWarehouseIdsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    }
    static startWarehouseIdsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addCreatedAt(builder, createdAt) {
        builder.addFieldInt64(5, createdAt, BigInt('0'));
    }
    static addUpdatedAt(builder, updatedAt) {
        builder.addFieldInt64(6, updatedAt, BigInt('0'));
    }
    static endShipment(builder) {
        const offset = builder.endObject();
        builder.requiredField(offset, 4); // id
        return offset;
    }
    static createShipment(builder, idOffset, addressOffset, statusOffset, orderIdsOffset, warehouseIdsOffset, createdAt, updatedAt) {
        Shipment.startShipment(builder);
        Shipment.addId(builder, idOffset);
        Shipment.addAddress(builder, addressOffset);
        Shipment.addStatus(builder, statusOffset);
        Shipment.addOrderIds(builder, orderIdsOffset);
        Shipment.addWarehouseIds(builder, warehouseIdsOffset);
        Shipment.addCreatedAt(builder, createdAt);
        Shipment.addUpdatedAt(builder, updatedAt);
        return Shipment.endShipment(builder);
    }
}
