import { Card } from "@/components/ui/card";
import { TrendingUp, Briefcase, LineChart } from "lucide-react";

const audiences = [
  {
    icon: TrendingUp,
    title: "Investors",
    description: "Build AI agents that analyze market trends, identify opportunities, and execute data-driven investment decisions automatically.",
    features: ["Portfolio Optimization", "Risk Assessment", "Market Analysis"],
  },
  {
    icon: Briefcase,
    title: "Entrepreneurs",
    description: "Create intelligent agents to manage business investments, forecast growth, and make strategic financial decisions with confidence.",
    features: ["Business Intelligence", "Financial Forecasting", "Strategic Planning"],
  },
  {
    icon: LineChart,
    title: "Traders",
    description: "Deploy AI agents for real-time trading signals, pattern recognition, and automated execution based on your custom strategies.",
    features: ["Real-time Signals", "Pattern Recognition", "Auto-execution"],
  },
];

export const TargetAudience = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Built for Financial
            <span className="bg-gradient-secondary bg-clip-text text-transparent"> Professionals</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Whether you're managing portfolios, building businesses, or trading markets, our platform adapts to your needs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {audiences.map((audience) => {
            const Icon = audience.icon;
            return (
              <Card
                key={audience.title}
                className="p-8 bg-card border-border/50 hover:shadow-strong hover:border-secondary/30 transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-secondary flex items-center justify-center mb-6 shadow-glow group-hover:scale-110 transition-transform">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{audience.title}</h3>
                <p className="text-muted-foreground mb-6">{audience.description}</p>
                <div className="space-y-2">
                  {audience.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      <span className="text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
