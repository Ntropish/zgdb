import { produce, Draft } from "@zgdb/runtime";
import { ulid } from "@zgdb/runtime";
import { z } from "@zgdb/runtime";
import GraphSchema from "./graph-schema.js";
import type {
  PortfolioData,
  StockData,
  HoldingData,
  TradeData,
} from "./generated-serializers.js";

// --- Async Helpers ---
export const createNodeData = {
  portfolio: (data: {
    fields: PortfolioData["fields"];
    relationIds: PortfolioData["relationIds"];
  }): PortfolioData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: "portfolio",
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  stock: (data: {
    fields: StockData["fields"];
    relationIds: StockData["relationIds"];
  }): StockData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: "stock",
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  holding: (data: {
    fields: HoldingData["fields"];
    relationIds: HoldingData["relationIds"];
  }): HoldingData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: "holding",
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  trade: (data: {
    fields: TradeData["fields"];
    relationIds: TradeData["relationIds"];
  }): TradeData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: "trade",
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
};

export const updateNodeData = {
  portfolio: (
    base: PortfolioData,
    recipe: (draft: Draft<PortfolioData>) => void
  ): PortfolioData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  stock: (
    base: StockData,
    recipe: (draft: Draft<StockData>) => void
  ): StockData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  holding: (
    base: HoldingData,
    recipe: (draft: Draft<HoldingData>) => void
  ): HoldingData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  trade: (
    base: TradeData,
    recipe: (draft: Draft<TradeData>) => void
  ): TradeData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
};

// --- Sync Helpers ---
export const createNodeDataSync = {
  portfolio: (data: {
    fields: PortfolioData["fields"];
    relationIds: PortfolioData["relationIds"];
  }): PortfolioData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: "portfolio",
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  stock: (data: {
    fields: StockData["fields"];
    relationIds: StockData["relationIds"];
  }): StockData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: "stock",
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  holding: (data: {
    fields: HoldingData["fields"];
    relationIds: HoldingData["relationIds"];
  }): HoldingData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: "holding",
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  trade: (data: {
    fields: TradeData["fields"];
    relationIds: TradeData["relationIds"];
  }): TradeData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: "trade",
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
};

export const updateNodeDataSync = {
  portfolio: (
    base: PortfolioData,
    recipe: (draft: Draft<PortfolioData>) => void
  ): PortfolioData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  stock: (
    base: StockData,
    recipe: (draft: Draft<StockData>) => void
  ): StockData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  holding: (
    base: HoldingData,
    recipe: (draft: Draft<HoldingData>) => void
  ): HoldingData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  trade: (
    base: TradeData,
    recipe: (draft: Draft<TradeData>) => void
  ): TradeData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
};
