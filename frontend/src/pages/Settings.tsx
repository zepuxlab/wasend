import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  XCircle,
  Info,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const [backendUrl, setBackendUrl] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  
  const supabaseConnected = isSupabaseConfigured();
  const { userRole, isAdmin } = useAuth();
  const isManager = userRole === 'manager';
  
  // Load saved config
  useEffect(() => {
    // Load Backend API URL
    setBackendUrl(localStorage.getItem('backend_api_url') || 'http://localhost:3001/api');
    
    // Load WhatsApp settings from localStorage
    setWhatsappToken(localStorage.getItem('whatsapp_token') || '');
    setPhoneNumberId(localStorage.getItem('whatsapp_phone_number_id') || '');
    setBusinessAccountId(localStorage.getItem('whatsapp_business_account_id') || '');
    setWebhookUrl(localStorage.getItem('whatsapp_webhook_url') || '');
  }, []);

  const handleSaveBackendUrl = () => {
    localStorage.setItem('backend_api_url', backendUrl);
    toast({
      title: "Сохранено",
      description: "URL бэкенда сохранен. Перезагрузите страницу для применения.",
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано",
      description: `${label} скопировано в буфер`,
    });
  };

  const handleSaveWhatsAppSettings = () => {
    localStorage.setItem('whatsapp_token', whatsappToken);
    localStorage.setItem('whatsapp_phone_number_id', phoneNumberId);
    localStorage.setItem('whatsapp_business_account_id', businessAccountId);
    localStorage.setItem('whatsapp_webhook_url', webhookUrl);
    toast({
      title: "Сохранено",
      description: "Настройки WhatsApp сохранены",
    });
  };

  const copySchema = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    toast({
      title: "Скопировано",
      description: "SQL схема скопирована в буфер обмена",
    });
  };

  return (
    <div className="min-h-screen">
      <TopBar
        title="Настройки"
        subtitle="Конфигурация API и подключений"
      />

      <div className="p-6 max-w-4xl">
        {/* Connection Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Supabase Status */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              {supabaseConnected ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <div className="flex-1">
                <p className="font-medium text-foreground">База данных</p>
                <p className="text-sm text-muted-foreground">
                  {supabaseConnected ? "Supabase подключен" : "Не настроен"}
                </p>
              </div>
              <Badge className={supabaseConnected ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}>
                {supabaseConnected ? "OK" : "Настройте"}
              </Badge>
            </div>
            {!supabaseConnected && (
              <p className="text-xs text-muted-foreground mt-2">
                Отредактируйте <code className="bg-muted px-1 rounded">src/lib/supabase.ts</code>
              </p>
            )}
          </Card>

          {/* Backend Status */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Backend API</p>
                <p className="text-sm text-muted-foreground truncate max-w-[200px]">{backendUrl}</p>
              </div>
              <Badge className="bg-primary/10 text-primary">Настроен</Badge>
            </div>
          </Card>
        </div>

        {/* SQL Schema - Always visible */}
        <Card className="p-4 mb-6 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">📋 SQL Схема базы данных</h3>
              <p className="text-sm text-muted-foreground">
                Скопируйте и выполните в Supabase SQL Editor для создания таблиц
              </p>
            </div>
            <Button onClick={copySchema} variant="default">
              <Copy className="mr-2 h-4 w-4" />
              Копировать SQL
            </Button>
          </div>
        </Card>

        <Tabs defaultValue={isManager ? "campaigns" : "backend"} className="space-y-6">
          <TabsList>
            {!isManager && (
              <>
                <TabsTrigger value="backend">Backend API</TabsTrigger>
                <TabsTrigger value="whatsapp">WhatsApp API</TabsTrigger>
                <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              </>
            )}
            <TabsTrigger value="campaigns">Настройки кампаний</TabsTrigger>
          </TabsList>

          {/* Backend API Tab - только для админов */}
          {!isManager && (
            <TabsContent value="backend" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-base font-semibold text-foreground">
                Backend API Server
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                URL вашего Node.js сервера, который обрабатывает запросы к Meta API
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="backend-url">Backend URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="backend-url"
                      placeholder="http://localhost:3001/api"
                      value={backendUrl}
                      onChange={(e) => setBackendUrl(e.target.value)}
                      className="font-mono"
                    />
                    <Button onClick={handleSaveBackendUrl}>
                      Сохранить
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Пример: <code>http://localhost:3001/api</code> или <code>https://api.yourdomain.com</code>
                  </p>
                </div>
              </div>
            </Card>

            {/* Info about Supabase config */}
            <Card className="p-6 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Настройка Supabase
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Supabase настраивается в коде, а не через UI. Отредактируйте файл:
                  </p>
                  <code className="block bg-muted p-3 rounded text-sm">
                    src/lib/supabase.ts
                  </code>
                  <p className="text-sm text-muted-foreground mt-3">
                    Укажите <code>SUPABASE_URL</code> и <code>SUPABASE_ANON_KEY</code> из вашего Supabase Dashboard → Settings → API
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
          )}

          {/* WhatsApp API Tab - только для админов */}
          {!isManager && (
            <TabsContent value="whatsapp" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-base font-semibold text-foreground">
                WhatsApp Cloud API (для справки)
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Эти данные используются бэкендом. Храните их в .env файле бэкенда, здесь только для справки.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wa-token">Access Token</Label>
                  <Input
                    id="wa-token"
                    type="password"
                    placeholder="EAAxxxxxxxx..."
                    value={whatsappToken}
                    onChange={(e) => setWhatsappToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Permanent token из Meta Business Settings
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone-id">Phone Number ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="phone-id"
                      placeholder="123456789012345"
                      value={phoneNumberId}
                      onChange={(e) => setPhoneNumberId(e.target.value)}
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(phoneNumberId, "Phone Number ID")}
                      disabled={!phoneNumberId}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-id">Business Account ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="business-id"
                      placeholder="987654321098765"
                      value={businessAccountId}
                      onChange={(e) => setBusinessAccountId(e.target.value)}
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(businessAccountId, "Business Account ID")}
                      disabled={!businessAccountId}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button onClick={handleSaveWhatsAppSettings}>
                  Сохранить локально
                </Button>
              </div>
            </Card>

            {/* Connection Status */}
            <Card className="p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">
                Статус подключения
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    {whatsappToken ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">API Token</p>
                      <p className="text-sm text-muted-foreground">
                        {whatsappToken ? "Токен сохранен локально" : "Не настроен"}
                      </p>
                    </div>
                  </div>
                  <Badge className={whatsappToken ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
                    {whatsappToken ? "Сохранен" : "Отсутствует"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Meta Dashboard</p>
                      <p className="text-sm text-muted-foreground">
                        Получите токены здесь
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Открыть
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          </TabsContent>
          )}

          {/* Webhooks Tab - только для админов */}
          {!isManager && (
            <TabsContent value="webhooks" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">
                📖 Документация по Webhook
              </h3>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                  {WEBHOOK_DOCS}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">
                Webhook URL
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                URL вашего бэкенда для приёма событий от Meta
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://your-server.com/api/webhook"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Button 
                      variant="outline"
                      onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
                      disabled={!webhookUrl}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button onClick={handleSaveWhatsAppSettings}>
                  Сохранить
                </Button>
              </div>
            </Card>
          </TabsContent>
          )}

          {/* Campaign Settings Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            {/* UTM Settings */}
            <Card className="p-6">
              <h3 className="text-base font-semibold text-foreground">
                UTM параметры по умолчанию
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Применяются ко всем ссылкам в кампаниях
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="utm-source">UTM Source</Label>
                  <Input id="utm-source" defaultValue="whatsapp" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utm-medium">UTM Medium</Label>
                  <Input id="utm-medium" defaultValue="broadcast" />
                </div>
              </div>
            </Card>

            {/* Rate Limits */}
            <Card className="p-6">
              <h3 className="text-base font-semibold text-foreground">
                Rate Limits по умолчанию
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Настройки для новых кампаний
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-size">Сообщений в батче</Label>
                  <Input id="batch-size" type="number" defaultValue="50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-delay">Задержка между батчами (сек)</Label>
                  <Input id="batch-delay" type="number" defaultValue="60" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourly-cap">Лимит в час</Label>
                  <Input id="hourly-cap" type="number" defaultValue="1000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-cap">Лимит в день</Label>
                  <Input id="daily-cap" type="number" defaultValue="10000" />
                </div>
              </div>
            </Card>

            {/* Cost Limits */}
            <Card className="p-6">
              <h3 className="text-base font-semibold text-foreground">
                Лимиты расходов
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Оповещения и автоматические ограничения
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Предупреждение о дневном лимите</p>
                    <p className="text-sm text-muted-foreground">
                      Уведомление при превышении порога
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="daily-limit">Дневной лимит (€)</Label>
                  <Input
                    id="daily-limit"
                    type="number"
                    defaultValue="100"
                    className="w-32"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      Пауза при достижении лимита
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Автоматически приостанавливать рассылки
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// SQL Schema to copy
const SQL_SCHEMA = `-- WhatsApp Campaign Management System Schema
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER ROLES & AUTHENTICATION
-- ============================================

-- Role enum: admin (full access), manager (campaigns), user (view only)
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- User profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = _user_id 
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'manager' THEN 2 
      WHEN 'user' THEN 3 
    END
  LIMIT 1
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  -- Default role is 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- MAIN TABLES
-- ============================================

-- Enum types
CREATE TYPE campaign_status AS ENUM ('draft', 'ready', 'running', 'paused', 'stopped', 'completed', 'failed');
CREATE TYPE message_status AS ENUM ('pending', 'queued', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE template_status AS ENUM ('approved', 'pending', 'rejected');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE message_type AS ENUM ('text', 'template', 'image', 'document');
CREATE TYPE chat_status AS ENUM ('open', 'closed');

-- Settings table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  country TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  opt_in BOOLEAN DEFAULT FALSE,
  opt_in_at TIMESTAMPTZ,
  last_interaction TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX idx_contacts_opt_in ON contacts(opt_in);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contacts" ON contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers and admins can manage contacts" ON contacts
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- Contact lists
CREATE TABLE contact_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lists" ON contact_lists
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers and admins can manage lists" ON contact_lists
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- Contact list members (junction table)
CREATE TABLE contact_list_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES contact_lists(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, contact_id)
);

ALTER TABLE contact_list_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view members" ON contact_list_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers and admins can manage members" ON contact_list_members
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- WhatsApp templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_template_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  language TEXT NOT NULL,
  status template_status DEFAULT 'pending',
  components JSONB DEFAULT '[]',
  variables TEXT[] DEFAULT '{}',
  preview_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_status ON templates(status);
CREATE INDEX idx_templates_name ON templates(name);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates" ON templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage templates" ON templates
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  template_id UUID REFERENCES templates(id),
  status campaign_status DEFAULT 'draft',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  variable_mapping JSONB DEFAULT '{}',
  rate_limit_per_batch INTEGER DEFAULT 50,
  rate_limit_delay_seconds INTEGER DEFAULT 60,
  hourly_cap INTEGER,
  daily_cap INTEGER,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view campaigns" ON campaigns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers and admins can manage campaigns" ON campaigns
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- Campaign recipients
CREATE TABLE campaign_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  status message_status DEFAULT 'pending',
  variables JSONB DEFAULT '{}',
  whatsapp_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, contact_id)
);

CREATE INDEX idx_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_recipients_status ON campaign_recipients(status);
CREATE INDEX idx_recipients_whatsapp_id ON campaign_recipients(whatsapp_message_id);

ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recipients" ON campaign_recipients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers and admins can manage recipients" ON campaign_recipients
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- Message queue for batch processing
CREATE TABLE message_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES campaign_recipients(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  locked_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_queue_scheduled ON message_queue(scheduled_for) WHERE locked_until IS NULL;
CREATE INDEX idx_queue_campaign ON message_queue(campaign_id);

-- Activity logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  phone TEXT,
  details JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_logs_campaign ON activity_logs(campaign_id);
CREATE INDEX idx_logs_action ON activity_logs(action);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view logs" ON activity_logs
  FOR SELECT TO authenticated USING (true);

-- Chats
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  status chat_status DEFAULT 'open',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chats_contact ON chats(contact_id);
CREATE INDEX idx_chats_status ON chats(status);
CREATE INDEX idx_chats_last_message ON chats(last_message_at DESC);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view chats" ON chats
  FOR SELECT TO authenticated USING (true);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  whatsapp_message_id TEXT,
  direction message_direction NOT NULL,
  content TEXT NOT NULL,
  message_type message_type DEFAULT 'text',
  template_name TEXT,
  status message_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_whatsapp_id ON messages(whatsapp_message_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view messages" ON messages
  FOR SELECT TO authenticated USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get next batch of messages to send
CREATE OR REPLACE FUNCTION get_next_queue_batch(
  p_campaign_id UUID,
  p_batch_size INTEGER,
  p_worker_id TEXT
)
RETURNS SETOF message_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE message_queue
  SET 
    locked_until = NOW() + INTERVAL '5 minutes',
    locked_by = p_worker_id,
    updated_at = NOW()
  WHERE id IN (
    SELECT id FROM message_queue
    WHERE campaign_id = p_campaign_id
      AND (locked_until IS NULL OR locked_until < NOW())
      AND attempts < max_attempts
      AND scheduled_for <= NOW()
    ORDER BY priority DESC, scheduled_for ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Update campaign stats
CREATE OR REPLACE FUNCTION update_campaign_stats(p_campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE campaigns
  SET
    sent_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = p_campaign_id AND status IN ('sent', 'delivered', 'read')),
    delivered_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = p_campaign_id AND status IN ('delivered', 'read')),
    read_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = p_campaign_id AND status = 'read'),
    failed_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = p_campaign_id AND status = 'failed'),
    updated_at = NOW()
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_contact_lists_updated_at BEFORE UPDATE ON contact_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_campaign_recipients_updated_at BEFORE UPDATE ON campaign_recipients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_message_queue_updated_at BEFORE UPDATE ON message_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE campaign_recipients;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
`;

const WEBHOOK_DOCS = `## 🔗 Настройка Webhook для приёма сообщений

### Что такое Webhook?
Webhook — это URL на вашем сервере, куда Meta отправляет уведомления о входящих сообщениях и статусах доставки.

### Как настроить:

#### 1. Создайте endpoint на вашем сервере

\`\`\`javascript
// POST /api/webhook
app.post('/api/webhook', (req, res) => {
  const { entry } = req.body;
  
  for (const e of entry) {
    for (const change of e.changes) {
      if (change.value.messages) {
        // Входящее сообщение
        handleIncomingMessage(change.value.messages[0]);
      }
      if (change.value.statuses) {
        // Статус доставки (sent, delivered, read)
        handleStatusUpdate(change.value.statuses[0]);
      }
    }
  }
  
  res.sendStatus(200);
});

// GET для верификации
app.get('/api/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === YOUR_VERIFY_TOKEN) {
    res.send(challenge);
  } else {
    res.sendStatus(403);
  }
});
\`\`\`

#### 2. Настройте в Meta Business

1. Перейдите в [Meta for Developers](https://developers.facebook.com)
2. Выберите ваше приложение → WhatsApp → Configuration
3. В разделе "Webhook" нажмите "Edit"
4. Введите:
   - **Callback URL**: \`https://your-domain.com/api/webhook\`
   - **Verify Token**: ваш секретный токен
5. Подпишитесь на события: \`messages\`, \`message_template_status_update\`

#### 3. Обработка событий

| Событие | Описание |
|---------|----------|
| \`messages\` | Входящие сообщения от клиентов |
| \`message_template_status_update\` | Изменение статуса шаблона |
| \`statuses\` | sent → delivered → read |

#### 4. Структура входящего сообщения

\`\`\`json
{
  "from": "393331234567",
  "id": "wamid.xxx",
  "timestamp": "1234567890",
  "type": "text",
  "text": { "body": "Привет!" }
}
\`\`\`

⚠️ **Важно**: Webhook должен отвечать 200 OK в течение 20 секунд, иначе Meta повторит запрос.
`;
