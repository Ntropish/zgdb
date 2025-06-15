import { Builder, ByteBuffer } from 'flatbuffers';
import { z } from 'zod';
import { Portfolio } from './graph-db/portfolio.js';
import { Stock } from './graph-db/stock.js';
import { Holding } from './graph-db/holding.js';
import { Trade } from './graph-db/trade.js';
import GraphSchema from './graph-schema.js';

// ============================================
//  Node Data Types
// ============================================
export type PortfolioData = {
  id: string;
  type: 'portfolio';
  createdAt: number;
  updatedAt: number;
  fields: z.infer<typeof GraphSchema.portfolio['fields']>;
  relationIds: {
    holdings: string[];
    trades: string[];
  };
};

export type StockData = {
  id: string;
  type: 'stock';
  createdAt: number;
  updatedAt: number;
  fields: z.infer<typeof GraphSchema.stock['fields']>;
  relationIds: {
    holdings: string[];
    trades: string[];
  };
};

export type HoldingData = {
  id: string;
  type: 'holding';
  createdAt: number;
  updatedAt: number;
  fields: z.infer<typeof GraphSchema.holding['fields']>;
  relationIds: {
    portfolio: string;
    stock: string;
  };
};

export type TradeData = {
  id: string;
  type: 'trade';
  createdAt: number;
  updatedAt: number;
  fields: z.infer<typeof GraphSchema.trade['fields']>;
  relationIds: {
    portfolio: string;
    stock: string;
  };
};


// ============================================
//  Supported Node Types
// ============================================
export const supportedNodeTypes = ['portfolio', 'stock', 'holding', 'trade'] as const;

// ============================================
//  Serialize Logic
// ============================================
export const serializeNode = {
  portfolio: (node: PortfolioData): Uint8Array => {
    const builder = new Builder(1024);
    const idOffset = builder.createString(node.id);
    const nameOffset = builder.createString(node.fields.name || '');
    const holdingsIdOffsets = (node.relationIds.holdings || []).map(id => builder.createString(id));
    const holdingsIdsVectorOffset = Portfolio.createHoldingsIdsVector(builder, holdingsIdOffsets);
    const tradesIdOffsets = (node.relationIds.trades || []).map(id => builder.createString(id));
    const tradesIdsVectorOffset = Portfolio.createTradesIdsVector(builder, tradesIdOffsets);

    Portfolio.startPortfolio(builder);
    Portfolio.addId(builder, idOffset);
    Portfolio.addCreatedAt(builder, BigInt(node.createdAt));
    Portfolio.addUpdatedAt(builder, BigInt(node.updatedAt));
    Portfolio.addName(builder, nameOffset);
    Portfolio.addCashBalance(builder, node.fields.cashBalance);
    Portfolio.addHoldingsIds(builder, holdingsIdsVectorOffset);
    Portfolio.addTradesIds(builder, tradesIdsVectorOffset);
    const portfolioOffset = Portfolio.endPortfolio(builder);
    builder.finish(portfolioOffset);
    return builder.asUint8Array();
  },
  stock: (node: StockData): Uint8Array => {
    const builder = new Builder(1024);
    const idOffset = builder.createString(node.id);
    const tickerOffset = builder.createString(node.fields.ticker || '');
    const companyNameOffset = builder.createString(node.fields.companyName || '');
    const holdingsIdOffsets = (node.relationIds.holdings || []).map(id => builder.createString(id));
    const holdingsIdsVectorOffset = Stock.createHoldingsIdsVector(builder, holdingsIdOffsets);
    const tradesIdOffsets = (node.relationIds.trades || []).map(id => builder.createString(id));
    const tradesIdsVectorOffset = Stock.createTradesIdsVector(builder, tradesIdOffsets);

    Stock.startStock(builder);
    Stock.addId(builder, idOffset);
    Stock.addCreatedAt(builder, BigInt(node.createdAt));
    Stock.addUpdatedAt(builder, BigInt(node.updatedAt));
    Stock.addTicker(builder, tickerOffset);
    Stock.addCompanyName(builder, companyNameOffset);
    Stock.addCurrentPrice(builder, node.fields.currentPrice);
    Stock.addHoldingsIds(builder, holdingsIdsVectorOffset);
    Stock.addTradesIds(builder, tradesIdsVectorOffset);
    const stockOffset = Stock.endStock(builder);
    builder.finish(stockOffset);
    return builder.asUint8Array();
  },
  holding: (node: HoldingData): Uint8Array => {
    const builder = new Builder(1024);
    const idOffset = builder.createString(node.id);
    const portfolioIdOffsets = (node.relationIds.portfolio ? [node.relationIds.portfolio] : []).map(id => builder.createString(id));
    const portfolioIdsVectorOffset = Holding.createPortfolioIdsVector(builder, portfolioIdOffsets);
    const stockIdOffsets = (node.relationIds.stock ? [node.relationIds.stock] : []).map(id => builder.createString(id));
    const stockIdsVectorOffset = Holding.createStockIdsVector(builder, stockIdOffsets);

    Holding.startHolding(builder);
    Holding.addId(builder, idOffset);
    Holding.addCreatedAt(builder, BigInt(node.createdAt));
    Holding.addUpdatedAt(builder, BigInt(node.updatedAt));
    Holding.addShares(builder, node.fields.shares);
    Holding.addPortfolioIds(builder, portfolioIdsVectorOffset);
    Holding.addStockIds(builder, stockIdsVectorOffset);
    const holdingOffset = Holding.endHolding(builder);
    builder.finish(holdingOffset);
    return builder.asUint8Array();
  },
  trade: (node: TradeData): Uint8Array => {
    const builder = new Builder(1024);
    const idOffset = builder.createString(node.id);
    const typeOffset = builder.createString(node.fields.type || '');
    const portfolioIdOffsets = (node.relationIds.portfolio ? [node.relationIds.portfolio] : []).map(id => builder.createString(id));
    const portfolioIdsVectorOffset = Trade.createPortfolioIdsVector(builder, portfolioIdOffsets);
    const stockIdOffsets = (node.relationIds.stock ? [node.relationIds.stock] : []).map(id => builder.createString(id));
    const stockIdsVectorOffset = Trade.createStockIdsVector(builder, stockIdOffsets);

    Trade.startTrade(builder);
    Trade.addId(builder, idOffset);
    Trade.addCreatedAt(builder, BigInt(node.createdAt));
    Trade.addUpdatedAt(builder, BigInt(node.updatedAt));
    Trade.addType(builder, typeOffset);
    Trade.addShares(builder, node.fields.shares);
    Trade.addPricePerShare(builder, node.fields.pricePerShare);
    Trade.addTimestamp(builder, node.fields.timestamp);
    Trade.addPortfolioIds(builder, portfolioIdsVectorOffset);
    Trade.addStockIds(builder, stockIdsVectorOffset);
    const tradeOffset = Trade.endTrade(builder);
    builder.finish(tradeOffset);
    return builder.asUint8Array();
  },
};

// ============================================
//  Deserialize Logic
// ============================================
export const deserializeNode = {
  portfolio: (buffer: Uint8Array): PortfolioData => {
    const byteBuffer = new ByteBuffer(buffer);
    const node = Portfolio.getRootAsPortfolio(byteBuffer);
    const fields: any = {};
    fields.name = node.name();
    fields.cashBalance = node.cashBalance();
    const relationIds: any = {};
    const holdingsIds = Array.from({ length: node.holdingsIdsLength() }, (_, i) => node.holdingsIds(i));
    relationIds.holdings = holdingsIds;
    const tradesIds = Array.from({ length: node.tradesIdsLength() }, (_, i) => node.tradesIds(i));
    relationIds.trades = tradesIds;
    return {
      id: node.id()!,
      type: 'portfolio',
      createdAt: Number(node.createdAt()),
      updatedAt: Number(node.updatedAt()),
      fields: fields as PortfolioData['fields'],
      relationIds: relationIds as PortfolioData['relationIds'],
    };
  },
  stock: (buffer: Uint8Array): StockData => {
    const byteBuffer = new ByteBuffer(buffer);
    const node = Stock.getRootAsStock(byteBuffer);
    const fields: any = {};
    fields.ticker = node.ticker();
    fields.companyName = node.companyName();
    fields.currentPrice = node.currentPrice();
    const relationIds: any = {};
    const holdingsIds = Array.from({ length: node.holdingsIdsLength() }, (_, i) => node.holdingsIds(i));
    relationIds.holdings = holdingsIds;
    const tradesIds = Array.from({ length: node.tradesIdsLength() }, (_, i) => node.tradesIds(i));
    relationIds.trades = tradesIds;
    return {
      id: node.id()!,
      type: 'stock',
      createdAt: Number(node.createdAt()),
      updatedAt: Number(node.updatedAt()),
      fields: fields as StockData['fields'],
      relationIds: relationIds as StockData['relationIds'],
    };
  },
  holding: (buffer: Uint8Array): HoldingData => {
    const byteBuffer = new ByteBuffer(buffer);
    const node = Holding.getRootAsHolding(byteBuffer);
    const fields: any = {};
    fields.shares = node.shares();
    const relationIds: any = {};
    const portfolioIds = Array.from({ length: node.portfolioIdsLength() }, (_, i) => node.portfolioIds(i));
    relationIds.portfolio = portfolioIds[0] || '';
    const stockIds = Array.from({ length: node.stockIdsLength() }, (_, i) => node.stockIds(i));
    relationIds.stock = stockIds[0] || '';
    return {
      id: node.id()!,
      type: 'holding',
      createdAt: Number(node.createdAt()),
      updatedAt: Number(node.updatedAt()),
      fields: fields as HoldingData['fields'],
      relationIds: relationIds as HoldingData['relationIds'],
    };
  },
  trade: (buffer: Uint8Array): TradeData => {
    const byteBuffer = new ByteBuffer(buffer);
    const node = Trade.getRootAsTrade(byteBuffer);
    const fields: any = {};
    fields.type = node.type();
    fields.shares = node.shares();
    fields.pricePerShare = node.pricePerShare();
    fields.timestamp = node.timestamp();
    const relationIds: any = {};
    const portfolioIds = Array.from({ length: node.portfolioIdsLength() }, (_, i) => node.portfolioIds(i));
    relationIds.portfolio = portfolioIds[0] || '';
    const stockIds = Array.from({ length: node.stockIdsLength() }, (_, i) => node.stockIds(i));
    relationIds.stock = stockIds[0] || '';
    return {
      id: node.id()!,
      type: 'trade',
      createdAt: Number(node.createdAt()),
      updatedAt: Number(node.updatedAt()),
      fields: fields as TradeData['fields'],
      relationIds: relationIds as TradeData['relationIds'],
    };
  },
};