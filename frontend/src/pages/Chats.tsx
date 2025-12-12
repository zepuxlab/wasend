import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, Send, Tag, CheckCircle, MessageSquare, RefreshCcw, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useChatsFromBackend,
  useChatMessagesFromBackend,
  useSendMessageToBackend,
  useResolveChatFromBackend,
} from "@/hooks/useBackendChats";
import { useSupabase } from "@/hooks/useSupabase";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow, isAfter } from "date-fns";
import type { Chat, Message } from "@/lib/backend-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Chats() {
  const navigate = useNavigate();
  const { isConfigured } = useSupabase();
  const { isUser } = useAuth();
  
  const { data: chats, isLoading: chatsLoading, error: chatsError, refetch } = useChatsFromBackend();
  const sendMessage = useSendMessageToBackend();
  const resolveChat = useResolveChatFromBackend();
  
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTag, setNewTag] = useState("");

  // Get messages for selected chat
  const { data: messages, isLoading: messagesLoading } = useChatMessagesFromBackend(selectedChatId || "");

  const selectedChat = chats?.find((c: Chat) => c.id === selectedChatId);

  const filteredChats = chats?.filter((chat: Chat) =>
    chat.contact?.phone?.includes(searchQuery) ||
    chat.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSendMessage = async () => {
    if (!reply.trim() || !selectedChatId) return;
    
    await sendMessage.mutateAsync({ chatId: selectedChatId, content: reply });
    setReply("");
  };

  const handleResolve = async () => {
    if (!selectedChatId) return;
    await resolveChat.mutateAsync(selectedChatId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Check if within 24h reply window
  const canReply = selectedChat?.can_reply ?? false;
  const replyWindowExpires = selectedChat?.reply_window_expires_at;

  if (!isConfigured) {
    return (
      <div className="min-h-screen">
        <TopBar title="Chats" subtitle="View and respond to WhatsApp conversations" />
        <div className="p-6">
          <Card className="p-6">
            <EmptyState
              icon={MessageSquare}
              title="Database not connected"
              description="Connect to your backend in Settings to view chats."
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
        title="Chats"
        subtitle="View and respond to WhatsApp conversations"
      />

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Chat List */}
        <div className="w-80 border-r border-border bg-card flex flex-col">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="border-b border-border px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {chats?.length || 0} conversations
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            {chatsLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : chatsError ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Failed to load chats
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              filteredChats.map((chat: Chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border p-4 text-left transition-colors hover:bg-accent",
                    selectedChatId === chat.id && "bg-accent"
                  )}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {chat.contact?.name ? chat.contact.name[0] : "?"}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {chat.contact?.name || chat.contact?.phone || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {chat.last_message_at
                          ? formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true })
                          : "—"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {chat.last_message || "No messages"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={chat.status === "open" ? "default" : "secondary"}>
                        {chat.status}
                      </Badge>
                      {chat.unread_count > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat View */}
        <div className="flex flex-1 flex-col">
          {!selectedChat ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Select a chat to view messages
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {selectedChat.contact?.name ? selectedChat.contact.name[0] : "?"}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {selectedChat.contact?.name || "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedChat.contact?.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedChat.tags?.map((tag: string) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                  {!isUser && (
                    <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Tag className="mr-2 h-4 w-4" />
                          Tag
                        </Button>
                      </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Tag</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Tag Name</Label>
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="e.g., VIP, Follow-up"
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => {
                            // TODO: Call backend API
                            setTagDialogOpen(false);
                            setNewTag("");
                          }}
                        >
                          Add Tag
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  )}
                  {!isUser && selectedChat.status === "open" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResolve}
                      disabled={resolveChat.isPending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Resolve
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-6">
                <div className="mx-auto max-w-2xl space-y-4">
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                          <Skeleton className="h-16 w-64 rounded-lg" />
                        </div>
                      ))}
                    </div>
                  ) : messages?.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      No messages yet
                    </div>
                  ) : (
                    messages?.map((message: Message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.direction === "outbound" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[320px] p-3",
                            message.direction === "outbound"
                              ? "bubble-outgoing"
                              : "bubble-incoming"
                          )}
                        >
                          {message.message_type === "template" && (
                            <span className="mb-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              TEMPLATE
                            </span>
                          )}
                          <p className="text-sm text-foreground">{message.content}</p>
                          <div className="mt-1 flex items-center justify-end gap-1">
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(message.created_at), "HH:mm")}
                            </span>
                            {message.direction === "outbound" && (
                              <span className="text-[10px] text-muted-foreground">
                                {message.status === "read" ? "✓✓" : message.status === "delivered" ? "✓✓" : "✓"}
                              </span>
                            )}
                          </div>
                          {message.error_message && (
                            <p className="mt-1 text-[10px] text-destructive">
                              {message.error_message}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Reply Input */}
              {!isUser && (
                <div className="border-t border-border bg-card p-4">
                  {canReply ? (
                    <>
                      <div className="mx-auto flex max-w-2xl gap-3">
                        <Input
                          placeholder="Type a message..."
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className="flex-1"
                          disabled={sendMessage.isPending}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!reply.trim() || sendMessage.isPending}
                        >
                          {sendMessage.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {replyWindowExpires && (
                        <p className="mx-auto mt-2 max-w-2xl text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Reply window expires {formatDistanceToNow(new Date(replyWindowExpires), { addSuffix: true })}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="mx-auto max-w-2xl text-center">
                      <p className="text-sm text-muted-foreground">
                        ⚠️ 24-hour reply window expired — Use a template to re-engage
                      </p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Send Template
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
