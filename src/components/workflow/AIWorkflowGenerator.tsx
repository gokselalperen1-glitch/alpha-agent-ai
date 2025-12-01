import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIWorkflowGeneratorProps {
  onWorkflowGenerated: (workflow: { nodes: any[]; edges: any[] }) => void;
}

export const AIWorkflowGenerator = ({ onWorkflowGenerated }: AIWorkflowGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [userGoals, setUserGoals] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast({
        title: "Description Required",
        description: "Please describe your trading strategy",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-workflow-generator', {
        body: {
          description: description.trim(),
          userGoals: userGoals.trim() || "maximize profit with moderate risk"
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Failed to generate workflow");
      }

      toast({
        title: "Workflow Generated! ✨",
        description: "Your AI-powered trading strategy is ready",
      });

      onWorkflowGenerated(data.workflow);
      setOpen(false);
      setDescription("");
      setUserGoals("");
    } catch (error: any) {
      console.error("Workflow generation error:", error);
      
      let errorMessage = "Failed to generate workflow";
      if (error.message?.includes("Rate limit")) {
        errorMessage = "AI rate limit exceeded. Please try again later.";
      } else if (error.message?.includes("credits")) {
        errorMessage = "AI credits exhausted. Please add credits to continue.";
      }

      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Workflow Generator
          </DialogTitle>
          <DialogDescription>
            Describe your trading strategy in plain English, and AI will create a complete workflow for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Strategy Description *</Label>
            <Textarea
              id="description"
              placeholder="Example: Buy Bitcoin when RSI is below 30 and sentiment is positive. Sell when RSI is above 70 or if news mentions regulation concerns. Use AI risk assessment before each trade."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goals">Your Goals (Optional)</Label>
            <Textarea
              id="goals"
              placeholder="Example: Maximize profit while maintaining low risk. Trade only during high volatility. Focus on long-term gains."
              value={userGoals}
              onChange={(e) => setUserGoals(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Tips for best results:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Specify entry and exit conditions clearly</li>
              <li>Mention specific indicators (RSI, MACD, Moving Averages)</li>
              <li>Include risk management preferences</li>
              <li>Describe when to buy, sell, or hold</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Workflow
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
