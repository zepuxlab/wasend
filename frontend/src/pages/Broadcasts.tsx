import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Send, MoreHorizontal, Eye, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCampaignsFromBackend, useDeleteCampaignBackend } from "@/hooks/useBackendCampaigns";
import { useSupabase } from "@/hooks/useSupabase";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export default function Broadcasts() {
  const navigate = useNavigate();
  const { isConfigured } = useSupabase();
  const { isUser } = useAuth();
  const { data: campaigns, isLoading, error } = useCampaignsFromBackend();
  const deleteCampaign = useDeleteCampaignBackend();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteCampaign.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  // Map campaign status to StatusBadge status
  const mapStatus = (status: string) => {
    switch (status) {
      case "draft":
      case "ready":
        return "draft" as const;
      case "running":
        return "sending" as const;
      case "paused":
        return "sending" as const;
      case "completed":
        return "completed" as const;
      case "stopped":
      case "failed":
        return "failed" as const;
      default:
        return "draft" as const;
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen">
        <TopBar
          title="Broadcasts"
          subtitle="Manage and monitor your WhatsApp campaigns"
        />
        <div className="p-6">
          <Card className="p-6">
            <EmptyState
              icon={Send}
              title="Database not connected"
              description="Connect to Supabase in Settings to manage your campaigns."
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
        title="Broadcasts"
        subtitle="Manage and monitor your WhatsApp campaigns"
      />

      <div className="p-6">
        {/* Header Actions */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {campaigns?.length || 0} campaigns
            </span>
          </div>
          {!isUser && (
            <Button onClick={() => navigate("/broadcasts/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Broadcast
            </Button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6">
            <EmptyState
              icon={Send}
              title="Failed to load campaigns"
              description={error.message}
            />
          </Card>
        )}

        {/* Table */}
        {!isLoading && !error && campaigns && campaigns.length > 0 ? (
          <Card>
            <Table className="table-sticky">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Campaign</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Read</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign: any) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">
                      {campaign.name}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {campaign.templates?.name || "—"}
                      </code>
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.total_recipients.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.sent_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.delivered_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.read_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {campaign.failed_count}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={mapStatus(campaign.status)} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(campaign.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/broadcasts/${campaign.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {!isUser && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(campaign.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                icon={Send}
                title="No broadcasts yet"
                description="Create your first broadcast to start sending WhatsApp messages to your contacts."
                action={{
                  label: "Create Broadcast",
                  onClick: () => navigate("/broadcasts/create"),
                }}
              />
            </Card>
          )
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this campaign and all associated data.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
