import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AgentBuilder from "./pages/AgentBuilder";
import MyAgents from "./pages/MyAgents";
import ExchangeConnections from "./pages/ExchangeConnections";
import Portfolio from "./pages/Portfolio";
import AgentStudio from "./pages/AgentStudio";
import Positions from "./pages/Positions";
import Arbitrage from "./pages/Arbitrage";
import Trading from "./pages/Trading";
import InvestmentBrokerConnections from "./pages/InvestmentBrokerConnections";
import InvestmentPortfolio from "./pages/InvestmentPortfolio";
import InvestmentTransactions from "./pages/InvestmentTransactions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-agents" element={<MyAgents />} />
          <Route path="/agent-builder" element={<AgentBuilder />} />
          <Route path="/agent-builder/:id" element={<AgentBuilder />} />
          <Route path="/exchange-connections" element={<ExchangeConnections />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/agent-studio" element={<AgentStudio />} />
          <Route path="/positions" element={<Positions />} />
          <Route path="/arbitrage" element={<Arbitrage />} />
          <Route path="/trading" element={<Trading />} />
          <Route path="/investment-brokers" element={<InvestmentBrokerConnections />} />
          <Route path="/investment-portfolio" element={<InvestmentPortfolio />} />
          <Route path="/investment-transactions" element={<InvestmentTransactions />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
