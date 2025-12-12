import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  RefreshCw,
  XCircle,
  Database,
  Server,
  Webhook,
  MessageSquare,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { settingsBackendApi, ConnectionStatus } from "@/lib/backend-api";

export default function Settings() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const data = await settingsBackendApi.getStatus();
      setStatus(data);
      setLastRefresh(new Date());
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch connection status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
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
          {/* Database Status */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database
                  className={`h-6 w-6 ${
                    status?.database.connected
                      ? "text-success"
                      : "text-destructive"
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">Database</h3>
                  <Badge
                    className={
                      status?.database.connected
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }
                  >
                    {status?.database.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {status?.database.connected
                    ? "Supabase connection is active"
                    : "Database connection failed"}
                </p>
              </div>
            </div>
          </Card>

          {/* Backend API Status */}
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
        </div>

        {/* Last Refresh Info */}
        <div className="text-center text-sm text-muted-foreground">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
