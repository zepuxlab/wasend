import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Send, MessageSquare, Reply, AlertCircle, TrendingUp, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useLogs } from "@/hooks/useLogs";
import { useContacts } from "@/hooks/useContacts";
import { useSupabase } from "@/hooks/useSupabase";
import { format, subDays, startOfDay, isAfter } from "date-fns";

export default function Dashboard() {
  const navigate = useNavigate();
  const { isConfigured } = useSupabase();
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns();
  const { data: logs, isLoading: logsLoading } = useLogs({ limit: 100 });
  const { data: contacts, isLoading: contactsLoading } = useContacts();

  const isLoading = campaignsLoading || logsLoading || contactsLoading;

  // Calculate stats
  const today = startOfDay(new Date());
  const todayLogs = logs?.filter((l: any) => isAfter(new Date(l.created_at), today)) || [];
  
  const sentToday = todayLogs.filter((l: any) => l.action === "sent").length;
  const activeConversations = campaigns?.filter((c: any) => c.status === "running").length || 0;
  const repliesReceived = todayLogs.filter((l: any) => l.action === "replied").length;
  const failedMessages = todayLogs.filter((l: any) => l.action === "failed").length;

  const stats = [
    {
      title: "Sent Today",
      value: sentToday.toLocaleString(),
      change: "Real-time data",
      changeType: "neutral" as const,
      icon: Send,
      iconColor: "bg-primary/10 text-primary",
    },
    {
      title: "Active Campaigns",
      value: activeConversations.toString(),
      change: `${campaigns?.length || 0} total`,
      changeType: "neutral" as const,
      icon: MessageSquare,
      iconColor: "bg-whatsapp/10 text-whatsapp",
    },
    {
      title: "Replies Today",
      value: repliesReceived.toString(),
      change: "From contacts",
      changeType: "positive" as const,
      icon: Reply,
      iconColor: "bg-success/10 text-success",
    },
    {
      title: "Failed Messages",
      value: failedMessages.toString(),
      change: failedMessages > 0 ? "Check logs" : "All good",
      changeType: failedMessages > 0 ? "negative" as const : "positive" as const,
      icon: AlertCircle,
      iconColor: "bg-destructive/10 text-destructive",
    },
  ];

  // Generate chart data from logs (last 7 days)
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayLogs = logs?.filter((l: any) => {
      const logDate = startOfDay(new Date(l.created_at));
      return logDate.getTime() === startOfDay(date).getTime();
    }) || [];
    
    return {
      date: format(date, "EEE"),
      sent: dayLogs.filter((l: any) => l.action === "sent").length,
      delivered: dayLogs.filter((l: any) => l.action === "delivered").length,
      read: dayLogs.filter((l: any) => l.action === "read").length,
    };
  });

  // Campaign data for bar chart
  const campaignData = campaigns?.slice(0, 5).map((c: any) => ({
    name: c.name.length > 15 ? c.name.slice(0, 15) + "..." : c.name,
    messages: c.sent_count,
  })) || [];

  // Recent activity from logs
  const recentActivity = logs?.slice(0, 4).map((log: any) => ({
    action: `${log.action}: ${log.phone || log.campaigns?.name || "Unknown"}`,
    time: format(new Date(log.created_at), "HH:mm"),
    type: log.action === "failed" ? "error" : log.action === "sent" ? "info" : "success",
  })) || [];

  if (!isConfigured) {
    return (
      <div className="min-h-screen">
        <TopBar title="Dashboard" subtitle="Overview of your WhatsApp activity" />
        <div className="p-6">
          <Card className="p-6">
            <EmptyState
              icon={BarChart3}
              title="Database not connected"
              description="Connect to Supabase in Settings to see your dashboard."
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
      <TopBar title="Dashboard" subtitle="Overview of your WhatsApp activity" />
      
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </Card>
            ))
          ) : (
            stats.map((stat) => (
              <StatCard key={stat.title} {...stat} />
            ))
          )}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Messages Over Time */}
          <Card className="col-span-2 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-card-foreground">
                  Messages Over Time
                </h3>
                <p className="text-sm text-muted-foreground">
                  Last 7 days performance
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Sent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-muted-foreground">Delivered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-whatsapp" />
                  <span className="text-muted-foreground">Read</span>
                </div>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sent"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="delivered"
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="read"
                      stroke="hsl(var(--whatsapp))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Campaign Breakdown */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-card-foreground">
                By Campaign
              </h3>
              <p className="text-sm text-muted-foreground">
                Top performing campaigns
              </p>
            </div>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : campaignData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={campaignData} layout="vertical">
                    <XAxis
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="messages"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No campaign data yet
              </div>
            )}
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold text-card-foreground">
              Recent Activity
            </h3>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        item.type === "success"
                          ? "bg-success"
                          : item.type === "error"
                          ? "bg-destructive"
                          : "bg-primary"
                      }`}
                    />
                    <span className="text-sm text-foreground">{item.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent activity
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
