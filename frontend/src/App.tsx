import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Broadcasts from "@/pages/Broadcasts";
import CreateBroadcast from "@/pages/CreateBroadcast";
import CampaignDetail from "@/pages/CampaignDetail";
import Chats from "@/pages/Chats";
import Templates from "@/pages/Templates";
import Contacts from "@/pages/Contacts";
import Logs from "@/pages/Logs";
import Settings from "@/pages/Settings";
import Users from "@/pages/Users";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import { initSupabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AppContent() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initSupabase()
      .then((success) => {
        if (!success) {
          setInitError("Не удалось подключиться к бэкенду. Проверьте настройки.");
        }
      })
      .catch((err) => {
        setInitError(err.message || "Ошибка инициализации");
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Подключение к серверу...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <div className="text-destructive text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Ошибка подключения</h1>
          <p className="text-muted-foreground mb-4">{initError}</p>
          <div className="bg-muted p-4 rounded-lg text-left text-sm">
            <p className="font-medium mb-2">Проверьте:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Бэкенд сервер запущен</li>
              <li>URL бэкенда правильный</li>
              <li>CORS настроен на бэкенде</li>
            </ul>
            <p className="mt-3 text-xs">
              URL бэкенда: <code className="bg-background px-1 rounded">{localStorage.getItem('backend_api_url') || '/wasend/api'}</code>
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/broadcasts" element={<Broadcasts />} />
          <Route path="/broadcasts/create" element={<CreateBroadcast />} />
          <Route path="/broadcasts/:id" element={<CampaignDetail />} />
          <Route path="/chats" element={<Chats />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/users" element={<Users />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
