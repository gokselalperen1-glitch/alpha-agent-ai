import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

const integrations = [
  {
    name: "Aladdin AI",
    provider: "BlackRock",
    description: "Connect to the world's most powerful investment platform managing $21+ trillion in assets.",
    features: ["Risk Analytics", "Portfolio Management", "Trading Execution"],
    status: "Available",
  },
  {
    name: "Market Data APIs",
    provider: "Multiple Providers",
    description: "Real-time and historical market data from leading financial information providers.",
    features: ["Real-time Quotes", "Historical Data", "News & Sentiment"],
    status: "Available",
  },
  {
    name: "Trading Platforms",
    provider: "Brokers & Exchanges",
    description: "Execute trades across multiple brokers and exchanges with unified API access.",
    features: ["Order Management", "Position Tracking", "Multi-exchange"],
    status: "Available",
  },
  {
    name: "Analytics Tools",
    provider: "Third-party",
    description: "Enhanced analytics, backtesting frameworks, and performance measurement tools.",
    features: ["Backtesting", "Performance Analytics", "Risk Metrics"],
    status: "Coming Soon",
  },
];

export const Integrations = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Powerful
            <span className="bg-gradient-secondary bg-clip-text text-transparent"> Integrations</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Connect your AI agents to institutional-grade platforms and data sources for professional-level investing.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {integrations.map((integration) => (
            <Card
              key={integration.name}
              className="p-8 bg-card border-border/50 hover:shadow-strong hover:border-secondary/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold mb-1">{integration.name}</h3>
                  <p className="text-sm text-muted-foreground">{integration.provider}</p>
                </div>
                <Badge
                  variant={integration.status === "Available" ? "default" : "secondary"}
                  className={integration.status === "Available" ? "bg-secondary/10 text-secondary border-secondary/20" : ""}
                >
                  {integration.status}
                </Badge>
              </div>
              
              <p className="text-muted-foreground mb-6">
                {integration.description}
              </p>

              <div className="space-y-2">
                {integration.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
