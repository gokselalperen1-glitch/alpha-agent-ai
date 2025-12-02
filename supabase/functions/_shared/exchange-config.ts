// Shared configuration for exchanges and data providers

export interface ExchangeConfig {
  name: string;
  ccxtId: string;
  features: {
    spot: boolean;
    margin: boolean;
    futures: boolean;
    testnet: boolean;
  };
  requirements: {
    apiKey: boolean;
    apiSecret: boolean;
    passphrase: boolean;
    uid?: boolean;
  };
  tradingRules: {
    minOrderValue: number;
    maxLeverage: number;
    supportedOrderTypes: string[];
  };
  rateLimit: {
    requestsPerSecond: number;
    ordersPerSecond: number;
  };
  supportedAssets?: string[];
  baseCurrencies?: string[];
}

export const SUPPORTED_EXCHANGES: Record<string, ExchangeConfig> = {
  binance: {
    name: 'Binance',
    ccxtId: 'binance',
    features: {
      spot: true,
      margin: false,
      futures: false,
      testnet: true,
    },
    requirements: {
      apiKey: true,
      apiSecret: true,
      passphrase: false,
    },
    tradingRules: {
      minOrderValue: 10,
      maxLeverage: 1,
      supportedOrderTypes: ['market', 'limit'],
    },
    rateLimit: {
      requestsPerSecond: 10,
      ordersPerSecond: 5,
    },
    supportedAssets: ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'MATIC', 'DOT', 'AVAX'],
    baseCurrencies: ['USDT', 'USDC', 'BUSD'],
  },
  coinbase: {
    name: 'Coinbase',
    ccxtId: 'coinbase',
    features: {
      spot: true,
      margin: false,
      futures: false,
      testnet: true,
    },
    requirements: {
      apiKey: true,
      apiSecret: true,
      passphrase: true,
    },
    tradingRules: {
      minOrderValue: 1,
      maxLeverage: 1,
      supportedOrderTypes: ['market', 'limit'],
    },
    rateLimit: {
      requestsPerSecond: 10,
      ordersPerSecond: 5,
    },
    supportedAssets: ['BTC', 'ETH', 'SOL', 'USDC', 'DOGE'],
    baseCurrencies: ['USD', 'USDC'],
  },
  kraken: {
    name: 'Kraken',
    ccxtId: 'kraken',
    features: {
      spot: true,
      margin: false,
      futures: false,
      testnet: true,
    },
    requirements: {
      apiKey: true,
      apiSecret: true,
      passphrase: false,
    },
    tradingRules: {
      minOrderValue: 5,
      maxLeverage: 1,
      supportedOrderTypes: ['market', 'limit'],
    },
    rateLimit: {
      requestsPerSecond: 10,
      ordersPerSecond: 5,
    },
    supportedAssets: ['BTC', 'ETH', 'XRP', 'ADA', 'SOL', 'DOT'],
    baseCurrencies: ['USD', 'USDT'],
  },
  bybit: {
    name: 'Bybit',
    ccxtId: 'bybit',
    features: {
      spot: true,
      margin: false,
      futures: true,
      testnet: true,
    },
    requirements: {
      apiKey: true,
      apiSecret: true,
      passphrase: false,
    },
    tradingRules: {
      minOrderValue: 10,
      maxLeverage: 1,
      supportedOrderTypes: ['market', 'limit'],
    },
    rateLimit: {
      requestsPerSecond: 10,
      ordersPerSecond: 5,
    },
    supportedAssets: ['BTC', 'ETH', 'SOL', 'XRP'],
    baseCurrencies: ['USDT', 'USDC'],
  },
  kucoin: {
    name: 'KuCoin',
    ccxtId: 'kucoin',
    features: {
      spot: true,
      margin: false,
      futures: false,
      testnet: true,
    },
    requirements: {
      apiKey: true,
      apiSecret: true,
      passphrase: true,
    },
    tradingRules: {
      minOrderValue: 1,
      maxLeverage: 1,
      supportedOrderTypes: ['market', 'limit'],
    },
    rateLimit: {
      requestsPerSecond: 10,
      ordersPerSecond: 5,
    },
    supportedAssets: ['BTC', 'ETH', 'KCS', 'USDT'],
    baseCurrencies: ['USDT', 'USDC'],
  },
  okx: {
    name: 'OKX',
    ccxtId: 'okx',
    features: {
      spot: true,
      margin: false,
      futures: true,
      testnet: true,
    },
    requirements: {
      apiKey: true,
      apiSecret: true,
      passphrase: true,
    },
    tradingRules: {
      minOrderValue: 10,
      maxLeverage: 1,
      supportedOrderTypes: ['market', 'limit'],
    },
    rateLimit: {
      requestsPerSecond: 10,
      ordersPerSecond: 5,
    },
    supportedAssets: ['BTC', 'ETH', 'OKB', 'SOL'],
    baseCurrencies: ['USDT', 'USDC'],
  },
};

export interface DataProviderConfig {
  name: string;
  secretKey: string | null;
  rateLimit: {
    free: number;
    paid?: number;
  };
  capabilities: string[];
  actions: string[];
}

export const DATA_PROVIDERS: Record<string, DataProviderConfig> = {
  polygon: {
    name: 'Polygon.io',
    secretKey: 'POLYGON_API_KEY',
    rateLimit: {
      free: 5,
      paid: 100,
    },
    capabilities: ['stocks', 'forex', 'crypto', 'options'],
    actions: ['quote', 'aggregates', 'trades', 'snapshots'],
  },
  alphavantage: {
    name: 'Alpha Vantage',
    secretKey: 'ALPHAVANTAGE_API_KEY',
    rateLimit: {
      free: 5,
      paid: 75,
    },
    capabilities: ['stocks', 'forex', 'crypto', 'technicals', 'fundamentals'],
    actions: ['technical-indicator', 'quote', 'fundamentals', 'forex'],
  },
  finnhub: {
    name: 'Finnhub',
    secretKey: 'FINNHUB_API_KEY',
    rateLimit: {
      free: 60,
      paid: 300,
    },
    capabilities: ['stocks', 'forex', 'crypto', 'news', 'fundamentals'],
    actions: ['quote', 'company-profile', 'news', 'basic-financials', 'earnings'],
  },
  stocktwits: {
    name: 'StockTwits',
    secretKey: null,
    rateLimit: {
      free: 200,
    },
    capabilities: ['sentiment'],
    actions: ['stream', 'trending'],
  },
};

export const SAFETY_RULES = {
  maxSingleTradePercent: 5,
  maxDailyTrades: 50,
  maxDailyLossPercent: 10,
  requirePaperTradingFirst: true,
  minPaperTradesRequired: 10,
  cooldownAfterLoss: 300,
};
