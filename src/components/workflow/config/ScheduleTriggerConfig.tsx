import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ScheduleTriggerConfigProps {
  config: any;
  onUpdate: (config: any) => void;
}

const CRON_PRESETS = {
  "*/5 * * * *": "Every 5 minutes",
  "*/15 * * * *": "Every 15 minutes",
  "*/30 * * * *": "Every 30 minutes",
  "0 * * * *": "Every hour",
  "0 */4 * * *": "Every 4 hours",
  "0 0 * * *": "Daily at midnight",
  "0 9 * * *": "Daily at 9 AM",
  "0 0 * * 0": "Weekly (Sunday)",
  "custom": "Custom expression",
};

export const ScheduleTriggerConfig = ({ config, onUpdate }: ScheduleTriggerConfigProps) => {
  const [preset, setPreset] = useState(config.cronExpression || "*/15 * * * *");
  const [customCron, setCustomCron] = useState(config.cronExpression || "");
  const [timezone, setTimezone] = useState(config.timezone || "UTC");

  useEffect(() => {
    if (preset !== "custom") {
      onUpdate({
        cronExpression: preset,
        timezone,
        description: CRON_PRESETS[preset as keyof typeof CRON_PRESETS],
      });
    }
  }, [preset, timezone]);

  const handleCustomCronUpdate = () => {
    onUpdate({
      cronExpression: customCron,
      timezone,
      description: "Custom schedule",
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Schedule</Label>
        <Select value={preset} onValueChange={setPreset}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CRON_PRESETS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset === "custom" && (
        <div className="space-y-2">
          <Label>Cron Expression</Label>
          <Input
            value={customCron}
            onChange={(e) => setCustomCron(e.target.value)}
            placeholder="*/15 * * * *"
          />
          <p className="text-xs text-muted-foreground">
            Format: minute hour day month weekday
          </p>
          <Button onClick={handleCustomCronUpdate} size="sm" className="w-full">
            Apply Custom Schedule
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label>Timezone</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UTC">UTC</SelectItem>
            <SelectItem value="America/New_York">Eastern Time</SelectItem>
            <SelectItem value="America/Chicago">Central Time</SelectItem>
            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
            <SelectItem value="Europe/London">London</SelectItem>
            <SelectItem value="Europe/Paris">Paris</SelectItem>
            <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
            <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          {config.description || "Configure when this workflow should run"}
        </p>
      </div>
    </div>
  );
};
