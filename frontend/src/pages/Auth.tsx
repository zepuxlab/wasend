import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useSupabase } from "@/hooks/useSupabase";
import { Loader2, MessageSquare } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { supabase, isConfigured } = useSupabase();
  
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Check if already logged in
  useEffect(() => {
    if (!supabase) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast({ title: "Ошибка", description: "База данных не подключена", variant: "destructive" });
      return;
    }

    if (!email || !password) {
      toast({ title: "Ошибка", description: "Заполните все поля", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast({ title: "Ошибка входа", description: "Неверный email или пароль", variant: "destructive" });
      } else if (error.message.includes("Email not confirmed")) {
        toast({ title: "Ошибка входа", description: "Email не подтверждён. Проверьте почту.", variant: "destructive" });
      } else {
        toast({ title: "Ошибка входа", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Добро пожаловать!", description: "Вы успешно вошли в систему" });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast({ title: "Ошибка", description: "База данных не подключена", variant: "destructive" });
      return;
    }

    if (!email || !password) {
      toast({ title: "Ошибка", description: "Заполните все обязательные поля", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Ошибка", description: "Пароль должен быть минимум 6 символов", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    
    // Get the correct redirect URL
    const redirectUrl = window.location.origin + (window.location.pathname.startsWith('/wasend') ? '/wasend/auth' : '/auth');
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName || email.split('@')[0],
        }
      }
    });
    setIsLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast({ title: "Ошибка", description: "Пользователь с таким email уже существует", variant: "destructive" });
      } else {
        toast({ title: "Ошибка регистрации", description: error.message, variant: "destructive" });
      }
    } else if (data.user) {
      // Try to sign in immediately after registration
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        toast({ 
          title: "Регистрация успешна!", 
          description: "Теперь войдите с вашими данными" 
        });
      } else {
        toast({ 
          title: "Добро пожаловать!", 
          description: "Вы зарегистрированы. Дождитесь назначения прав администратором." 
        });
      }
    }
  };

  if (!isConfigured || !supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Подключение к серверу...</h2>
          <p className="text-muted-foreground mb-4">
            Если это сообщение не исчезает, проверьте подключение к бэкенду
          </p>
          <Button onClick={() => window.location.reload()}>
            Обновить страницу
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">WhatsApp Admin</h1>
          </div>
          <p className="text-muted-foreground">Панель управления рассылками</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Вход</TabsTrigger>
            <TabsTrigger value="signup">Регистрация</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Пароль</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Войти
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Имя (опционально)</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Иван Иванов"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email *</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Пароль *</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Минимум 6 символов"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Зарегистрироваться
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Новые пользователи получают роль "user". Админ может изменить роль.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
