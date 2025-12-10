import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  MessageSquare, 
  Send, 
  Reply,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TelegramUser {
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  isBlocked: string;
  lastInteractionAt: string | null;
  createdAt: string;
}

interface ContactMessage {
  id: number;
  telegramId: string;
  message: string;
  status: string;
  adminResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
  user: {
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface TelegramStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalMessages: number;
  newMessages: number;
}

interface Broadcast {
  id: number;
  content: string;
  status: string;
  totalUsers: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
}

const API_BASE = "/api/telegram";

async function fetchTelegramStats(): Promise<TelegramStats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error("Stats olishda xatolik");
  return res.json();
}

async function fetchUsers(): Promise<TelegramUser[]> {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error("Foydalanuvchilarni olishda xatolik");
  return res.json();
}

async function fetchMessages(status?: string): Promise<ContactMessage[]> {
  const url = status ? `${API_BASE}/messages?status=${status}` : `${API_BASE}/messages`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Xabarlarni olishda xatolik");
  return res.json();
}

async function fetchBroadcasts(): Promise<Broadcast[]> {
  const res = await fetch(`${API_BASE}/broadcasts`);
  if (!res.ok) throw new Error("Broadcastlarni olishda xatolik");
  return res.json();
}

async function sendReply(id: number, response: string): Promise<any> {
  const res = await fetch(`${API_BASE}/messages/${id}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Javob yuborishda xatolik");
  }
  return res.json();
}

async function sendBroadcast(content: string): Promise<any> {
  const res = await fetch(`${API_BASE}/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Broadcast yuborishda xatolik");
  }
  return res.json();
}

export default function TelegramAdminPage() {
  const [replyDialogOpen, setReplyDialogOpen] = React.useState(false);
  const [selectedMessage, setSelectedMessage] = React.useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = React.useState("");
  const [broadcastText, setBroadcastText] = React.useState("");
  const [messageFilter, setMessageFilter] = React.useState<string>("all");
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["telegram-stats"],
    queryFn: fetchTelegramStats,
    refetchInterval: 30000,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["telegram-users"],
    queryFn: fetchUsers,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["telegram-messages", messageFilter],
    queryFn: () => fetchMessages(messageFilter === "all" ? undefined : messageFilter),
  });

  const { data: broadcasts = [], isLoading: broadcastsLoading } = useQuery({
    queryKey: ["telegram-broadcasts"],
    queryFn: fetchBroadcasts,
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, response }: { id: number; response: string }) => sendReply(id, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-messages"] });
      queryClient.invalidateQueries({ queryKey: ["telegram-stats"] });
      setReplyDialogOpen(false);
      setReplyText("");
      toast({ title: "Javob yuborildi" });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: sendBroadcast,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["telegram-broadcasts"] });
      queryClient.invalidateQueries({ queryKey: ["telegram-stats"] });
      setBroadcastText("");
      toast({ 
        title: "Broadcast yuborildi", 
        description: `${data.broadcast.sent} ta foydalanuvchiga yuborildi, ${data.broadcast.failed} ta xato` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const handleReply = (message: ContactMessage) => {
    setSelectedMessage(message);
    setReplyText("");
    setReplyDialogOpen(true);
  };

  const submitReply = () => {
    if (!selectedMessage || !replyText.trim()) return;
    replyMutation.mutate({ id: selectedMessage.id, response: replyText });
  };

  const submitBroadcast = () => {
    if (!broadcastText.trim()) return;
    if (!confirm(`${stats?.activeUsers || 0} ta foydalanuvchiga xabar yuboriladi. Davom etasizmi?`)) return;
    broadcastMutation.mutate(broadcastText);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("uz-UZ");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="destructive" data-testid="status-new">Yangi</Badge>;
      case "in_progress":
        return <Badge variant="secondary" data-testid="status-progress">Jarayonda</Badge>;
      case "resolved":
        return <Badge variant="default" className="bg-green-600" data-testid="status-resolved">Javob berildi</Badge>;
      default:
        return <Badge data-testid="status-unknown">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-3xl font-bold mb-6">Telegram Bot Boshqaruvi</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card data-testid="card-total-users">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Jami Foydalanuvchilar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold" data-testid="text-total-users">
                  {statsLoading ? "-" : stats?.totalUsers || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-active-users">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Faol Foydalanuvchilar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold" data-testid="text-active-users">
                  {statsLoading ? "-" : stats?.activeUsers || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-new-messages">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Yangi Murojaatlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-orange-500" />
                <span className="text-2xl font-bold" data-testid="text-new-messages">
                  {statsLoading ? "-" : stats?.newMessages || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-blocked-users">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bloklangan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold" data-testid="text-blocked-users">
                  {statsLoading ? "-" : stats?.blockedUsers || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="messages" className="space-y-4">
          <TabsList>
            <TabsTrigger value="messages" data-testid="tab-messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Murojaatlar
            </TabsTrigger>
            <TabsTrigger value="broadcast" data-testid="tab-broadcast">
              <Send className="h-4 w-4 mr-2" />
              Broadcast
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Foydalanuvchilar
            </TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Murojaatlar</CardTitle>
                <CardDescription>
                  Foydalanuvchilardan kelgan xabarlar
                </CardDescription>
                <div className="flex gap-2 mt-2">
                  <Button 
                    variant={messageFilter === "all" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setMessageFilter("all")}
                    data-testid="filter-all"
                  >
                    Barchasi
                  </Button>
                  <Button 
                    variant={messageFilter === "new" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setMessageFilter("new")}
                    data-testid="filter-new"
                  >
                    Yangi
                  </Button>
                  <Button 
                    variant={messageFilter === "resolved" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setMessageFilter("resolved")}
                    data-testid="filter-resolved"
                  >
                    Javob berilgan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {messagesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Hozircha murojaatlar yo'q
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Foydalanuvchi</TableHead>
                        <TableHead>Xabar</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sana</TableHead>
                        <TableHead>Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((msg) => (
                        <TableRow key={msg.id} data-testid={`row-message-${msg.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {msg.user?.firstName || "Noma'lum"}
                              </p>
                              {msg.user?.username && (
                                <p className="text-sm text-muted-foreground">
                                  @{msg.user.username}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="truncate">{msg.message}</p>
                            {msg.adminResponse && (
                              <p className="text-sm text-green-600 mt-1">
                                Javob: {msg.adminResponse.substring(0, 50)}...
                              </p>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(msg.status)}</TableCell>
                          <TableCell className="text-sm">
                            {formatDate(msg.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReply(msg)}
                              disabled={msg.status === "resolved"}
                              data-testid={`button-reply-${msg.id}`}
                            >
                              <Reply className="h-4 w-4 mr-1" />
                              Javob
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Broadcast Tab */}
          <TabsContent value="broadcast">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Yangi Broadcast</CardTitle>
                  <CardDescription>
                    Barcha faol foydalanuvchilarga xabar yuborish
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Xabar matnini kiriting..."
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    rows={6}
                    data-testid="input-broadcast"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {stats?.activeUsers || 0} ta foydalanuvchiga yuboriladi
                    </p>
                    <Button 
                      onClick={submitBroadcast}
                      disabled={!broadcastText.trim() || broadcastMutation.isPending}
                      data-testid="button-send-broadcast"
                    >
                      {broadcastMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Yuborish
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Broadcast Tarixi</CardTitle>
                  <CardDescription>
                    Yuborilgan xabarlar tarixi
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {broadcastsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : broadcasts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Hali broadcast yuborilmagan
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {broadcasts.slice(0, 10).map((b) => (
                        <div key={b.id} className="border rounded-lg p-3" data-testid={`broadcast-${b.id}`}>
                          <p className="text-sm mb-2">{b.content.substring(0, 100)}...</p>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {b.sentCount}/{b.totalUsers} yuborildi
                            </span>
                            <span>{formatDate(b.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Foydalanuvchilar</CardTitle>
                <CardDescription>
                  Bot foydalanuvchilari ro'yxati
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Hali foydalanuvchilar yo'q
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Ism</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Oxirgi faollik</TableHead>
                        <TableHead>Qo'shilgan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.telegramId} data-testid={`row-user-${user.telegramId}`}>
                          <TableCell className="font-mono text-sm">
                            {user.telegramId}
                          </TableCell>
                          <TableCell>
                            {user.firstName} {user.lastName || ""}
                          </TableCell>
                          <TableCell>
                            {user.username ? `@${user.username}` : "-"}
                          </TableCell>
                          <TableCell>
                            {user.isBlocked === "true" ? (
                              <Badge variant="destructive">Bloklangan</Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-600">Faol</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(user.lastInteractionAt)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(user.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Reply Dialog */}
        <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Javob yozish</DialogTitle>
              <DialogDescription>
                {selectedMessage?.user?.firstName || "Foydalanuvchi"}ga javob
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Murojaat:</p>
                <p className="text-sm">{selectedMessage?.message}</p>
              </div>
              <Textarea
                placeholder="Javobingizni yozing..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                data-testid="input-reply"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
                Bekor qilish
              </Button>
              <Button 
                onClick={submitReply}
                disabled={!replyText.trim() || replyMutation.isPending}
                data-testid="button-submit-reply"
              >
                {replyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Yuborish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
