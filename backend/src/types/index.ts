export interface Template {
  id: string;
  whatsapp_template_id: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  status: 'approved' | 'pending' | 'rejected';
  components: any[];
  variables: string[];
  preview_text: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  template_id: string;
  template?: Template;
  status: 'draft' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';
  variable_mapping: Record<string, string>;
  rate_limit: {
    batch: number;
    delay_minutes: number;
    hourly_cap?: number;
    daily_cap?: number;
  };
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  contact_id: string;
  contact?: Contact;
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  variables: Record<string, string>;
  whatsapp_message_id?: string | null;
  error_message?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  phone: string;
  name?: string;
  country?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactList {
  id: string;
  name: string;
  description?: string;
  contact_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  contact_id: string;
  contact?: Contact;
  status: 'open' | 'closed';
  last_message_at?: string | null;
  reply_window_expires_at?: string | null;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video';
  content: string;
  whatsapp_message_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  campaign_id?: string;
  contact_id?: string;
  action: string;
  phone?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface CampaignStats {
  total_recipients: number;
  pending: number;
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  progress_percent: number;
}

export interface ApiError {
  error: boolean;
  message: string;
  code: string;
  details?: any;
}

export interface MetaWebhookMessage {
  from: string;
  type: string;
  text?: { body: string };
  timestamp: string;
  id?: string;
}

export interface MetaWebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id?: string;
}

