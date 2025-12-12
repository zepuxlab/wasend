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
   * Нормализация номера телефона в формат E.164 для Meta API
   * Meta требует формат E.164: +[код страны][номер] (например, +971501234567)
   * Формат: +[1-15 цифр], начинается с +, затем код страны (1-3 цифры), затем номер
   */
  private normalizePhoneNumber(phone: string): string {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    // Убираем все символы кроме цифр и +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Если номер начинается с +, убираем его временно для обработки
    const hasPlus = normalized.startsWith('+');
    if (hasPlus) {
      normalized = normalized.substring(1);
    }
    
    // Убираем ведущие нули (кроме случаев, когда это часть кода страны)
    // Если номер начинается с 0, убираем его (обычно это внутренний формат)
    if (normalized.startsWith('0') && normalized.length > 1) {
      normalized = normalized.substring(1);
    }
    
    // Проверяем валидность: должен быть минимум 7 цифр (самый короткий валидный номер)
    if (normalized.length < 7 || normalized.length > 15) {
      throw new Error(`Invalid phone number length: ${normalized.length}. Must be 7-15 digits.`);
    }
    
    // Проверяем, что номер начинается с цифры 1-9 (код страны не может начинаться с 0)
    if (!/^[1-9]/.test(normalized)) {
      throw new Error('Phone number must start with digit 1-9 (country code)');
    }
    
    // Возвращаем в формате E.164 с +
    return '+' + normalized;
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
      // Нормализовать номер телефона в формат E.164
      const normalizedPhone = this.normalizePhoneNumber(to);
      
      // Meta API требует, чтобы components был массивом (может быть пустым)
      const requestBody: any = {
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'template',
        template: {
          name: template,
          language: { code: language },
        },
      };
      
      // Добавляем components только если они есть
      if (components && components.length > 0) {
        requestBody.template.components = components;
      }
      
      const response = await this.client.post(
        `/${config.meta.phoneNumberId}/messages`,
        requestBody
      );
      return response.data;
    } catch (error: any) {
      const errorDetails = error.response?.data?.error || {};
      const errorCode = errorDetails.code;
      const errorMessage = errorDetails.message || error.message;
      const errorSubcode = errorDetails.error_subcode;
      
      // Логируем детали для диагностики
      console.error('Meta API Error (sendTemplateMessage):', {
        code: errorCode,
        subcode: errorSubcode,
        message: errorMessage,
        phone: to,
        template: template,
      });
      
      throw new Error(
        `Meta API Error: ${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}`
      );
    }
  }

  /**
   * Отправить текстовое сообщение
   */
  async sendTextMessage({ to, text }: { to: string; text: string }) {
    try {
      // Нормализовать номер телефона в формат E.164
      const normalizedPhone = this.normalizePhoneNumber(to);
      
      const response = await this.client.post(
        `/${config.meta.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: normalizedPhone,
          type: 'text',
          text: { body: text },
        }
      );
      return response.data;
    } catch (error: any) {
      const errorDetails = error.response?.data?.error || {};
      const errorCode = errorDetails.code;
      const errorMessage = errorDetails.message || error.message;
      const errorSubcode = errorDetails.error_subcode;
      
      // Логируем детали для диагностики
      console.error('Meta API Error (sendTextMessage):', {
        code: errorCode,
        subcode: errorSubcode,
        message: errorMessage,
        phone: to,
      });
      
      throw new Error(
        `Meta API Error: ${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}`
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
        
        // Важно: параметры должны быть в порядке переменных ({{1}}, {{2}}, ...)
        // Сортируем matches по номеру переменной
        const sortedMatches = matches.sort((a: string, b: string) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });
        
        for (const match of sortedMatches) {
          // Извлечь номер переменной (например, "1" из "{{1}}")
          const varNum = match.match(/\d+/)?.[0];
          if (varNum) {
            const placeholder = `{{${varNum}}}`;
            const value = variables[placeholder] || '';
            
            // Добавляем параметр даже если значение пустое (Meta может требовать все параметры)
            parameters.push({
              type: 'text',
              text: value || '', // Пустая строка если переменная не найдена
            });
          }
        }

        // Добавляем компонент только если есть параметры
        // Meta требует, чтобы все переменные в шаблоне были заполнены
        if (parameters.length > 0) {
          componentData.parameters = parameters;
          components.push(componentData);
        }
      }
    } else if (component.type === 'BUTTONS') {
      // Обработка кнопок в шаблонах (если нужно)
      // Пока не реализовано, но можно добавить при необходимости
    }
  }

  return components;
}

