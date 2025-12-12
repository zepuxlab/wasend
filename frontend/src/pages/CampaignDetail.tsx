import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Loader2,
} from "lucide-react";
import { 
  useCampaignFromBackend, 
  useCampaignRecipientsFromBackend, 
  useCampaignControlsBackend 
} from "@/hooks/useBackendCampaigns";
import { format } from "date-fns";
import { useSupabase } from "@/hooks/useSupabase";
import { useAuth } from "@/hooks/useAuth";
import { formatAed, formatMessageCost, getMessageCostAed } from "@/lib/currency";
import { EmptyState } from "@/components/ui/empty-state";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConfigured } = useSupabase();
  const { isUser } = useAuth();
  const { data: campaign, isLoading, error } = useCampaignFromBackend(id || "");
  const { data: recipients } = useCampaignRecipientsFromBackend(id || "");
  const { start, pause, resume, stop, isLoading: isControlLoading } = useCampaignControlsBackend(id || "");
  
  const [confirmAction, setConfirmAction] = useState<"stop" | null>(null);

  if (!isConfigured) {
    return (
      <div className="min-h-screen">
        <TopBar title="Campaign Details" />
        <div className="p-6">
          <Card className="p-6">
            <EmptyState
              icon={Send}
              title="Database not connected"
              description="Connect to Supabase in Settings to view campaign details."
              action={{
                label: "Go to Settings",
                onClick: () => navigate("/settings"),
              }}
            />
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <TopBar title="Campaign Details" />
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen">
        <TopBar title="Campaign Details" />
        <div className="p-6">
          <Card className="p-6">
            <EmptyState
              icon={XCircle}
              title="Campaign not found"
              description="The campaign you're looking for doesn't exist or was deleted."
              action={{
                label: "Back to Broadcasts",
                onClick: () => navigate("/broadcasts"),
              }}
            />
          </Card>
        </div>
      </div>
    );
  }

  const status = campaign.status;
  const progress = campaign.total_recipients > 0
    ? Math.round((campaign.sent_count / campaign.total_recipients) * 100)
    : 0;

  const canStart = status === "draft";
  const canPause = status === "running";
  const canResume = status === "paused";
  const canStop = status === "running" || status === "paused";

  const handleStart = async () => {
    await start();
  };

  const handlePause = async () => {
    await pause();
  };

  const handleResume = async () => {
    await resume();
  };

  const handleStop = async () => {
    await stop();
    setConfirmAction(null);
  };

  return (
    <div className="min-h-screen">
      <TopBar
        title={campaign.name}
        subtitle={`Campaign ID: ${campaign.id.slice(0, 8)}...`}
      />

      <div className="p-6 space-y-6">
        {/* Back Button & Controls */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/broadcasts")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Broadcasts
          </Button>

          {!isUser && (
            <div className="flex items-center gap-2">
              {canStart && (
                <Button onClick={handleStart} disabled={isControlLoading}>
                  {isControlLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Start Campaign
                </Button>
              )}

              {canPause && (
                <Button variant="outline" onClick={handlePause} disabled={isControlLoading}>
                  {isControlLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Pause className="mr-2 h-4 w-4" />
                  )}
                  Pause
                </Button>
              )}

              {canResume && (
                <Button onClick={handleResume} disabled={isControlLoading}>
                  {isControlLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Resume
                </Button>
              )}

              {canStop && (
              <AlertDialog open={confirmAction === "stop"} onOpenChange={(open) => setConfirmAction(open ? "stop" : null)}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isControlLoading}>
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Stop Campaign?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently stop the campaign and cancel all remaining messages.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStop} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Stop Campaign
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>

        {/* Status Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={status} />
              {status === "running" && (
                <span className="text-sm text-muted-foreground animate-pulse">
                  Sending messages...
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Template</p>
              <code className="text-sm bg-muted px-2 py-0.5 rounded">
                {campaign.template?.name || "—"}
              </code>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{campaign.sent_count.toLocaleString()} sent</span>
              <span>{campaign.total_recipients.toLocaleString()} total</span>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{campaign.total_recipients.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Recipients</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Send className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{campaign.sent_count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Sent</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{campaign.delivered_count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-whatsapp/10">
                <CheckCircle className="h-5 w-5 text-whatsapp" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{campaign.read_count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Read</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{campaign.failed_count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Campaign Info */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Campaign Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description</span>
                <span>{campaign.description || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(campaign.created_at), "PPp")}</span>
              </div>
              {campaign.started_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started</span>
                  <span>{format(new Date(campaign.started_at), "PPp")}</span>
                </div>
              )}
              {campaign.completed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{format(new Date(campaign.completed_at), "PPp")}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Rate Limits</h3>
              <Badge variant="outline" className="text-xs">
                Cost: {formatMessageCost('MARKETING')} per message
              </Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Messages per batch</span>
                <span>{campaign.rate_limit_per_batch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delay between batches</span>
                <span>{campaign.rate_limit_delay_seconds}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hourly cap</span>
                <span>
                  {campaign.hourly_cap || "No limit"}
                  {campaign.hourly_cap && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (≈ {formatAed(campaign.hourly_cap * getMessageCostAed('MARKETING'))})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily cap</span>
                <span>
                  {campaign.daily_cap || "No limit"}
                  {campaign.daily_cap && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (≈ {formatAed(campaign.daily_cap * getMessageCostAed('MARKETING'))})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Recipients Table */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Recipients ({recipients?.length || 0})</h3>
          {recipients && recipients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.slice(0, 50).map((recipient: any) => (
                  <TableRow key={recipient.id}>
                    <TableCell className="font-mono text-sm">
                      {recipient.contact?.phone || recipient.contacts?.phone || "—"}
                    </TableCell>
                    <TableCell>
                      {recipient.contact?.name || recipient.contacts?.name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          recipient.status === "delivered" || recipient.status === "read"
                            ? "default"
                            : recipient.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {recipient.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {recipient.sent_at
                        ? format(new Date(recipient.sent_at), "Pp")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-destructive text-sm max-w-xs truncate">
                      {recipient.error_message || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recipients added yet
            </p>
          )}
          {recipients && recipients.length > 50 && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Showing first 50 of {recipients.length} recipients
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
