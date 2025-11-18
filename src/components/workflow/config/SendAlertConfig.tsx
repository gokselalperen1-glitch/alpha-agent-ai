import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface SendAlertConfigProps {
  config: any;
  onUpdate: (config: any) => void;
}

export const SendAlertConfig = ({ config, onUpdate }: SendAlertConfigProps) => {
  const [channel, setChannel] = useState(config.channel || "in-app");
  const [severity, setSeverity] = useState(config.severity || "info");
  const [title, setTitle] = useState(config.title || "");
  const [message, setMessage] = useState(config.message || "");
  const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl || "");

  useEffect(() => {
    onUpdate({
      channel,
      severity,
      title,
      message,
      webhookUrl: channel === "webhook" ? webhookUrl : undefined,
    });
  }, [channel, severity, title, message, webhookUrl]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Alert Channel</Label>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in-app">In-App Notification</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="webhook">Webhook</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Severity</Label>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="success">Success</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Alert title"
        />
      </div>

      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Alert message... Use {{variable}} for dynamic values"
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Available variables: {"{{symbol}}, {{price}}, {{timestamp}}"}
        </p>
      </div>

      {channel === "webhook" && (
        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <Input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-webhook-url.com"
          />
          <p className="text-xs text-muted-foreground">
            POST request will be sent to this URL
          </p>
        </div>
      )}

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Alert will be sent via {channel} with {severity} severity
        </p>
      </div>
    </div>
  );
};
