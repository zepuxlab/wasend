import { Outlet, Navigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";
import { Loader2 } from "lucide-react";

export function MainLayout() {
  const { isConfigured } = useSupabase();
  const { user, isLoading } = useAuth();

  // Show loading while checking auth
  if (isLoading && isConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to auth if not logged in (only if DB is configured)
  if (isConfigured && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <main className="ml-60 flex-1 bg-background">
        <Outlet />
      </main>
    </div>
  );
}
