import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-secondary" />
            <span className="font-bold text-xl">InvestAI</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium hover:text-secondary transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium hover:text-secondary transition-colors">
              How It Works
            </a>
            <a href="#integrations" className="text-sm font-medium hover:text-secondary transition-colors">
              Integrations
            </a>
            <a href="#pricing" className="text-sm font-medium hover:text-secondary transition-colors">
              Pricing
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-sm font-medium hover:text-secondary transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-medium hover:text-secondary transition-colors">
                How It Works
              </a>
              <a href="#integrations" className="text-sm font-medium hover:text-secondary transition-colors">
                Integrations
              </a>
              <a href="#pricing" className="text-sm font-medium hover:text-secondary transition-colors">
                Pricing
              </a>
              <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                  Sign In
                </Button>
                <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
