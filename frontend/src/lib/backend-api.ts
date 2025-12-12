/**
 * Backend API Client
 * 
 * This module provides the interface between the Admin Panel (frontend)
 * and your Backend Server. The frontend NEVER communicates with Meta directly.
 * 
 * Architecture:
 * - Admin Panel → Backend API → Meta WhatsApp Cloud API
 * - Admin Panel → Backend API → Database
 * 
 * All functions here make calls to YOUR backend server.
 * Configure the BASE_URL to point to your server.
 */

// Configure this to your backend server URL
const getBaseUrl = () => {
  // Always use relative path through nginx in production
  // In development, can be overridden via localStorage
  if (import.meta.env.PROD) {
    return '/wasend/api';
  }
  const stored = localStorage.getItem('backend_api_url');
  // Default to relative path for dev too (if running through nginx)
  return stored || '/wasend/api';
};

// Get auth token (if your backend requires authentication)
const getAuthToken = () => {
  return localStorage.getItem('backend_auth_token') || '';
};

// Generic fetch wrapper with error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const token = getAuthToken();

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// TEMPLATES API
// Server syncs templates from Meta, we just display them
// ============================================

export const templatesBackendApi = {
  /**
   * GET /api/templates
   * Get all templates from server (server holds synced copies from Meta)
   */
  getAll: () => apiRequest<Template[]>('/templates'),

  /**
   * POST /api/templates/sync
   * Tell server to sync templates from Meta WhatsApp Cloud API
   */
  sync: () => apiRequest<{ synced: number }>('/templates/sync', { method: 'POST' }),

  /**
   * GET /api/templates/:id
   * Get single template details
   */
  getById: (id: string) => apiRequest<Template>(`/templates/${id}`),
};

// ============================================
// CAMPAIGNS API
// All campaign logic is on the server
// ============================================

export const campaignsBackendApi = {
  /**
   * GET /api/campaigns
   * Get all campaigns
   */
  getAll: () => apiRequest<Campaign[]>('/campaigns'),

  /**
   * GET /api/campaigns/:id
   * Get single campaign with full details
   */
  getById: (id: string) => apiRequest<Campaign>(`/campaigns/${id}`),

  /**
   * GET /api/campaigns/:id/stats
   * Get real-time campaign statistics
   */
  getStats: (id: string) => apiRequest<CampaignStats>(`/campaigns/${id}/stats`),

  /**
   * GET /api/campaigns/:id/recipients
   * Get campaign recipients with their statuses
   */
  getRecipients: (id: string) => apiRequest<CampaignRecipient[]>(`/campaigns/${id}/recipients`),

  /**
   * POST /api/campaigns
   * Create new campaign (status = DRAFT)
   */
  create: (data: CreateCampaignRequest) =>
    apiRequest<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PATCH /api/campaigns/:id
   * Update campaign (only allowed when status = DRAFT)
   */
  update: (id: string, data: Partial<CreateCampaignRequest>) =>
    apiRequest<Campaign>(`/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE /api/campaigns/:id
   * Delete campaign (only allowed when status = DRAFT or STOPPED)
   */
  delete: (id: string) =>
    apiRequest<void>(`/campaigns/${id}`, { method: 'DELETE' }),

  // ============================================
  // CAMPAIGN STATE MACHINE COMMANDS
  // Server validates and executes transitions
  // ============================================

  /**
   * POST /api/campaigns/:id/start
   * Server: validates → creates queue → status = RUNNING → worker starts
   */
  start: (id: string) =>
    apiRequest<Campaign>(`/campaigns/${id}/start`, { method: 'POST' }),

  /**
   * POST /api/campaigns/:id/pause
   * Server: status = PAUSED → worker stops pulling jobs
   */
  pause: (id: string) =>
    apiRequest<Campaign>(`/campaigns/${id}/pause`, { method: 'POST' }),

  /**
   * POST /api/campaigns/:id/resume
   * Server: status = RUNNING → worker resumes
   */
  resume: (id: string) =>
    apiRequest<Campaign>(`/campaigns/${id}/resume`, { method: 'POST' }),

  /**
   * POST /api/campaigns/:id/stop
   * Server: cancels queue → status = STOPPED → cannot resume
   */
  stop: (id: string) =>
    apiRequest<Campaign>(`/campaigns/${id}/stop`, { method: 'POST' }),
};

// ============================================
// CONTACTS API
// ============================================

export const contactsBackendApi = {
  /**
   * GET /api/contacts
   */
  getAll: (params?: { tags?: string[]; opt_in?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.tags) query.set('tags', params.tags.join(','));
    if (params?.opt_in !== undefined) query.set('opt_in', String(params.opt_in));
    return apiRequest<Contact[]>(`/contacts?${query}`);
  },

  /**
   * GET /api/contacts/:id
   */
  getById: (id: string) => apiRequest<Contact>(`/contacts/${id}`),

  /**
   * POST /api/contacts
   */
  create: (data: CreateContactRequest) =>
    apiRequest<Contact>('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * POST /api/contacts/import
   * Import contacts from CSV data
   */
  import: (data: { contacts: CreateContactRequest[] }) =>
    apiRequest<{ imported: number; skipped: number }>('/contacts/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PATCH /api/contacts/:id
   */
  update: (id: string, data: Partial<CreateContactRequest>) =>
    apiRequest<Contact>(`/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE /api/contacts/:id
   */
  delete: (id: string) =>
    apiRequest<void>(`/contacts/${id}`, { method: 'DELETE' }),
};

// ============================================
// CONTACT LISTS API
// ============================================

export const contactListsBackendApi = {
  getAll: () => apiRequest<ContactList[]>('/contact-lists'),
  
  getById: (id: string) => apiRequest<ContactList>(`/contact-lists/${id}`),
  
  getContacts: (id: string) => apiRequest<Contact[]>(`/contact-lists/${id}/contacts`),
  
  create: (data: { name: string; description?: string }) =>
    apiRequest<ContactList>('/contact-lists', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  addContacts: (listId: string, contactIds: string[]) =>
    apiRequest<void>(`/contact-lists/${listId}/contacts`, {
      method: 'POST',
      body: JSON.stringify({ contact_ids: contactIds }),
    }),
};

// ============================================
// CHATS API
// Chats are synced from Meta webhooks
// ============================================

export const chatsBackendApi = {
  /**
   * GET /api/chats
   * Get all chat conversations (from webhook data)
   */
  getAll: (params?: { status?: 'open' | 'closed' }) => {
    const query = params?.status ? `?status=${params.status}` : '';
    return apiRequest<Chat[]>(`/chats${query}`);
  },

  /**
   * GET /api/chats/:id
   * Get chat with messages
   */
  getById: (id: string) => apiRequest<ChatWithMessages>(`/chats/${id}`),

  /**
   * GET /api/chats/:id/messages
   * Get messages for a chat
   */
  getMessages: (chatId: string) => apiRequest<Message[]>(`/chats/${chatId}/messages`),

  /**
   * POST /api/chats/:id/messages
   * Send a reply message (server handles 24h window validation)
   * Server calls Meta API, we just provide content
   */
  sendMessage: (chatId: string, content: string) =>
    apiRequest<Message>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  /**
   * POST /api/chats/:id/resolve
   * Mark chat as resolved/closed
   */
  resolve: (chatId: string) =>
    apiRequest<Chat>(`/chats/${chatId}/resolve`, { method: 'POST' }),

  /**
   * POST /api/chats/:id/reopen
   * Reopen a closed chat
   */
  reopen: (chatId: string) =>
    apiRequest<Chat>(`/chats/${chatId}/reopen`, { method: 'POST' }),

  /**
   * POST /api/chats/:id/tag
   * Add tags to a chat
   */
  addTag: (chatId: string, tag: string) =>
    apiRequest<Chat>(`/chats/${chatId}/tag`, {
      method: 'POST',
      body: JSON.stringify({ tag }),
    }),
};

// ============================================
// ACTIVITY LOGS API
// ============================================

export const logsBackendApi = {
  /**
   * GET /api/logs
   * Get activity logs with optional filters
   */
  getAll: (params?: {
    campaign_id?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.campaign_id) query.set('campaign_id', params.campaign_id);
    if (params?.action) query.set('action', params.action);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    return apiRequest<ActivityLog[]>(`/logs?${query}`);
  },
};

// ============================================
// SETTINGS API
// ============================================

export const settingsBackendApi = {
  /**
   * GET /api/config
   * Get public config for frontend (Supabase URL, anon key)
   */
  getConfig: () => apiRequest<PublicConfig>('/config'),

  /**
   * GET /api/settings/status
   * Get connection status (Meta API, webhooks, etc.)
   */
  getStatus: () => apiRequest<ConnectionStatus>('/settings/status'),

  /**
   * GET /api/settings
   * Get all settings
   */
  getAll: () => apiRequest<{ campaign_settings?: CampaignSettings }>('/settings'),

  /**
   * PATCH /api/settings
   * Update settings
   */
  update: (data: { campaign_settings?: CampaignSettings }) =>
    apiRequest<{ message: string; campaign_settings?: CampaignSettings }>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ============================================
// TYPES
// These should match your backend models
// ============================================

export interface Template {
  id: string;
  whatsapp_template_id: string;
  name: string;
  category: string;
  language: string;
  status: 'approved' | 'pending' | 'rejected';
  components: any[];
  variables: string[];
  preview_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  template_id: string;
  template?: Template;
  status: 'draft' | 'ready' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';
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
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
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

export interface CampaignRecipient {
  id: string;
  contact_id: string;
  contact: Contact;
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  variables: Record<string, string>;
  whatsapp_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  template_id: string;
  variable_mapping: Record<string, string>;
  contact_ids?: string[];
  contact_list_id?: string;
  contact_tags?: string[];
  rate_limit?: {
    batch?: number;
    delay_minutes?: number;
    hourly_cap?: number;
    daily_cap?: number;
  };
  scheduled_at?: string;
}

export interface Contact {
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
}

export interface CreateContactRequest {
  phone: string;
  name?: string;
  country?: string;
  tags?: string[];
  custom_fields?: Record<string, string>;
  opt_in?: boolean;
}

export interface ContactList {
  id: string;
  name: string;
  description: string | null;
  contact_count: number;
  created_at: string;
}

export interface Chat {
  id: string;
  contact_id: string;
  contact: Contact;
  status: 'open' | 'closed';
  tags: string[];
  last_message: string | null;
  last_message_at: string | null;
  reply_window_expires_at: string | null;
  can_reply: boolean;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatWithMessages extends Chat {
  messages: Message[];
}

export interface Message {
  id: string;
  chat_id: string;
  whatsapp_message_id: string | null;
  direction: 'inbound' | 'outbound';
  content: string;
  message_type: 'text' | 'template' | 'image' | 'document';
  template_name: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error_message: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  contact_id: string | null;
  phone: string | null;
  action: 'sent' | 'delivered' | 'read' | 'failed' | 'replied';
  details: Record<string, any> | null;
  error: string | null;
  created_at: string;
}

export interface PublicConfig {
  supabase_url: string;
  supabase_anon_key: string;
  meta_phone_number_id?: string;
  meta_business_name?: string;
}

export interface CampaignSettings {
  defaultBatchSize: number;
  defaultDelaySeconds: number;
  defaultHourlyCap: number;
  defaultDailyCap: number;
  utmSource: string;
  utmMedium: string;
  dailyLimitWarning: boolean;
  dailyLimitAmount: number;
  pauseOnLimit: boolean;
}

export interface ConnectionStatus {
  backend_api?: {
    connected: boolean;
    last_check: string;
    error?: string;
  };
  database: {
    connected: boolean;
  };
  meta_api: {
    connected: boolean;
    last_check: string;
    error?: string;
    phone_number?: string;
    business_name?: string;
  };
  webhook: {
    active: boolean;
    last_received: string | null;
  };
}
