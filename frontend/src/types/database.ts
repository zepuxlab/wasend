export type CampaignStatus = 'draft' | 'ready' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';
export type MessageStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
export type TemplateStatus = 'approved' | 'pending' | 'rejected';

export interface Database {
  public: {
    Tables: {
      settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          phone: string;
          name: string | null;
          country: string | null;
          tags: string[];
          custom_fields: Record<string, string>;
          opt_in: boolean;
          opt_in_at: string | null;
          last_interaction: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          name?: string | null;
          country?: string | null;
          tags?: string[];
          custom_fields?: Record<string, string>;
          opt_in?: boolean;
          opt_in_at?: string | null;
          last_interaction?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          name?: string | null;
          country?: string | null;
          tags?: string[];
          custom_fields?: Record<string, string>;
          opt_in?: boolean;
          opt_in_at?: string | null;
          last_interaction?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      contact_lists: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      contact_list_members: {
        Row: {
          id: string;
          list_id: string;
          contact_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          contact_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          list_id?: string;
          contact_id?: string;
          created_at?: string;
        };
      };
      templates: {
        Row: {
          id: string;
          whatsapp_template_id: string;
          name: string;
          category: string;
          language: string;
          status: TemplateStatus;
          components: Record<string, unknown>[];
          variables: string[];
          preview_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          whatsapp_template_id: string;
          name: string;
          category: string;
          language: string;
          status?: TemplateStatus;
          components?: Record<string, unknown>[];
          variables?: string[];
          preview_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          whatsapp_template_id?: string;
          name?: string;
          category?: string;
          language?: string;
          status?: TemplateStatus;
          components?: Record<string, unknown>[];
          variables?: string[];
          preview_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          template_id: string;
          status: CampaignStatus;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          variable_mapping: Record<string, string>;
          rate_limit_per_batch: number;
          rate_limit_delay_seconds: number;
          hourly_cap: number | null;
          daily_cap: number | null;
          total_recipients: number;
          sent_count: number;
          delivered_count: number;
          read_count: number;
          failed_count: number;
          scheduled_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          template_id: string;
          status?: CampaignStatus;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          variable_mapping?: Record<string, string>;
          rate_limit_per_batch?: number;
          rate_limit_delay_seconds?: number;
          hourly_cap?: number | null;
          daily_cap?: number | null;
          total_recipients?: number;
          sent_count?: number;
          delivered_count?: number;
          read_count?: number;
          failed_count?: number;
          scheduled_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          template_id?: string;
          status?: CampaignStatus;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          variable_mapping?: Record<string, string>;
          rate_limit_per_batch?: number;
          rate_limit_delay_seconds?: number;
          hourly_cap?: number | null;
          daily_cap?: number | null;
          total_recipients?: number;
          sent_count?: number;
          delivered_count?: number;
          read_count?: number;
          failed_count?: number;
          scheduled_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaign_recipients: {
        Row: {
          id: string;
          campaign_id: string;
          contact_id: string;
          status: MessageStatus;
          variables: Record<string, string>;
          whatsapp_message_id: string | null;
          error_message: string | null;
          sent_at: string | null;
          delivered_at: string | null;
          read_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          contact_id: string;
          status?: MessageStatus;
          variables?: Record<string, string>;
          whatsapp_message_id?: string | null;
          error_message?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          contact_id?: string;
          status?: MessageStatus;
          variables?: Record<string, string>;
          whatsapp_message_id?: string | null;
          error_message?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      message_queue: {
        Row: {
          id: string;
          campaign_id: string;
          recipient_id: string;
          priority: number;
          attempts: number;
          max_attempts: number;
          scheduled_for: string;
          locked_until: string | null;
          locked_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          recipient_id: string;
          priority?: number;
          attempts?: number;
          max_attempts?: number;
          scheduled_for?: string;
          locked_until?: string | null;
          locked_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          recipient_id?: string;
          priority?: number;
          attempts?: number;
          max_attempts?: number;
          scheduled_for?: string;
          locked_until?: string | null;
          locked_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          campaign_id: string | null;
          contact_id: string | null;
          action: string;
          phone: string | null;
          details: Record<string, unknown> | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          contact_id?: string | null;
          action: string;
          phone?: string | null;
          details?: Record<string, unknown> | null;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string | null;
          contact_id?: string | null;
          action?: string;
          phone?: string | null;
          details?: Record<string, unknown> | null;
          error?: string | null;
          created_at?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          contact_id: string;
          status: 'open' | 'closed';
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          status?: 'open' | 'closed';
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          status?: 'open' | 'closed';
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          whatsapp_message_id: string | null;
          direction: 'inbound' | 'outbound';
          content: string;
          message_type: 'text' | 'template' | 'image' | 'document';
          template_name: string | null;
          status: MessageStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          whatsapp_message_id?: string | null;
          direction: 'inbound' | 'outbound';
          content: string;
          message_type?: 'text' | 'template' | 'image' | 'document';
          template_name?: string | null;
          status?: MessageStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          whatsapp_message_id?: string | null;
          direction?: 'inbound' | 'outbound';
          content?: string;
          message_type?: 'text' | 'template' | 'image' | 'document';
          template_name?: string | null;
          status?: MessageStatus;
          created_at?: string;
        };
      };
    };
  };
}
