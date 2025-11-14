import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { TargetAudience } from "@/components/TargetAudience";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { Integrations } from "@/components/Integrations";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <TargetAudience />
      <HowItWorks />
      <Features />
      <Integrations />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
