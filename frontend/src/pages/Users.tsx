import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Users as UsersIcon, Shield, Trash2, ShieldAlert } from "lucide-react";
import { useSupabase } from "@/hooks/useSupabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

type AppRole = 'admin' | 'manager' | 'user';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: AppRole;
}

export default function Users() {
  const navigate = useNavigate();
  const { supabase, isConfigured } = useSupabase();
  const { user, userRole, isAdmin } = useAuth();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (supabase && isConfigured) {
      fetchUsers();
    }
  }, [supabase, isConfigured]);

  const fetchUsers = async () => {
    if (!supabase) return;
    
    setIsLoading(true);
    try {
      // Get profiles with roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');

      if (profilesError) throw profilesError;

      // Get roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: (userRole?.role || 'user') as AppRole
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (!supabase || !isAdmin) return;
    
    if (userId === user?.id) {
      toast({ title: "Ошибка", description: "Нельзя изменить свою роль", variant: "destructive" });
      return;
    }

    setUpdatingUserId(userId);
    try {
      // Check if role exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));

      toast({ title: "Роль обновлена", description: `Пользователю назначена роль: ${newRole}` });
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!supabase || !isAdmin) return;
    
    if (userId === user?.id) {
      toast({ title: "Ошибка", description: "Нельзя удалить себя", variant: "destructive" });
      return;
    }

    try {
      // Delete profile (cascade will delete role)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== userId));
      toast({ title: "Пользователь удалён" });
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      default: return 'secondary';
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'Админ';
      case 'manager': return 'Менеджер';
      default: return 'Пользователь';
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen">
        <TopBar title="Пользователи" subtitle="Управление пользователями системы" />
        <div className="p-6">
          <Card className="p-6">
            <EmptyState
              icon={UsersIcon}
              title="База данных не подключена"
              description="Подключите Supabase в настройках"
              action={{ label: "Настройки", onClick: () => navigate("/settings") }}
            />
          </Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <TopBar title="Пользователи" subtitle="Управление пользователями системы" />
        <div className="p-6">
          <Card className="p-6">
            <EmptyState
              icon={ShieldAlert}
              title="Доступ запрещён"
              description="Только администраторы могут управлять пользователями"
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar
        title="Пользователи"
        subtitle="Управление пользователями и ролями"
      />

      <div className="p-6">
        {/* Stats */}
        <div className="mb-6 flex gap-4">
          <Card className="px-4 py-3">
            <p className="text-sm text-muted-foreground">Всего</p>
            <p className="text-2xl font-semibold">
              {isLoading ? <Skeleton className="h-8 w-12" /> : users.length}
            </p>
          </Card>
          <Card className="px-4 py-3">
            <p className="text-sm text-muted-foreground">Админы</p>
            <p className="text-2xl font-semibold text-destructive">
              {isLoading ? <Skeleton className="h-8 w-12" /> : users.filter(u => u.role === 'admin').length}
            </p>
          </Card>
          <Card className="px-4 py-3">
            <p className="text-sm text-muted-foreground">Менеджеры</p>
            <p className="text-2xl font-semibold text-primary">
              {isLoading ? <Skeleton className="h-8 w-12" /> : users.filter(u => u.role === 'manager').length}
            </p>
          </Card>
          <Card className="px-4 py-3">
            <p className="text-sm text-muted-foreground">Пользователи</p>
            <p className="text-2xl font-semibold text-muted-foreground">
              {isLoading ? <Skeleton className="h-8 w-12" /> : users.filter(u => u.role === 'user').length}
            </p>
          </Card>
        </div>

        {/* Loading */}
        {isLoading && (
          <Card className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Card>
        )}

        {/* Table */}
        {!isLoading && users.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Имя</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Дата регистрации</TableHead>
                  <TableHead className="w-[100px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.email}
                      {u.id === user?.id && (
                        <Badge variant="outline" className="ml-2 text-xs">Вы</Badge>
                      )}
                    </TableCell>
                    <TableCell>{u.full_name || "—"}</TableCell>
                    <TableCell>
                      {u.id === user?.id ? (
                        <Badge variant={getRoleBadgeVariant(u.role)}>
                          {getRoleLabel(u.role)}
                        </Badge>
                      ) : (
                        <Select
                          value={u.role}
                          onValueChange={(value) => handleRoleChange(u.id, value as AppRole)}
                          disabled={updatingUserId === u.id}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-destructive" />
                                Админ
                              </div>
                            </SelectItem>
                            <SelectItem value="manager">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" />
                                Менеджер
                              </div>
                            </SelectItem>
                            <SelectItem value="user">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-muted-foreground" />
                                Пользователь
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(u.created_at), "dd.MM.yyyy")}
                    </TableCell>
                    <TableCell>
                      {u.id !== user?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Пользователь {u.email} будет удалён. Это действие нельзя отменить.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(u.id)}>
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Empty */}
        {!isLoading && users.length === 0 && (
          <Card className="p-6">
            <EmptyState
              icon={UsersIcon}
              title="Нет пользователей"
              description="Пользователи появятся после регистрации"
            />
          </Card>
        )}
      </div>
    </div>
  );
}
