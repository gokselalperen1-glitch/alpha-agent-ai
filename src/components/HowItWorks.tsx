import { Card } from "@/components/ui/card";
import { Bot, Link2, Rocket, Settings } from "lucide-react";

const steps = [
  {
    icon: Bot,
    number: "01",
    title: "Design Your Agent",
    description: "Use our intuitive builder to create AI agents with custom investment strategies, risk parameters, and decision logic.",
  },
  {
    icon: Link2,
    number: "02",
    title: "Connect to Systems",
    description: "Integrate with institutional-grade platforms like Aladdin AI, market data providers, and trading APIs.",
  },
  {
    icon: Settings,
    number: "03",
    title: "Configure & Test",
    description: "Fine-tune your agent's behavior, backtest strategies, and simulate performance before going live.",
  },
  {
    icon: Rocket,
    number: "04",
    title: "Deploy & Scale",
    description: "Launch your AI agents and watch them execute your investment strategies 24/7 with full monitoring.",
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/5 rounded-full blur-[120px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            From Idea to Deployment in
            <span className="bg-gradient-accent bg-clip-text text-transparent"> Four Steps</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Our streamlined platform makes it easy to create, test, and deploy sophisticated AI investment agents.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.title}
                className="p-6 bg-card border-border/50 hover:shadow-medium hover:border-secondary/30 transition-all duration-300 relative group"
              >
                {/* Connection line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 left-full w-6 h-0.5 bg-gradient-to-r from-secondary/50 to-transparent -translate-y-1/2" />
                )}
                
                <div className="text-5xl font-bold text-secondary/10 mb-4 group-hover:text-secondary/20 transition-colors">
                  {step.number}
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 shadow-soft">
                  <Icon className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
