import { Card } from "@/components/ui/card";
import { Shield, Zap, Brain, Lock, BarChart3, Cloud } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Advanced AI Models",
    description: "Leverage cutting-edge machine learning and natural language processing for sophisticated investment analysis.",
  },
  {
    icon: Zap,
    title: "Real-time Execution",
    description: "Execute trades and strategies in milliseconds with low-latency connections to markets worldwide.",
  },
  {
    icon: Shield,
    title: "Risk Management",
    description: "Built-in risk controls, position limits, and automated safeguards to protect your capital.",
  },
  {
    icon: Lock,
    title: "Bank-level Security",
    description: "Enterprise-grade encryption, secure data storage, and compliance with financial regulations.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Comprehensive dashboards and reporting to track agent performance and optimize strategies.",
  },
  {
    icon: Cloud,
    title: "Cloud Infrastructure",
    description: "Scalable cloud platform that grows with your needs, from prototype to production.",
  },
];

export const Features = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Everything You Need to
            <span className="bg-gradient-secondary bg-clip-text text-transparent"> Succeed</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Professional-grade features designed for serious investors and traders.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="p-6 bg-card border-border/50 hover:shadow-medium hover:border-secondary/30 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 shadow-soft group-hover:shadow-glow transition-all">
                  <Icon className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
