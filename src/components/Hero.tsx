import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import heroDashboard from "@/assets/hero-dashboard.jpg";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20" />
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-foreground">
              Next Generation Investment Intelligence
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Build AI Agents for
            <br />
            <span className="bg-gradient-secondary bg-clip-text text-transparent">
              Intelligent Investing
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Create custom AI agents tailored for investment strategies. Connect to institutional-grade systems like Aladdin AI and revolutionize your portfolio management.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button variant="hero" size="lg" className="group">
              Start Building Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/80">
              Watch Demo
            </Button>
          </div>

          {/* Hero image */}
          <div className="pt-12 relative">
            <div className="absolute inset-0 bg-gradient-secondary/20 blur-[100px] rounded-full" />
            <img
              src={heroDashboard}
              alt="AI Investment Dashboard"
              className="rounded-2xl shadow-strong border border-border/50 relative z-10 w-full"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 max-w-4xl mx-auto">
            {[
              { value: "$21T+", label: "Assets Managed" },
              { value: "50K+", label: "Active Users" },
              { value: "99.9%", label: "Uptime" },
              { value: "24/7", label: "AI Monitoring" },
            ].map((stat) => (
              <div key={stat.label} className="space-y-2">
                <div className="text-3xl md:text-4xl font-bold text-secondary">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
