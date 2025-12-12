import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';

interface ZohoMessage {
  phone: string;
  message: string;
  direction: 'inbound' | 'outbound';
  timestamp: Date;
  contactName?: string;
  isTemplate?: boolean;
  templateName?: string;
  messageStatus?: 'sent' | 'delivered' | 'read' | 'failed';
  chatId?: string; // ID чата для создания ссылки
}

interface ZohoLeadWithId extends ZohoLead {
  id: string;
}

interface ZohoLead {
  id: string;
  Phone: string;
  Last_Name?: string;
  First_Name?: string;
  Email?: string;
}

interface ZohoAccessToken {
  access_token: string;
  expires_at: number;
}

class ZohoService {
  private api: AxiosInstance;
  private accessToken: ZohoAccessToken | null = null;
  private readonly tokenRefreshBuffer = 5 * 60 * 1000; // 5 минут до истечения

  constructor() {
    this.api = axios.create({
      baseURL: config.zoho.apiDomain,
      timeout: 10000,
    });
  }

  /**
   * Нормализация номера телефона для поиска в Zoho
   */
  private normalizePhone(phone: string): string {
    // Убираем все символы кроме цифр и +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Если номер начинается с +, оставляем как есть
    // Если нет, добавляем + если нужно
    if (!normalized.startsWith('+')) {
      // Если номер начинается с 7 (Россия) или 971 (ОАЭ), добавляем +
      if (normalized.startsWith('7') || normalized.startsWith('971')) {
        normalized = '+' + normalized;
      }
    }
    
    return normalized;
  }

  /**
   * Получение/обновление Access Token
   * Публичный метод для проверки подключения
   */
  async getAccessToken(): Promise<string> {
    // Проверяем, есть ли валидный токен
    if (
      this.accessToken &&
      this.accessToken.expires_at > Date.now() + this.tokenRefreshBuffer
    ) {
      return this.accessToken.access_token;
    }

    // Обновляем токен
    try {
      // Для refresh token нужно использовать accounts.zoho.com, а не apiDomain
      // apiDomain используется для CRM API, а для OAuth токенов - accounts.zoho.com
      const tokenUrl = 'https://accounts.zoho.com/oauth/v2/token';
      
      // Используем form-urlencoded формат для OAuth запросов
      const params = new URLSearchParams();
      params.append('refresh_token', config.zoho.refreshToken);
      params.append('client_id', config.zoho.clientId);
      params.append('client_secret', config.zoho.clientSecret);
      params.append('grant_type', 'refresh_token');
      
      const response = await axios.post(
        tokenUrl,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = {
        access_token: response.data.access_token,
        expires_at: Date.now() + (response.data.expires_in * 1000),
      };

      return this.accessToken.access_token;
    } catch (error: any) {
      console.error('Zoho: Failed to get access token:', error.response?.data || error.message);
      throw new Error('Failed to get Zoho access token');
    }
  }

  /**
   * Поиск лида по номеру телефона
   */
  async findLeadByPhone(phone: string): Promise<ZohoLead | null> {
    if (!config.zoho.enabled) {
      return null;
    }

    try {
      const accessToken = await this.getAccessToken();
      const normalizedPhone = this.normalizePhone(phone);

      // Поиск в Leads
      const response = await this.api.get('/crm/v2/Leads/search', {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
        params: {
          criteria: `(Phone:equals:${normalizedPhone})`,
        },
      });

      if (response.data?.data && response.data.data.length > 0) {
        return response.data.data[0];
      }

      // Если не найден в Leads, ищем в Contacts
      const contactResponse = await this.api.get('/crm/v2/Contacts/search', {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
        params: {
          criteria: `(Phone:equals:${normalizedPhone})`,
        },
      });

      if (contactResponse.data?.data && contactResponse.data.data.length > 0) {
        const contact = contactResponse.data.data[0];
        return {
          id: contact.id,
          Phone: contact.Phone,
          Last_Name: contact.Last_Name,
          First_Name: contact.First_Name,
          Email: contact.Email,
        };
      }

      return null;
    } catch (error: any) {
      console.error('Zoho: Failed to find lead:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Создание нового лида
   */
  async createLead(phone: string, name?: string): Promise<ZohoLead | null> {
    if (!config.zoho.enabled) {
      return null;
    }

    try {
      const accessToken = await this.getAccessToken();
      const normalizedPhone = this.normalizePhone(phone);

      // Разделяем имя на First_Name и Last_Name если есть
      let firstName = '';
      let lastName = '';
      if (name) {
        const nameParts = name.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      const response = await this.api.post(
        '/crm/v2/Leads',
        {
          data: [
            {
              Phone: normalizedPhone,
              Last_Name: lastName || normalizedPhone,
              First_Name: firstName,
              Lead_Source: 'WhatsApp',
            },
          ],
        },
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.data && response.data.data.length > 0) {
        return response.data.data[0];
      }

      return null;
    } catch (error: any) {
      console.error('Zoho: Failed to create lead:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Добавление сообщения в модуль Messages через Activities API
   * Это создаст сообщение в разделе Messages Zoho CRM
   */
  private async addMessageToLead(leadId: string, message: ZohoMessage): Promise<boolean> {
    if (!config.zoho.enabled) {
      return false;
    }

    try {
      const accessToken = await this.getAccessToken();
      const timestamp = new Date(message.timestamp);
      
      // Форматируем дату и время для Zoho
      const dueDate = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      const dueTime = timestamp.toTimeString().split(' ')[0]; // HH:MM:SS
      
      // Создаем Activity типа "Message" для отображения в модуле Messages
      const activityData: any = {
        Subject: message.direction === 'inbound' 
          ? `Incoming WhatsApp Message` 
          : `Outgoing WhatsApp Message`,
        Description: message.message,
        Activity_Type: 'Message',
        Due_Date: dueDate,
        Due_Time: dueTime,
        What_Id: leadId, // Связываем с лидом
        Status: 'Completed',
        // Добавляем дополнительные поля для лучшей интеграции с Messages
        Send_Notification_Email: false,
      };

      // Если это шаблон, добавляем информацию
      if (message.isTemplate && message.templateName) {
        activityData.Description = `Template: ${message.templateName}\n\n${message.message}`;
      }

      // Создаем Activity (сообщение)
      const response = await this.api.post(
        '/crm/v2/Activities',
        {
          data: [activityData],
        },
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Zoho: Message activity created:', response.data);

      // Также добавляем в Notes для полной истории
      await this.addNoteToLead(leadId, message);

      return true;
    } catch (error: any) {
      console.error('Zoho: Failed to add message activity:', error.response?.data || error.message);
      console.error('Zoho: Error details:', JSON.stringify(error.response?.data, null, 2));
      // Пробуем добавить только в Notes как fallback
      return await this.addNoteToLead(leadId, message);
    }
  }

  /**
   * Добавление сообщения в Notes лида (fallback метод)
   */
  private async addNoteToLead(leadId: string, message: ZohoMessage): Promise<boolean> {
    if (!config.zoho.enabled) {
      return false;
    }

    try {
      const accessToken = await this.getAccessToken();
      
      // Форматируем сообщение для Notes
      const directionLabel = message.direction === 'inbound' ? 'Inbound' : 'Outbound';
      const timestamp = new Date(message.timestamp).toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      let noteContent = `[${directionLabel}] ${timestamp}\n${message.message}`;
      
      if (message.isTemplate && message.templateName) {
        noteContent += `\n\nTemplate: ${message.templateName}`;
      }
      
      if (message.messageStatus) {
        noteContent += `\nStatus: ${message.messageStatus}`;
      }

      // Добавляем ссылку на диалог в Zoho (не на наш диалог)
      const zohoChatUrl = this.getZohoChatUrl(leadId, message.phone);
      noteContent += `\n\n💬 Open in Zoho: ${zohoChatUrl}`;

      await this.api.post(
        `/crm/v2/Leads/${leadId}/Notes`,
        {
          data: [
            {
              Note_Title: `WhatsApp Message - ${directionLabel}`,
              Note_Content: noteContent,
            },
          ],
        },
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return true;
    } catch (error: any) {
      console.error('Zoho: Failed to add note:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Добавление ссылки на чат в Lead (для старых лидов)
   */
  async addChatLinkToLead(phone: string, chatId: string): Promise<boolean> {
    if (!config.zoho.enabled) {
      return false;
    }

    try {
      const lead = await this.findLeadByPhone(phone);
      if (!lead) {
        return false;
      }

      const accessToken = await this.getAccessToken();
      const chatUrl = `${config.frontendUrl}/wasend/chats?chat=${chatId}`;
      
      // Получить информацию о чате из нашей БД
      const { db } = await import('./supabase');
      const chat = await db.chats.findById(chatId);
      const contact = chat ? await db.contacts.findById(chat.contact_id) : null;

      const noteContent = `💬 WhatsApp Chat Link\n\nOpen chat in admin panel: ${chatUrl}\n\nContact: ${contact?.name || phone}\nLast message: ${chat?.last_message_at ? new Date(chat.last_message_at).toLocaleString('ru-RU') : 'N/A'}`;

      await this.api.post(
        `/crm/v2/Leads/${lead.id}/Notes`,
        {
          data: [
            {
              Note_Title: 'WhatsApp Chat Link',
              Note_Content: noteContent,
            },
          ],
        },
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return true;
    } catch (error: any) {
      console.error('Zoho: Failed to add chat link:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Получить ссылку на диалог в Zoho для лида
   */
  getZohoChatUrl(leadId: string, phone: string): string {
    // Формат ссылки на диалог в Zoho Messages
    // Обычно это: https://crm.zoho.com/crm/{orgId}/tab/Messages?phone={phone}
    // Или: https://crm.zoho.com/crm/{orgId}/tab/Leads/{leadId}/Messages
    
    const orgId = config.zoho.orgId;
    
    if (orgId) {
      // Вариант 1: Прямая ссылка на Messages модуль с фильтром по телефону
      return `https://crm.zoho.com/crm/${orgId}/tab/Messages?phone=${encodeURIComponent(phone)}`;
    } else {
      // Вариант 2: Ссылка на Lead с Messages табом (без orgId)
      return `https://crm.zoho.com/crm/tab/Leads/${leadId}/Messages`;
    }
  }

  /**
   * Получить leadId по номеру телефона (для создания ссылки)
   */
  async getLeadIdByPhone(phone: string): Promise<string | null> {
    if (!config.zoho.enabled) {
      return null;
    }

    try {
      const lead = await this.findLeadByPhone(phone);
      return lead?.id || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Синхронизация сообщения с Zoho
   * Находит или создает лида, добавляет сообщение в Notes
   */
  async syncMessage(message: ZohoMessage): Promise<boolean> {
    if (!config.zoho.enabled) {
      return false;
    }

    try {
      // Найти лида по номеру телефона
      let lead = await this.findLeadByPhone(message.phone);

      // Если лид не найден, создать новый
      if (!lead) {
        lead = await this.createLead(message.phone, message.contactName);
      }

      if (!lead) {
        console.warn(`Zoho: Could not find or create lead for phone: ${message.phone}`);
        return false;
      }

      // Добавить сообщение в модуль Messages (через Activities API)
      const success = await this.addMessageToLead(lead.id, message);

      if (success) {
        console.log(`Zoho: Message synced for lead ${lead.id} (${message.phone})`);
      }

      return success;
    } catch (error: any) {
      console.error('Zoho: Failed to sync message:', error.message);
      return false;
    }
  }
}

export const zohoService = new ZohoService();

