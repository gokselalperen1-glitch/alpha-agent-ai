import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TestRequest {
  brokerType: string;
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    authToken?: string;
    isTestnet?: boolean;
  };
}

async function testAlpacaConnection(apiKey: string, apiSecret: string, isTestnet: boolean): Promise<any> {
  const baseUrl = isTestnet
    ? "https://paper-api.alpaca.markets"
    : "https://api.alpaca.markets";

  const response = await fetch(`${baseUrl}/v2/account`, {
    method: "GET",
    headers: {
      "APCA-API-KEY-ID": apiKey,
      "APCA-API-SECRET-KEY": apiSecret,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to authenticate with Alpaca");
  }

  const data = await response.json();
  return {
    status: "connected",
    accountNumber: data.account_number,
    equity: data.equity,
    permissions: {
      read: true,
      trade: data.trading_status === "ACTIVE",
      withdraw: true,
    },
  };
}

async function testInteractiveBrokersConnection(authToken: string): Promise<any> {
  const response = await fetch("https://api.ibkr.com/accounts", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to authenticate with Interactive Brokers");
  }

  const data = await response.json();
  return {
    status: "connected",
    accounts: data.accounts?.length || 0,
    permissions: {
      read: true,
      trade: true,
      withdraw: false,
    },
  };
}

async function testTDAmeritradeConnection(authToken: string): Promise<any> {
  const response = await fetch("https://api.tdameritrade.com/v1/accounts", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to authenticate with TD Ameritrade");
  }

  const data = await response.json();
  return {
    status: "connected",
    accounts: Array.isArray(data) ? data.length : 1,
    permissions: {
      read: true,
      trade: true,
      withdraw: true,
    },
  };
}

async function testAladdinConnection(apiKey: string, apiSecret: string): Promise<any> {
  const response = await fetch("https://api.aladdin.com/v1/portfolio", {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      "X-API-Secret": apiSecret,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to authenticate with Aladdin");
  }

  return {
    status: "connected",
    permissions: {
      read: true,
      trade: false,
      withdraw: false,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: TestRequest = await req.json();
    const { brokerType, credentials } = body;

    let result: any;

    switch (brokerType) {
      case "alpaca":
        if (!credentials.apiKey || !credentials.apiSecret) {
          throw new Error("API Key and Secret required for Alpaca");
        }
        result = await testAlpacaConnection(
          credentials.apiKey,
          credentials.apiSecret,
          credentials.isTestnet || false
        );
        break;

      case "interactive_brokers":
        if (!credentials.authToken) {
          throw new Error("Auth token required for Interactive Brokers");
        }
        result = await testInteractiveBrokersConnection(credentials.authToken);
        break;

      case "td_ameritrade":
        if (!credentials.authToken) {
          throw new Error("Auth token required for TD Ameritrade");
        }
        result = await testTDAmeritradeConnection(credentials.authToken);
        break;

      case "aladdin":
        if (!credentials.apiKey || !credentials.apiSecret) {
          throw new Error("API Key and Secret required for Aladdin");
        }
        result = await testAladdinConnection(credentials.apiKey, credentials.apiSecret);
        break;

      default:
        throw new Error(`Unsupported broker type: ${brokerType}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
