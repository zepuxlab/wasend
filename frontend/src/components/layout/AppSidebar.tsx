import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Send,
  MessageSquare,
  FileText,
  Users,
  Activity,
  Settings,
  MessageCircle,
  UsersRound,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Broadcasts", href: "/broadcasts", icon: Send },
  { name: "Chats", href: "/chats", icon: MessageSquare },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Logs", href: "/logs", icon: Activity },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, isLoading, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'admin': return 'Админ';
      case 'manager': return 'Менеджер';
      case 'user': return 'Пользователь';
      default: return '';
    }
  };

  const getRoleVariant = (role: string | null): "destructive" | "default" | "secondary" => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <MessageCircle className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">Amprio Milano</span>
            <span className="text-xs text-sidebar-muted">WhatsApp Admin</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/" && location.pathname.startsWith(item.href));
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.name}
              </NavLink>
            );
          })}
          
          {/* Admin-only: Users */}
          {isAdmin && (
            <NavLink
              to="/users"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                location.pathname === "/users"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <UsersRound className="h-4 w-4 flex-shrink-0" />
              Пользователи
            </NavLink>
          )}
        </nav>

        {/* User info & Sign out */}
        <div className="border-t border-sidebar-border p-4 space-y-3">
          {user ? (
            <>
              <div className="px-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.email}
                </p>
                {isLoading ? (
                  <Skeleton className="h-5 w-16 mt-1" />
                ) : (
                  <Badge variant={getRoleVariant(userRole)} className="mt-1 text-xs">
                    {getRoleLabel(userRole)}
                  </Badge>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-muted-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Выйти
              </Button>
            </>
          ) : (
            <Button 
              variant="default" 
              size="sm" 
              className="w-full"
              onClick={() => navigate("/auth")}
            >
              Войти
            </Button>
          )}
          
          {/* Connection status */}
          <div className="flex items-center gap-2 rounded-lg bg-whatsapp-light px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-whatsapp" />
            <span className="text-xs font-medium text-foreground">Connected</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
