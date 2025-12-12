import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Activity, RefreshCw } from "lucide-react";
import { useSupabase } from "@/hooks/useSupabase";
import { useQuery } from "@tanstack/react-query";
import { logsBackendApi, campaignsBackendApi, ActivityLog } from "@/lib/backend-api";
import { format } from "date-fns";

export default function Logs() {
  const navigate = useNavigate();
  const { isConfigured } = useSupabase();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");

  // Fetch logs from backend
  const { data: logs, isLoading, error, refetch } = useQuery({
    queryKey: ['logs', { action: statusFilter !== 'all' ? statusFilter : undefined, campaign_id: campaignFilter !== 'all' ? campaignFilter : undefined }],
    queryFn: () => logsBackendApi.getAll({
      action: statusFilter !== 'all' ? statusFilter : undefined,
      campaign_id: campaignFilter !== 'all' ? campaignFilter : undefined,
      limit: 200,
    }),
    refetchInterval: 5000, // Poll every 5 seconds
    retry: 3, // Retry 3 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce load
    // Continue polling even if there's an error (backend might be temporarily unavailable)
    refetchIntervalInBackground: true,
  });

  // Fetch campaigns for filter
  const { data: campaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsBackendApi.getAll(),
  });

  const filteredLogs = logs?.filter((log: ActivityLog) => {
    const matchesSearch = searchQuery === "" ||
      log.phone?.includes(searchQuery) ||
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.campaign_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  }) || [];

  const getActionBadge = (action: string) => {
    switch (action) {
      case "sent":
        return <Badge className="bg-primary/10 text-primary">Sent</Badge>;
      case "delivered":
        return <Badge className="bg-success/10 text-success">Delivered</Badge>;
      case "read":
        return <Badge className="bg-whatsapp/10 text-whatsapp">Read</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "replied":
        return <Badge className="bg-blue-500/10 text-blue-500">Replied</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen">
        <TopBar title="Activity Logs" subtitle="Track all message activity" />
        <div className="p-6">
          <Card className="p-6">
            <EmptyState
              icon={Activity}
              title="Backend not connected"
              description="Configure your backend API in Settings to view activity logs."
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

  return (
    <div className="min-h-screen">
      <TopBar
        title="Activity Logs"
        subtitle="Track all message activity in real-time"
      />

      <div className="p-6">
        {/* Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search phone or campaign..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns?.map((campaign: any) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Card>
        )}

        {/* Error State - Show warning but don't block the view */}
        {error && (
          <Card className="p-4 mb-4 border-yellow-500/50 bg-yellow-500/10">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Unable to load logs
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  {(error as Error).message || 'Backend server may be temporarily unavailable'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Table */}
        {!isLoading && !error && filteredLogs.length > 0 ? (
          <Card>
            <Table className="table-sticky">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: ActivityLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.phone || "—"}
                    </TableCell>
                    <TableCell>
                      {log.campaign_name ? (
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {log.campaign_name}
                        </code>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-destructive text-sm max-w-xs truncate">
                      {log.error || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          !isLoading && !error && (
            <Card className="p-6">
              <EmptyState
                icon={Activity}
                title="No activity yet"
                description="Activity logs will appear here when messages are sent via your backend."
              />
            </Card>
          )
        )}
      </div>
    </div>
  );
}
