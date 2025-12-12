import { getSupabase } from '@/lib/supabase';
import type { CampaignStatus, MessageStatus } from '@/types/database';

// Helper to get supabase client
function getClient() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  return supabase;
}

// Contacts API
export const contactsApi = {
  async getAll() {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string) {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async getByTags(tags: string[]) {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .overlaps('tags', tags)
      .eq('opt_in', true);
    
    if (error) throw error;
    return data || [];
  },

  async getByList(listId: string) {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('contact_list_members')
      .select(`
        contact_id,
        contacts (*)
      `)
      .eq('list_id', listId);
    
    if (error) throw error;
    return data?.map((m: any) => m.contacts).filter(Boolean) || [];
  },

  async create(contact: any) {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('contacts')
      .insert(contact)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async bulkCreate(contacts: any[]) {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('contacts')
      .upsert(contacts, { onConflict: 'phone' })
      .select();
    
    if (error) throw error;
    return data || [];
  },

  async update(id: string, updates: any) {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const supabase = getClient();
    
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Templates API
export const templatesApi = {
  async getAll() {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getApproved() {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('status', 'approved')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string) {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async upsert(template: any) {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('templates')
      .upsert(template, { onConflict: 'whatsapp_template_id' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

// Campaigns API
export const campaignsApi = {
  async getAll() {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        templates (name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string) {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        templates (*)
      `)
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async create(campaign: any) {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('campaigns')
      .insert(campaign)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: CampaignStatus) {
    const supabase = getClient();
    
    const updates: any = { status };
    
    if (status === 'running') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'stopped') {
      updates.completed_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const supabase = getClient();
    
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async addRecipients(
    campaignId: string,
    contactIds: string[],
    variableMapping: Record<string, string>
  ) {
    const supabase = getClient();

    // Get contacts with their custom fields
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .in('id', contactIds)
      .eq('opt_in', true);

    if (contactsError) throw contactsError;

    // Create recipients with mapped variables
    const recipients = (contacts || []).map((contact: any) => {
      const variables: Record<string, string> = {};
      for (const [varName, fieldName] of Object.entries(variableMapping)) {
        variables[varName] = contact.custom_fields?.[fieldName] || contact[fieldName] || '';
      }
      return {
        campaign_id: campaignId,
        contact_id: contact.id,
        variables,
        status: 'pending' as MessageStatus,
      };
    });

    const { data, error } = await supabase
      .from('campaign_recipients')
      .insert(recipients)
      .select();

    if (error) throw error;

    // Update total recipients count
    await supabase
      .from('campaigns')
      .update({ total_recipients: recipients.length })
      .eq('id', campaignId);

    return data || [];
  },

  async getRecipients(campaignId: string) {
    const supabase = getClient();
    
    const { data, error } = await supabase
      .from('campaign_recipients')
      .select(`
        *,
        contacts (phone, name)
      `)
      .eq('campaign_id', campaignId);
    
    if (error) throw error;
    return data || [];
  },
};

// Message Queue API
export const queueApi = {
  async enqueueRecipients(campaignId: string) {
    const supabase = getClient();

    // Get all pending recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('campaign_recipients')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    if (recipientsError) throw recipientsError;

    // Create queue entries
    const queueEntries = (recipients || []).map((r: any) => ({
      campaign_id: campaignId,
      recipient_id: r.id,
      scheduled_for: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('message_queue')
      .insert(queueEntries);

    if (error) throw error;

    // Update recipients to queued status
    await supabase
      .from('campaign_recipients')
      .update({ status: 'queued' })
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    return queueEntries.length;
  },

  async getQueueStats(campaignId: string) {
    const supabase = getClient();

    const { data, error } = await supabase
      .from('message_queue')
      .select('id, locked_until, attempts')
      .eq('campaign_id', campaignId);

    if (error) throw error;

    const typedData = data || [];

    const total = typedData.length;
    const pending = typedData.filter((q: any) => !q.locked_until || new Date(q.locked_until) < new Date()).length;
    const processing = typedData.filter((q: any) => q.locked_until && new Date(q.locked_until) >= new Date()).length;

    return { total, pending, processing };
  },

  async clearQueue(campaignId: string) {
    const supabase = getClient();

    const { error } = await supabase
      .from('message_queue')
      .delete()
      .eq('campaign_id', campaignId);

    if (error) throw error;
  },
};

// Activity Logs API
export const logsApi = {
  async getAll(options?: { campaignId?: string; limit?: number }) {
    const supabase = getClient();

    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        campaigns (name)
      `)
      .order('created_at', { ascending: false });

    if (options?.campaignId) {
      query = query.eq('campaign_id', options.campaignId);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async create(log: any) {
    const supabase = getClient();

    const { data, error } = await supabase
      .from('activity_logs')
      .insert(log)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// Chats API
export const chatsApi = {
  async getAll() {
    const supabase = getClient();

    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        contacts (phone, name)
      `)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getMessages(chatId: string) {
    const supabase = getClient();

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async sendMessage(chatId: string, content: string) {
    const supabase = getClient();

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        direction: 'outbound',
        content,
        message_type: 'text',
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Update chat last_message_at
    await supabase
      .from('chats')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', chatId);

    return data;
  },
};

// Contact Lists API
export const contactListsApi = {
  async getAll() {
    const supabase = getClient();

    const { data, error } = await supabase
      .from('contact_lists')
      .select(`
        *,
        contact_list_members (count)
      `)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async create(name: string, description?: string) {
    const supabase = getClient();

    const { data, error } = await supabase
      .from('contact_lists')
      .insert({ name, description })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addContacts(listId: string, contactIds: string[]) {
    const supabase = getClient();

    const members = contactIds.map(contactId => ({
      list_id: listId,
      contact_id: contactId,
    }));

    const { error } = await supabase
      .from('contact_list_members')
      .upsert(members, { onConflict: 'list_id,contact_id' });

    if (error) throw error;
  },
};
