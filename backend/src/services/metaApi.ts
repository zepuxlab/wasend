import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';

class MetaApiService {
  private client: AxiosInstance;
  private baseUrl = 'https://graph.facebook.com/v19.0';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${config.meta.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Получить все шаблоны из Meta API
   */
  async getTemplates() {
    try {
      const response = await this.client.get(
        `/${config.meta.businessAccountId}/message_templates`,
        {
          params: {
            limit: 100,
          },
        }
      );
      return response.data.data || [];
    } catch (error: any) {
      throw new Error(
        `Meta API Error: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  /**
   * Отправить шаблонное сообщение
   */
  async sendTemplateMessage({
    to,
    template,
    language,
    components,
  }: {
    to: string;
    template: string;
    language: string;
    components: any[];
  }) {
    try {
      const response = await this.client.post(
        `/${config.meta.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: template,
            language: { code: language },
            components: components,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        `Meta API Error: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  /**
   * Отправить текстовое сообщение
   */
  async sendTextMessage({ to, text }: { to: string; text: string }) {
    try {
      const response = await this.client.post(
        `/${config.meta.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: text },
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        `Meta API Error: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  /**
   * Получить информацию о номере телефона
   */
  async getPhoneNumberInfo() {
    try {
      const response = await this.client.get(
        `/${config.meta.phoneNumberId}`,
        {
          params: {
            fields: 'display_phone_number,verified_name',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        `Meta API Error: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  /**
   * Получить информацию о бизнес-аккаунте
   */
  async getBusinessAccountInfo() {
    try {
      const response = await this.client.get(
        `/${config.meta.businessAccountId}`,
        {
          params: {
            fields: 'name',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        `Meta API Error: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }
}

export const metaApi = new MetaApiService();

/**
 * Построить components для шаблона из переменных
 */
export function buildTemplateComponents(
  templateComponents: any[],
  variables: Record<string, string>
): any[] {
  const components: any[] = [];

  for (const component of templateComponents) {
    if (component.type === 'BODY' || component.type === 'HEADER') {
      const componentData: any = {
        type: component.type.toLowerCase(),
      };

      // Извлечь переменные из текста компонента (например, {{1}}, {{2}})
      const text = component.text || '';
      const matches = text.match(/\{\{(\d+)\}\}/g) || [];
      
      if (matches.length > 0) {
        const parameters: any[] = [];
        
        for (const match of matches) {
          // Извлечь номер переменной (например, "1" из "{{1}}")
          const varNum = match.match(/\d+/)?.[0];
          if (varNum) {
            const placeholder = `{{${varNum}}}`;
            const value = variables[placeholder] || '';
            
            if (value) {
              parameters.push({
                type: 'text',
                text: value,
              });
            }
          }
        }

        if (parameters.length > 0) {
          componentData.parameters = parameters;
          components.push(componentData);
        }
      }
    }
  }

  return components;
}

