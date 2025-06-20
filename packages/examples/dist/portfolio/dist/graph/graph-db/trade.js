// automatically generated by the FlatBuffers compiler, do not modify
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import * as flatbuffers from 'flatbuffers';
export class Trade {
    bb = null;
    bb_pos = 0;
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsTrade(bb, obj) {
        return (obj || new Trade()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsTrade(bb, obj) {
        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
        return (obj || new Trade()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    id(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    type(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    shares() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0.0;
    }
    pricePerShare() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0.0;
    }
    timestamp() {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0.0;
    }
    portfolioIds(index, optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.__string(this.bb.__vector(this.bb_pos + offset) + index * 4, optionalEncoding) : null;
    }
    portfolioIdsLength() {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    stockIds(index, optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? this.bb.__string(this.bb.__vector(this.bb_pos + offset) + index * 4, optionalEncoding) : null;
    }
    stockIdsLength() {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    createdAt() {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt('0');
    }
    updatedAt() {
        const offset = this.bb.__offset(this.bb_pos, 20);
        return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt('0');
    }
    static startTrade(builder) {
        builder.startObject(9);
    }
    static addId(builder, idOffset) {
        builder.addFieldOffset(0, idOffset, 0);
    }
    static addType(builder, typeOffset) {
        builder.addFieldOffset(1, typeOffset, 0);
    }
    static addShares(builder, shares) {
        builder.addFieldFloat32(2, shares, 0.0);
    }
    static addPricePerShare(builder, pricePerShare) {
        builder.addFieldFloat32(3, pricePerShare, 0.0);
    }
    static addTimestamp(builder, timestamp) {
        builder.addFieldFloat32(4, timestamp, 0.0);
    }
    static addPortfolioIds(builder, portfolioIdsOffset) {
        builder.addFieldOffset(5, portfolioIdsOffset, 0);
    }
    static createPortfolioIdsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    }
    static startPortfolioIdsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addStockIds(builder, stockIdsOffset) {
        builder.addFieldOffset(6, stockIdsOffset, 0);
    }
    static createStockIdsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    }
    static startStockIdsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addCreatedAt(builder, createdAt) {
        builder.addFieldInt64(7, createdAt, BigInt('0'));
    }
    static addUpdatedAt(builder, updatedAt) {
        builder.addFieldInt64(8, updatedAt, BigInt('0'));
    }
    static endTrade(builder) {
        const offset = builder.endObject();
        builder.requiredField(offset, 4); // id
        return offset;
    }
    static createTrade(builder, idOffset, typeOffset, shares, pricePerShare, timestamp, portfolioIdsOffset, stockIdsOffset, createdAt, updatedAt) {
        Trade.startTrade(builder);
        Trade.addId(builder, idOffset);
        Trade.addType(builder, typeOffset);
        Trade.addShares(builder, shares);
        Trade.addPricePerShare(builder, pricePerShare);
        Trade.addTimestamp(builder, timestamp);
        Trade.addPortfolioIds(builder, portfolioIdsOffset);
        Trade.addStockIds(builder, stockIdsOffset);
        Trade.addCreatedAt(builder, createdAt);
        Trade.addUpdatedAt(builder, updatedAt);
        return Trade.endTrade(builder);
    }
}
