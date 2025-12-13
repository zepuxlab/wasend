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
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Templates() {
  const navigate = useNavigate();
  const { isConfigured } = useSupabase();
  const { isUser } = useAuth();
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
            {!isUser && (
              <Button
                onClick={() => syncTemplates.mutate()}
                disabled={syncTemplates.isPending}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncTemplates.isPending ? "animate-spin" : ""}`} />
                {syncTemplates.isPending ? "Syncing..." : "Sync"}
              </Button>
            )}
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
                
                {/* Информация о компонентах */}
                {previewTemplate.components && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {previewTemplate.components.some((c: any) => c.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format)) && (
                      <span className="rounded bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        🖼️ {previewTemplate.components.find((c: any) => c.type === 'HEADER')?.format || 'Media'}
                      </span>
                    )}
                    {previewTemplate.components.some((c: any) => c.type === 'BUTTONS') && (
                      <span className="rounded bg-green-100 px-2 py-1 text-green-700 dark:bg-green-900 dark:text-green-300">
                        🔘 Buttons ({previewTemplate.components.find((c: any) => c.type === 'BUTTONS')?.buttons?.length || 0})
                      </span>
                    )}
                    {previewTemplate.components.some((c: any) => c.type === 'BODY') && (
                      <span className="rounded bg-gray-100 px-2 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        📝 Body Text
                      </span>
                    )}
                  </div>
                )}
                
                <div className="rounded-lg bg-muted/30 p-4">
                  <div className="bubble-outgoing max-w-[280px] p-3">
                    {/* Показать изображение если есть HEADER с IMAGE */}
                    {previewTemplate.components?.some((c: any) => c.type === 'HEADER' && c.format === 'IMAGE') && (
                      <div className="mb-2 rounded bg-muted overflow-hidden">
                        {previewTemplate.components?.find((c: any) => c.type === 'HEADER' && c.format === 'IMAGE')?.example?.header_handle?.[0] ? (
                          <img 
                            src={previewTemplate.components.find((c: any) => c.type === 'HEADER' && c.format === 'IMAGE').example.header_handle[0]} 
                            alt="Template header" 
                            className="w-full h-auto max-h-48 object-cover"
                            onError={(e) => {
                              // Если изображение не загрузилось, показываем placeholder
                              (e.target as HTMLImageElement).style.display = 'none';
                              const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                              if (placeholder) placeholder.style.display = 'block';
                            }}
                          />
                        ) : null}
                        <div className="p-4 text-center text-xs text-muted-foreground bg-muted" style={{ display: previewTemplate.components?.find((c: any) => c.type === 'HEADER' && c.format === 'IMAGE')?.example?.header_handle?.[0] ? 'none' : 'block' }}>
                          🖼️ Image Preview
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-foreground whitespace-pre-line">
                      {previewTemplate.preview_text || previewTemplate.components?.find((c: any) => c.type === 'BODY')?.text || "Template content preview"}
                    </p>
                    {/* Показать кнопки если есть - делаем их кликабельными */}
                    {previewTemplate.components?.find((c: any) => c.type === 'BUTTONS')?.buttons?.map((button: any, idx: number) => {
                      const buttonUrl = button.type === 'URL' ? button.url : null;
                      const buttonText = button.text || button.url || 'Button';
                      
                      return (
                        <a
                          key={idx}
                          href={buttonUrl || '#'}
                          target={buttonUrl ? "_blank" : undefined}
                          rel={buttonUrl ? "noopener noreferrer" : undefined}
                          onClick={(e) => {
                            if (!buttonUrl) {
                              e.preventDefault();
                              toast({
                                title: button.type === 'QUICK_REPLY' ? 'Quick Reply' : button.type === 'PHONE_NUMBER' ? 'Phone Number' : 'Button',
                                description: buttonText,
                              });
                            }
                          }}
                          className={cn(
                            "mt-2 block rounded bg-primary/10 px-2 py-1 text-xs text-primary transition-colors",
                            buttonUrl ? "hover:bg-primary/20 cursor-pointer" : "cursor-default"
                          )}
                        >
                          {button.type === 'URL' && '🔗'} {button.type === 'QUICK_REPLY' && '💬'} {button.type === 'PHONE_NUMBER' && '📞'}
                          {buttonText}
                        </a>
                      );
                    })}
                    <p className="mt-1 text-right text-[10px] text-muted-foreground">
                      12:34 PM ✓✓
                    </p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    Variables:{" "}
                    <span className="font-mono text-foreground">
                      {previewTemplate.variables?.join(", ") || "None"}
                    </span>
                  </p>
                  <p>
                    Category: <span className="text-foreground">{previewTemplate.category}</span>
                  </p>
                  <p>
                    Language: <span className="text-foreground uppercase">{previewTemplate.language}</span>
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
