import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const CTA = () => {
  return (
    <section className="py-24 bg-primary relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-secondary/20 opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-bold leading-tight">
            Ready to Transform Your
            <br />
            <span className="bg-gradient-secondary bg-clip-text text-transparent">
              Investment Strategy?
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of investors, entrepreneurs, and traders already building with AI agents. Start free today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button variant="hero" size="lg" className="group">
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/80">
              Schedule Demo
            </Button>
          </div>

          <div className="pt-8 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span>Free forever plan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
