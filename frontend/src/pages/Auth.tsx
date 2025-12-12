import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useSupabase } from "@/hooks/useSupabase";
import { Loader2, MessageSquare, Copy, Check } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { supabase, isConfigured } = useSupabase();
  
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [copied, setCopied] = useState(false);

  // Check for Zoho OAuth code in URL
  const zohoCode = searchParams.get('code');
  const zohoError = searchParams.get('error');
  const [savedZohoCode, setSavedZohoCode] = useState<string | null>(null);

  // Save Zoho code immediately when page loads (before any redirects)
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      // Save to localStorage immediately
      localStorage.setItem('zoho_oauth_code', code);
      localStorage.setItem('zoho_oauth_code_timestamp', Date.now().toString());
      setSavedZohoCode(code);
      
      // Clean URL but keep code in state
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('code');
      if (newSearchParams.toString()) {
        navigate(`/wasend/auth?${newSearchParams.toString()}`, { replace: true });
      } else {
        navigate('/wasend/auth', { replace: true });
      }
    } else {
      // Try to load from localStorage if not in URL
      const savedCode = localStorage.getItem('zoho_oauth_code');
      const savedTimestamp = localStorage.getItem('zoho_oauth_code_timestamp');
      if (savedCode && savedTimestamp) {
        const timestamp = parseInt(savedTimestamp, 10);
        // Keep code for 10 minutes
        if (Date.now() - timestamp < 10 * 60 * 1000) {
          setSavedZohoCode(savedCode);
        } else {
          localStorage.removeItem('zoho_oauth_code');
          localStorage.removeItem('zoho_oauth_code_timestamp');
        }
      }
    }
  }, []); // Run only once on mount

  // Check if already logged in (but not if we have Zoho code)
  useEffect(() => {
    if (!supabase || savedZohoCode) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && !savedZohoCode) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, navigate, savedZohoCode]);

  // Handle Zoho OAuth callback (use saved code if available)
  const displayCode = savedZohoCode || zohoCode;
  if (displayCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl p-6">
          <div className="text-center mb-6 pt-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img 
                src="/wasend/relayne-logo.svg" 
                alt="Relayne Logo" 
                className="h-[48px] w-[48px]"
              />
              <h1 className="text-2xl font-bold">Zoho OAuth Authorization Code</h1>
            </div>
            <p className="text-muted-foreground">Copy this code to exchange it for Refresh Token</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Authorization Code:</Label>
              <div className="flex gap-2">
                <Input
                  value={displayCode}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(displayCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-semibold mb-2">Next steps:</p>
              <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Copy the authorization code above</li>
                <li>Use it in the curl command or Postman to exchange for Refresh Token</li>
                <li>See ZOHO_SETUP.md for detailed instructions</li>
              </ol>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-semibold mb-2">Example curl command:</p>
              <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`curl -X POST "https://accounts.zoho.com/oauth/v2/token" \\
  -d "grant_type=authorization_code" \\
  -d "client_id=YOUR_CLIENT_ID" \\
  -d "client_secret=YOUR_CLIENT_SECRET" \\
  -d "redirect_uri=https://office.ampriomilano.com/wasend/auth" \\
  -d "code=${displayCode}"`}
              </pre>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                localStorage.removeItem('zoho_oauth_code');
                localStorage.removeItem('zoho_oauth_code_timestamp');
                setSavedZohoCode(null);
                navigate('/wasend/auth', { replace: true });
              }}
            >
              Back to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Handle Zoho OAuth error
  if (zohoError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center mb-6 pt-4">
            <h1 className="text-2xl font-bold text-destructive mb-2">Zoho OAuth Error</h1>
            <p className="text-muted-foreground">Error: {zohoError}</p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              searchParams.delete('error');
              navigate(`/wasend/auth?${searchParams.toString()}`, { replace: true });
            }}
          >
            Back to Login
          </Button>
        </Card>
      </div>
    );
  }

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
        <div className="text-center mb-6 pt-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img 
              src="/relayne-logo.svg" 
              alt="Relayne Logo" 
              className="h-[48px] w-[48px]"
            />
            <h1 className="text-2xl font-bold">Relayne</h1>
          </div>
          <p className="text-muted-foreground">Broadcast Panel</p>
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
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
