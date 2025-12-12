import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  RefreshCw,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { settingsBackendApi, ConnectionStatus } from "@/lib/backend-api";
import { useAuth } from "@/hooks/useAuth";
import { formatAed, formatMessageCost, getMessageCostAed } from "@/lib/currency";

export default function Settings() {
  const { isUser } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Campaign settings state
  const [campaignSettings, setCampaignSettings] = useState({
    defaultBatchSize: 50,
    defaultDelaySeconds: 60,
    defaultHourlyCap: 1000,
    defaultDailyCap: 10000,
    dailyLimitWarning: true,
    dailyLimitAmount: 100,
    pauseOnLimit: false,
  });

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const data = await settingsBackendApi.getStatus();
      setStatus(data);
      setLastRefresh(new Date());
    } catch (error: any) {
      // If request fails, backend API is definitely offline
      setStatus({
        backend_api: {
          connected: false,
          last_check: new Date().toISOString(),
          error: error.message || 'Connection failed',
        },
        database: {
          connected: false,
        },
        meta_api: {
          connected: false,
          last_check: new Date().toISOString(),
          error: 'Cannot check - backend API is offline',
        },
        webhook: {
          active: false,
          last_received: null,
        },
      });
      toast({
        title: "Error",
        description: "Failed to fetch connection status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load campaign settings from backend
  const fetchCampaignSettings = async () => {
    try {
      const data = await settingsBackendApi.getAll();
      if (data.campaign_settings) {
        setCampaignSettings({
          defaultBatchSize: data.campaign_settings.defaultBatchSize || 50,
          defaultDelaySeconds: data.campaign_settings.defaultDelaySeconds || 60,
          defaultHourlyCap: data.campaign_settings.defaultHourlyCap || 1000,
          defaultDailyCap: data.campaign_settings.defaultDailyCap || 10000,
          dailyLimitWarning: data.campaign_settings.dailyLimitWarning !== undefined ? data.campaign_settings.dailyLimitWarning : true,
          dailyLimitAmount: data.campaign_settings.dailyLimitAmount || 100,
          pauseOnLimit: data.campaign_settings.pauseOnLimit !== undefined ? data.campaign_settings.pauseOnLimit : false,
        });
      }
    } catch (error: any) {
      console.warn('Failed to load campaign settings:', error);
      // Keep default values
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchCampaignSettings();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString();
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar
        title="Settings"
        subtitle="Connection status and system information"
      />

      <div className="p-6 max-w-4xl">
        {/* Refresh Button */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={fetchStatus}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Connection Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Meta API Status */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Server
                  className={`h-6 w-6 ${
                    status?.backend_api?.connected
                      ? "text-success"
                      : "text-destructive"
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">Backend API</h3>
                  <Badge
                    className={
                      status?.backend_api?.connected
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }
                  >
                    {status?.backend_api?.connected
                      ? "Online"
                      : "Offline"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {status?.backend_api?.connected
                    ? "Backend server is running"
                    : "Backend server is not responding"}
                </p>
                {status?.backend_api?.last_check && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last check: {formatTime(status.backend_api.last_check)}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Meta API Status */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare
                  className={`h-6 w-6 ${
                    status?.meta_api.connected
                      ? "text-success"
                      : "text-destructive"
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">Meta API</h3>
                  <Badge
                    className={
                      status?.meta_api.connected
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }
                  >
                    {status?.meta_api.connected
                      ? "Connected"
                      : "Disconnected"}
                  </Badge>
                </div>
                {status?.meta_api.connected ? (
                  <>
                    {status.meta_api.phone_number && (
                      <p className="text-sm text-muted-foreground">
                        Phone: {status.meta_api.phone_number}
                      </p>
                    )}
                    {status.meta_api.business_name && (
                      <p className="text-sm text-muted-foreground">
                        Business: {status.meta_api.business_name}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {status?.meta_api.error || "Meta API connection failed"}
                  </p>
                )}
                {status?.meta_api.last_check && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last check: {formatTime(status.meta_api.last_check)}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Webhook Status */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Webhook
                  className={`h-6 w-6 ${
                    status?.webhook.active
                      ? "text-success"
                      : "text-muted-foreground"
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">Webhook</h3>
                  <Badge
                    className={
                      status?.webhook.active
                        ? "bg-success/10 text-success"
                        : "bg-muted/10 text-muted-foreground"
                    }
                  >
                    {status?.webhook.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {status?.webhook.active
                    ? "Webhook is configured and ready"
                    : "Webhook is not configured"}
                </p>
                {status?.webhook.last_received && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last received: {formatTime(status.webhook.last_received)}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Zoho CRM Status */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2
                  className={`h-6 w-6 ${
                    status?.zoho?.connected
                      ? "text-success"
                      : status?.zoho?.enabled
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">Zoho CRM</h3>
                  <Badge
                    className={
                      status?.zoho?.enabled
                        ? status?.zoho?.connected
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                        : "bg-muted/10 text-muted-foreground"
                    }
                  >
                    {status?.zoho?.enabled
                      ? status?.zoho?.connected
                        ? "Connected"
                        : "Disconnected"
                      : "Disabled"}
                  </Badge>
                </div>
                {status?.zoho?.enabled ? (
                  <>
                    {status.zoho.connected ? (
                      <p className="text-sm text-muted-foreground">
                        Zoho CRM integration is active
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {status.zoho.error || "Zoho CRM connection failed"}
                      </p>
                    )}
                    {status.zoho.last_check && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last check: {formatTime(status.zoho.last_check)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Zoho CRM integration is disabled
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Campaign Settings Tab */}
        <Tabs defaultValue="status" className="space-y-6">
          <TabsList>
            <TabsTrigger value="status">Connection Status</TabsTrigger>
            {!isUser && (
              <TabsTrigger value="campaigns">Campaign Settings</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="status">
            {/* Last Refresh Info */}
            <div className="text-center text-sm text-muted-foreground">
              Last refreshed: {lastRefresh.toLocaleTimeString()}
            </div>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            {/* Rate Limits */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-foreground">
                  Default Rate Limits
                </h3>
                <Badge variant="outline" className="text-xs">
                  Message cost: {formatMessageCost('MARKETING')} per message
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Settings for new campaigns. Costs are displayed in AED (UAE Dirhams).
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-size">Messages per batch</Label>
                  <Input
                    id="batch-size"
                    type="number"
                    value={campaignSettings.defaultBatchSize}
                    onChange={(e) =>
                      setCampaignSettings({
                        ...campaignSettings,
                        defaultBatchSize: parseInt(e.target.value) || 50,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-delay">Delay between batches (sec)</Label>
                  <Input
                    id="batch-delay"
                    type="number"
                    value={campaignSettings.defaultDelaySeconds}
                    onChange={(e) =>
                      setCampaignSettings({
                        ...campaignSettings,
                        defaultDelaySeconds: parseInt(e.target.value) || 60,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourly-cap">Hourly cap</Label>
                  <Input
                    id="hourly-cap"
                    type="number"
                    value={campaignSettings.defaultHourlyCap}
                    onChange={(e) =>
                      setCampaignSettings({
                        ...campaignSettings,
                        defaultHourlyCap: parseInt(e.target.value) || 1000,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum messages per hour
                    {campaignSettings.defaultHourlyCap > 0 && (
                      <span className="ml-2">
                        (≈ {formatAed(campaignSettings.defaultHourlyCap * getMessageCostAed('MARKETING'))})
                      </span>
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-cap">Daily cap</Label>
                  <Input
                    id="daily-cap"
                    type="number"
                    value={campaignSettings.defaultDailyCap}
                    onChange={(e) =>
                      setCampaignSettings({
                        ...campaignSettings,
                        defaultDailyCap: parseInt(e.target.value) || 10000,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum messages per day
                    {campaignSettings.defaultDailyCap > 0 && (
                      <span className="ml-2">
                        (≈ {formatAed(campaignSettings.defaultDailyCap * getMessageCostAed('MARKETING'))})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </Card>

            {/* Cost Limits */}
            <Card className="p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">
                Cost Limits
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Alerts and automatic restrictions
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      Daily limit warning
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Notification when threshold is exceeded
                    </p>
                  </div>
                  <Switch
                    checked={campaignSettings.dailyLimitWarning}
                    onCheckedChange={(checked) =>
                      setCampaignSettings({
                        ...campaignSettings,
                        dailyLimitWarning: checked,
                      })
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="daily-limit">Daily limit (AED)</Label>
                    <span className="text-xs text-muted-foreground">
                      Message cost: {formatMessageCost('MARKETING')}
                    </span>
                  </div>
                  <Input
                    id="daily-limit"
                    type="number"
                    value={Math.round(campaignSettings.dailyLimitAmount * 3.67)}
                    onChange={(e) => {
                      const aedValue = parseInt(e.target.value) || 0;
                      // Convert AED to USD for storage
                      const usdValue = Math.round((aedValue / 3.67) * 100) / 100;
                      setCampaignSettings({
                        ...campaignSettings,
                        dailyLimitAmount: usdValue,
                      });
                    }}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    ≈ ${campaignSettings.dailyLimitAmount.toFixed(2)} USD
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      Pause on limit reached
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Automatically pause campaigns
                    </p>
                  </div>
                  <Switch
                    checked={campaignSettings.pauseOnLimit}
                    onCheckedChange={(checked) =>
                      setCampaignSettings({
                        ...campaignSettings,
                        pauseOnLimit: checked,
                      })
                    }
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={async () => {
                  try {
                    await settingsBackendApi.update({
                      campaign_settings: campaignSettings,
                    });
                    toast({
                      title: "Settings Saved",
                      description: "Campaign settings have been saved to database",
                    });
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to save campaign settings",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Save Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
