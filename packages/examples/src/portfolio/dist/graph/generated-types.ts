import type { PortfolioData, StockData, HoldingData, TradeData } from './generated-serializers.js';

export type NodeDataTypeMap = {
  'portfolio': PortfolioData;
  'stock': StockData;
  'holding': HoldingData;
  'trade': TradeData;
};
