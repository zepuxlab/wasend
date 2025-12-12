import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
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
import { Search, Eye, Copy, RefreshCw, FileText } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useTemplates, useSyncTemplates } from "@/hooks/useTemplates";
import { useSupabase } from "@/hooks/useSupabase";
import { format } from "date-fns";

export default function Templates() {
  const navigate = useNavigate();
  const { isConfigured } = useSupabase();
  const { data: templates, isLoading, error } = useTemplates();
  const syncTemplates = useSyncTemplates();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  const filteredTemplates = templates?.filter(
    (t: any) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const copyTemplateName = (name: string) => {
    navigator.clipboard.writeText(name);
    toast({
      title: "Copied",
      description: `Template name "${name}" copied to clipboard`,
    });
  };

  const mapStatus = (status: string) => {
    switch (status) {
      case "approved": return "completed" as const;
      case "pending": return "sending" as const;
      case "rejected": return "failed" as const;
      default: return "draft" as const;
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen">
        <TopBar title="Templates" subtitle="Manage your WhatsApp message templates" />
        <div className="p-6">
          <Card className="p-6">
            <EmptyState
              icon={FileText}
              title="Database not connected"
              description="Connect to Supabase in Settings to manage templates."
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
        title="Templates"
        subtitle="Message templates from Meta WhatsApp Business API"
      />

      <div className="p-6">
        {/* Sync Info Card */}
        <Card className="p-4 mb-6 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">🔄 Sync with Meta</h3>
              <p className="text-sm text-muted-foreground">
                Templates are loaded from your WhatsApp Business account
              </p>
            </div>
            <Button
              onClick={() => syncTemplates.mutate()}
              disabled={syncTemplates.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncTemplates.isPending ? "animate-spin" : ""}`} />
              {syncTemplates.isPending ? "Syncing..." : "Sync"}
            </Button>
          </div>
        </Card>

        {/* Search */}
        <div className="mb-6 flex items-center justify-between">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Total templates: <strong>{templates?.length || 0}</strong>
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6">
            <EmptyState
              icon={FileText}
              title="Failed to load templates"
              description={error.message}
            />
          </Card>
        )}

        {/* Table */}
        {!isLoading && !error && filteredTemplates.length > 0 ? (
          <Card>
            <Table className="table-sticky">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Template Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template: any) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-1 text-sm font-medium">
                        {template.name}
                      </code>
                    </TableCell>
                    <TableCell>{template.category}</TableCell>
                    <TableCell className="uppercase">{template.language}</TableCell>
                    <TableCell>
                      <StatusBadge status={mapStatus(template.status)} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(template.updated_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPreviewTemplate(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyTemplateName(template.name)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
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
                icon={FileText}
                title="No templates yet"
                description="Sync templates from WhatsApp or add them manually."
                action={{
                  label: "Sync Templates",
                  onClick: () => syncTemplates.mutate(),
                }}
              />
            </Card>
          )
        )}

        {/* Preview Dialog */}
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
            </DialogHeader>
            {previewTemplate && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 text-sm">
                    {previewTemplate.name}
                  </code>
                  <StatusBadge status={mapStatus(previewTemplate.status)} />
                </div>
                
                <div className="rounded-lg bg-muted/30 p-4">
                  <div className="bubble-outgoing max-w-[280px] p-3">
                    <p className="text-sm text-foreground">
                      {previewTemplate.preview_text || "Template content preview"}
                    </p>
                    <p className="mt-1 text-right text-[10px] text-muted-foreground">
                      12:34 PM ✓✓
                    </p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>
                    Variables:{" "}
                    <span className="font-mono text-foreground">
                      {previewTemplate.variables?.join(", ") || "None"}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
