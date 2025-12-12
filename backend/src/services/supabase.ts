import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);

// Экспортируем supabase для прямого доступа в некоторых местах
export { supabase as dbSupabase };

// Вспомогательные функции для работы с базой данных

export const db = {
  templates: {
    findAll: async () => {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    findById: async (id: string) => {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    upsert: async (template: any) => {
      const { data, error } = await supabase
        .from('templates')
        .upsert(template, { onConflict: 'whatsapp_template_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },
  campaigns: {
    findAll: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, template:templates(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    findById: async (id: string) => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, template:templates(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    create: async (campaign: any) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaign)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id: string, updates: any) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    increment: async (id: string, field: string) => {
      const { data, error } = await supabase.rpc('increment_field', {
        table_name: 'campaigns',
        row_id: id,
        field_name: field,
      });
      if (error) {
        // Fallback на обычный update если RPC не существует
        const campaign = await db.campaigns.findById(id);
        const { data: updated, error: updateError } = await supabase
          .from('campaigns')
          .update({ [field]: (campaign[field] || 0) + 1 })
          .eq('id', id)
          .select()
          .single();
        if (updateError) throw updateError;
        return updated;
      }
      return data;
    },
  },
  campaignRecipients: {
    findByCampaignId: async (campaignId: string) => {
      const { data, error } = await supabase
        .from('campaign_recipients')
        .select('*, contact:contacts(*)')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    findById: async (id: string) => {
      const { data, error } = await supabase
        .from('campaign_recipients')
        .select('*, contact:contacts(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    findByStatus: async (campaignId: string, status: string) => {
      const { data, error } = await supabase
        .from('campaign_recipients')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', status);
      if (error) throw error;
      return data;
    },
    create: async (recipient: any) => {
      const { data, error } = await supabase
        .from('campaign_recipients')
        .insert(recipient)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    createMany: async (recipients: any[]) => {
      const { data, error } = await supabase
        .from('campaign_recipients')
        .insert(recipients)
        .select();
      if (error) throw error;
      return data;
    },
    update: async (id: string, updates: any) => {
      const { data, error } = await supabase
        .from('campaign_recipients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    updateByCampaignId: async (campaignId: string, updates: any) => {
      const { error } = await supabase
        .from('campaign_recipients')
        .update(updates)
        .eq('campaign_id', campaignId);
      if (error) throw error;
    },
    findByWhatsappMessageId: async (messageId: string) => {
      const { data, error } = await supabase
        .from('campaign_recipients')
        .select('*')
        .eq('whatsapp_message_id', messageId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  },
  contacts: {
    findAll: async (filters?: { tags?: string[]; opt_in?: boolean; source?: string }) => {
      let query = supabase.from('contacts').select('*');
      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }
      if (filters?.opt_in !== undefined) {
        query = query.eq('opt_in', filters.opt_in);
      }
      if (filters?.source) {
        query = query.eq('source', filters.source);
      }
      const { data, error } = await query.order('created_at', {
        ascending: false,
      });
      if (error) throw error;
      return data;
    },
    findById: async (id: string) => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    findByPhone: async (phone: string) => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('phone', phone)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    create: async (contact: any) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert(contact)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    upsert: async (contact: any) => {
      const { data, error } = await supabase
        .from('contacts')
        .upsert(contact, { onConflict: 'phone' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id: string, updates: any) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    },
    findByTags: async (tags: string[]) => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .contains('tags', tags)
        .eq('opt_in', true);
      if (error) throw error;
      return data;
    },
  },
  contactLists: {
    findAll: async () => {
      const { data, error } = await supabase
        .from('contact_lists')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    findById: async (id: string) => {
      const { data, error } = await supabase
        .from('contact_lists')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    create: async (list: any) => {
      const { data, error } = await supabase
        .from('contact_lists')
        .insert(list)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    getContacts: async (listId: string) => {
      const { data, error } = await supabase
        .from('contact_list_members')
        .select('*, contact:contacts(*)')
        .eq('list_id', listId);
      if (error) throw error;
      return data;
    },
    addContacts: async (listId: string, contactIds: string[]) => {
      const members = contactIds.map((contactId) => ({
        list_id: listId,
        contact_id: contactId,
      }));
      const { data, error } = await supabase
        .from('contact_list_members')
        .upsert(members, { onConflict: 'list_id,contact_id' })
        .select();
      if (error) throw error;
      return data;
    },
  },
  chats: {
    findAll: async (filters?: { status?: string }) => {
      let query = supabase
        .from('chats')
        .select('*, contact:contacts(*)')
        .order('last_message_at', { ascending: false });
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    findById: async (id: string) => {
      const { data, error } = await supabase
        .from('chats')
        .select('*, contact:contacts(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    findByContactId: async (contactId: string) => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('contact_id', contactId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    create: async (chat: any) => {
      const { data, error } = await supabase
        .from('chats')
        .insert(chat)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id: string, updates: any) => {
      const { data, error } = await supabase
        .from('chats')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },
  messages: {
    findByChatId: async (chatId: string) => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    create: async (message: any) => {
      const { data, error } = await supabase
        .from('messages')
        .insert(message)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },
  activityLogs: {
    findAll: async (filters?: {
      campaign_id?: string;
      action?: string;
      limit?: number;
      offset?: number;
    }) => {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (filters?.campaign_id) {
        query = query.eq('campaign_id', filters.campaign_id);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 100) - 1
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    create: async (log: any) => {
      const { data, error } = await supabase
        .from('activity_logs')
        .insert(log)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },
  settings: {
    get: async (key: string) => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data?.value || null;
    },
    set: async (key: string, value: string) => {
      const { data, error } = await supabase
        .from('settings')
        .upsert(
          {
            key,
            value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },
  notifications: {
    findAll: async (userId?: string, unreadOnly: boolean = false) => {
      let query = supabase
        .from('notifications')
        .select('*, chat:chats(*, contact:contacts(*)), contact:contacts(*), message:messages(*)')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      if (unreadOnly) {
        query = query.eq('read', false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    getUnreadCount: async (userId?: string) => {
      let query = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('read', false);
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    create: async (notification: any) => {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    markAsRead: async (id: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    markAllAsRead: async (userId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
      if (error) throw error;
    },
  },
};

