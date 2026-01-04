import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Scale, 
  TrendingUp, 
  Flame,
  Target,
  PiggyBank,
  LineChart,
  Coins,
  ChevronRight,
  ChevronLeft,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvestmentProfileWizardProps {
  onComplete: (profile: InvestmentProfile) => void;
  onSkip?: () => void;
}

export interface InvestmentProfile {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investorType: string;
  investmentGoals: string;
  portfolioSize: string;
}

const INVESTMENT_STYLES = [
  {
    id: 'conservative',
    label: 'Conservative',
    description: 'Capital preservation with steady, low-risk returns',
    icon: Shield,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/50',
  },
  {
    id: 'moderate',
    label: 'Balanced',
    description: 'Mix of growth and stability with moderate risk',
    icon: Scale,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/50',
  },
  {
    id: 'aggressive',
    label: 'Growth',
    description: 'Maximum returns with higher risk tolerance',
    icon: TrendingUp,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/50',
  },
];

const INVESTMENT_GOALS = [
  {
    id: 'wealth-building',
    label: 'Long-term Wealth',
    description: 'Build wealth over years',
    icon: PiggyBank,
  },
  {
    id: 'income',
    label: 'Regular Income',
    description: 'Generate consistent returns',
    icon: Coins,
  },
  {
    id: 'trading',
    label: 'Active Trading',
    description: 'Short-term profit opportunities',
    icon: LineChart,
  },
  {
    id: 'diversification',
    label: 'Diversification',
    description: 'Spread risk across assets',
    icon: Target,
  },
];

const PORTFOLIO_SIZES = [
  { id: 'starter', label: 'Starter', range: '$100 - $1,000' },
  { id: 'growing', label: 'Growing', range: '$1,000 - $10,000' },
  { id: 'established', label: 'Established', range: '$10,000 - $100,000' },
  { id: 'professional', label: 'Professional', range: '$100,000+' },
];

export const InvestmentProfileWizard = ({ onComplete, onSkip }: InvestmentProfileWizardProps) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<InvestmentProfile>>({});

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleStyleSelect = (styleId: string) => {
    setProfile(prev => ({ ...prev, riskTolerance: styleId as InvestmentProfile['riskTolerance'] }));
  };

  const handleGoalSelect = (goalId: string) => {
    setProfile(prev => ({ ...prev, investmentGoals: goalId, investorType: goalId }));
  };

  const handleSizeSelect = (sizeId: string) => {
    setProfile(prev => ({ ...prev, portfolioSize: sizeId }));
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete(profile as InvestmentProfile);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!profile.riskTolerance;
      case 2: return !!profile.investmentGoals;
      case 3: return !!profile.portfolioSize;
      default: return false;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-border/50 shadow-lg">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            Step {step} of {totalSteps}
          </Badge>
          {onSkip && (
            <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
              Skip for now
            </Button>
          )}
        </div>
        <Progress value={progress} className="h-2" />
        <div>
          <CardTitle className="text-xl">
            {step === 1 && 'What\'s your investment style?'}
            {step === 2 && 'What are your goals?'}
            {step === 3 && 'What\'s your portfolio size?'}
          </CardTitle>
          <CardDescription className="mt-1">
            {step === 1 && 'Choose the approach that matches your comfort level'}
            {step === 2 && 'Help us recommend the right AI agents for you'}
            {step === 3 && 'This helps us optimize trade sizes and risk limits'}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Investment Style */}
        {step === 1 && (
          <div className="grid gap-3">
            {INVESTMENT_STYLES.map((style) => {
              const Icon = style.icon;
              const isSelected = profile.riskTolerance === style.id;
              
              return (
                <button
                  key={style.id}
                  onClick={() => handleStyleSelect(style.id)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left",
                    "hover:border-primary/50 hover:bg-muted/50",
                    isSelected 
                      ? `${style.borderColor} ${style.bgColor}` 
                      : "border-border bg-card"
                  )}
                >
                  <div className={cn("p-3 rounded-lg", style.bgColor)}>
                    <Icon className={cn("h-6 w-6", style.color)} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{style.label}</div>
                    <div className="text-sm text-muted-foreground">{style.description}</div>
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Investment Goals */}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            {INVESTMENT_GOALS.map((goal) => {
              const Icon = goal.icon;
              const isSelected = profile.investmentGoals === goal.id;
              
              return (
                <button
                  key={goal.id}
                  onClick={() => handleGoalSelect(goal.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                    "hover:border-primary/50 hover:bg-muted/50",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border bg-card"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-lg",
                    isSelected ? "bg-primary/10" : "bg-muted"
                  )}>
                    <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-sm">{goal.label}</div>
                    <div className="text-xs text-muted-foreground">{goal.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 3: Portfolio Size */}
        {step === 3 && (
          <div className="grid gap-3">
            {PORTFOLIO_SIZES.map((size) => {
              const isSelected = profile.portfolioSize === size.id;
              
              return (
                <button
                  key={size.id}
                  onClick={() => handleSizeSelect(size.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border-2 transition-all",
                    "hover:border-primary/50 hover:bg-muted/50",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border bg-card"
                  )}
                >
                  <div>
                    <div className="font-semibold">{size.label}</div>
                    <div className="text-sm text-muted-foreground">{size.range}</div>
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {step === totalSteps ? 'Complete' : 'Continue'}
            {step !== totalSteps && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
