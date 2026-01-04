import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Wallet, 
  Bot,
  CheckCircle2,
  Circle,
  ChevronRight,
  Sparkles,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InvestmentProfileWizard, InvestmentProfile } from './InvestmentProfileWizard';
import { EasyPortfolioConnect } from './EasyPortfolioConnect';
import { AgentRecommendation } from './AgentRecommendation';

interface GettingStartedFlowProps {
  onComplete?: () => void;
}

type OnboardingStep = 'profile' | 'portfolio' | 'agent' | 'complete';

interface StepStatus {
  profile: boolean;
  portfolio: boolean;
  agent: boolean;
}

export const GettingStartedFlow = ({ onComplete }: GettingStartedFlowProps) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null);
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    profile: false,
    portfolio: false,
    agent: false,
  });
  const [profile, setProfile] = useState<InvestmentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check profile status
      const { data: profileData } = await supabase
        .from('profiles')
        .select('risk_tolerance, investor_type, investment_goals')
        .eq('id', user.id)
        .single();

      const hasProfile = !!(profileData?.risk_tolerance && profileData?.investor_type);

      // Check portfolio/connection status
      const { count: connectionCount } = await supabase
        .from('exchange_connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);

      const { count: portfolioCount } = await supabase
        .from('portfolios')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const hasPortfolio = (connectionCount || 0) > 0 || (portfolioCount || 0) > 0;

      // Check agent status
      const { count: agentCount } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const hasAgent = (agentCount || 0) > 0;

      setStepStatus({
        profile: hasProfile,
        portfolio: hasPortfolio,
        agent: hasAgent,
      });

      if (hasProfile && profileData) {
        setProfile({
          riskTolerance: profileData.risk_tolerance as InvestmentProfile['riskTolerance'],
          investorType: profileData.investor_type || '',
          investmentGoals: profileData.investment_goals || '',
          portfolioSize: '',
        });
      }

      // If all complete, call onComplete
      if (hasProfile && hasPortfolio && hasAgent) {
        onComplete?.();
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedSteps = Object.values(stepStatus).filter(Boolean).length;
  const totalSteps = 3;
  const progress = (completedSteps / totalSteps) * 100;
  const isComplete = completedSteps === totalSteps;

  const handleProfileComplete = (newProfile: InvestmentProfile) => {
    setProfile(newProfile);
    setStepStatus(prev => ({ ...prev, profile: true }));
    setCurrentStep(null);
  };

  const handlePortfolioComplete = () => {
    setStepStatus(prev => ({ ...prev, portfolio: true }));
    setCurrentStep(null);
  };

  const handleAgentComplete = () => {
    setStepStatus(prev => ({ ...prev, agent: true }));
    setCurrentStep(null);
    onComplete?.();
  };

  const getNextIncompleteStep = (): OnboardingStep | null => {
    if (!stepStatus.profile) return 'profile';
    if (!stepStatus.portfolio) return 'portfolio';
    if (!stepStatus.agent) return 'agent';
    return null;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  // Show wizard step if active
  if (currentStep === 'profile') {
    return (
      <InvestmentProfileWizard
        onComplete={handleProfileComplete}
        onSkip={() => {
          setStepStatus(prev => ({ ...prev, profile: true }));
          setCurrentStep(null);
        }}
      />
    );
  }

  if (currentStep === 'portfolio') {
    return (
      <EasyPortfolioConnect
        profile={profile || undefined}
        onComplete={handlePortfolioComplete}
        onSkip={() => {
          setStepStatus(prev => ({ ...prev, portfolio: true }));
          setCurrentStep(null);
        }}
      />
    );
  }

  if (currentStep === 'agent' && profile) {
    return (
      <AgentRecommendation
        profile={profile}
        onComplete={handleAgentComplete}
        onSkip={() => {
          setStepStatus(prev => ({ ...prev, agent: true }));
          setCurrentStep(null);
        }}
      />
    );
  }

  // Show progress overview
  const steps = [
    {
      id: 'profile' as const,
      label: 'Investment Profile',
      description: 'Tell us about your style',
      icon: User,
      complete: stepStatus.profile,
    },
    {
      id: 'portfolio' as const,
      label: 'Connect Portfolio',
      description: 'Link your exchange or use demo',
      icon: Wallet,
      complete: stepStatus.portfolio,
    },
    {
      id: 'agent' as const,
      label: 'Deploy AI Agent',
      description: 'Get your personalized agent',
      icon: Bot,
      complete: stepStatus.agent,
    },
  ];

  return (
    <Card className="w-full border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Getting Started</CardTitle>
          </div>
          <Badge variant={isComplete ? "default" : "outline"} className="gap-1">
            {isComplete ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Complete
              </>
            ) : (
              `${completedSteps}/${totalSteps}`
            )}
          </Badge>
        </div>
        <Progress value={progress} className="h-2 mt-3" />
      </CardHeader>

      <CardContent className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isNext = !step.complete && getNextIncompleteStep() === step.id;
          
          return (
            <button
              key={step.id}
              onClick={() => !step.complete && setCurrentStep(step.id)}
              disabled={step.complete}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                step.complete 
                  ? "bg-muted/30 cursor-default" 
                  : "hover:bg-muted/50 cursor-pointer",
                isNext && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                step.complete ? "bg-primary/10" : "bg-muted"
              )}>
                {step.complete ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Icon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "font-medium text-sm",
                  step.complete && "text-muted-foreground"
                )}>
                  {step.label}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {step.description}
                </div>
              </div>
              {!step.complete && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
          );
        })}

        {!isComplete && (
          <Button 
            className="w-full mt-4"
            onClick={() => {
              const next = getNextIncompleteStep();
              if (next) setCurrentStep(next);
            }}
          >
            <Play className="h-4 w-4 mr-2" />
            Continue Setup
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
