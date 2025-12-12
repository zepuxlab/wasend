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
      toast({ title: "Error", description: "Database not connected", variant: "destructive" });
      return;
    }

    if (!email || !password) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast({ title: "Login Error", description: "Invalid email or password", variant: "destructive" });
      } else if (error.message.includes("Email not confirmed")) {
        toast({ title: "Login Error", description: "Email not confirmed. Please check your email.", variant: "destructive" });
      } else {
        toast({ title: "Login Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Welcome!", description: "You have successfully logged in" });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast({ title: "Error", description: "Database not connected", variant: "destructive" });
      return;
    }

    if (!email || !password) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
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
        toast({ title: "Error", description: "User with this email already exists", variant: "destructive" });
      } else {
        toast({ title: "Registration Error", description: error.message, variant: "destructive" });
      }
    } else if (data.user) {
      // Try to sign in immediately after registration
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        toast({ 
          title: "Registration Successful!", 
          description: "Please log in with your credentials" 
        });
      } else {
        toast({ 
          title: "Welcome!", 
          description: "You are registered. Please wait for admin to assign permissions." 
        });
      }
    }
  };

  if (!isConfigured || !supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Connecting to server...</h2>
          <p className="text-muted-foreground mb-4">
            If this message doesn't disappear, please check backend connection
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
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
            <img 
              src="https://office.ampriomilano.com/b2b/images/AM_logo_mini.svg" 
              alt="AMSendler Logo" 
              className="h-[38px] w-[38px]"
              style={{ filter: 'brightness(0) saturate(100%) invert(30%) sepia(68%) saturate(1234%) hue-rotate(113deg) brightness(95%) contrast(85%)' }}
            />
            <h1 className="text-2xl font-bold">WhatsApp Sendler</h1>
          </div>
          <p className="text-muted-foreground">amSendler</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
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
                <Label htmlFor="login-password">Password</Label>
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
                Login
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name (optional)</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
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
                <Label htmlFor="signup-password">Password *</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign Up
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                New users receive "user" role. Admin can change the role.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
