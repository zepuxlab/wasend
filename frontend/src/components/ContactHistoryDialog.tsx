import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Send, Activity, Clock, ArrowRight } from "lucide-react";
import { contactsBackendApi } from "@/lib/backend-api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContactHistoryDialogProps {
  contactId: string;
  contactName: string;
  contactPhone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactHistoryDialog({
  contactId,
  contactName,
  contactPhone,
  open,
  onOpenChange,
}: ContactHistoryDialogProps) {
  const navigate = useNavigate();
  const [history, setHistory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && contactId) {
      fetchHistory();
    }
  }, [open, contactId]);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const data = await contactsBackendApi.getHistory(contactId);
      setHistory(data);
    } catch (error: any) {
      console.error("Failed to fetch contact history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToChat = (chatId: string) => {
    navigate(`/chats?chat=${chatId}`);
    onOpenChange(false);
  };

  const handleGoToCampaign = (campaignId: string) => {
    navigate(`/broadcasts/${campaignId}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Contact History</DialogTitle>
          <DialogDescription>
            {contactName || contactPhone}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : history ? (
          <Tabs defaultValue="messages" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="messages">
                Messages ({history.messages?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="campaigns">
                Campaigns ({history.campaigns?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="activity">
                Activity ({history.logs?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="messages" className="mt-4">
              <ScrollArea className="h-[400px]">
                {history.messages?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.messages?.map((message: any) => (
                      <div
                        key={message.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          message.direction === "inbound"
                            ? "bg-muted/50"
                            : "bg-primary/5"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant={
                                  message.direction === "inbound"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {message.direction === "inbound"
                                  ? "Received"
                                  : "Sent"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(
                                  new Date(message.created_at),
                                  "MMM d, yyyy HH:mm"
                                )}
                              </span>
                            </div>
                            <p className="text-sm">{message.content}</p>
                            {message.chat?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-6 text-xs"
                                onClick={() => handleGoToChat(message.chat.id)}
                              >
                                View Chat
                                <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="campaigns" className="mt-4">
              <ScrollArea className="h-[400px]">
                {history.campaigns?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No campaigns yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.campaigns?.map((recipient: any) => (
                      <div
                        key={recipient.id}
                        className="p-4 rounded-lg border hover:bg-accent cursor-pointer"
                        onClick={() =>
                          handleGoToCampaign(recipient.campaign_id)
                        }
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">
                                {recipient.campaign?.name || "Unknown Campaign"}
                              </h4>
                              <Badge
                                variant={
                                  recipient.status === "sent"
                                    ? "default"
                                    : recipient.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {recipient.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>
                                Sent:{" "}
                                {recipient.sent_at
                                  ? format(
                                      new Date(recipient.sent_at),
                                      "MMM d, yyyy HH:mm"
                                    )
                                  : "—"}
                              </span>
                              {recipient.delivered_at && (
                                <span>
                                  Delivered:{" "}
                                  {format(
                                    new Date(recipient.delivered_at),
                                    "MMM d, yyyy HH:mm"
                                  )}
                                </span>
                              )}
                              {recipient.read_at && (
                                <span>
                                  Read:{" "}
                                  {format(
                                    new Date(recipient.read_at),
                                    "MMM d, yyyy HH:mm"
                                  )}
                                </span>
                              )}
                            </div>
                            {recipient.error_message && (
                              <p className="text-xs text-destructive mt-2">
                                Error: {recipient.error_message}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <ScrollArea className="h-[400px]">
                {history.logs?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No activity logs yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.logs?.map((log: any) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg border flex items-start gap-3"
                      >
                        <div className="p-2 rounded-full bg-primary/10">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {log.action}
                            </Badge>
                            {log.campaign?.name && (
                              <span className="text-xs text-muted-foreground">
                                Campaign: {log.campaign.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(
                                new Date(log.created_at),
                                "MMM d, yyyy HH:mm"
                              )}
                            </span>
                          </div>
                          {log.error && (
                            <p className="text-xs text-destructive mt-1">
                              {log.error}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to load history</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

