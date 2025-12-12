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
 * Meta API автоматически обрабатывает:
 * - HEADER с изображениями (format: IMAGE, VIDEO, DOCUMENT) - статическое изображение из шаблона
 * - BODY с текстовыми переменными ({{1}}, {{2}}, ...)
 * - BUTTONS с URL (type: URL) - если есть динамические переменные в URL
 * 
 * ВАЖНО: Meta автоматически отправляет изображение и кнопки из шаблона, если они там определены.
 * Нам нужно только передать переменные для текстовых частей (HEADER text, BODY, URL в кнопках).
 */
export function buildTemplateComponents(
  templateComponents: any[],
  variables: Record<string, string>
): any[] {
  const components: any[] = [];

  for (const component of templateComponents) {
    // Обработка HEADER компонента
    if (component.type === 'HEADER') {
      const componentData: any = {
        type: 'header',
      };

      // HEADER может быть текстовым или с изображением/видео/документом
      if (component.format === 'IMAGE' || component.format === 'VIDEO' || component.format === 'DOCUMENT') {
        // Для HEADER с медиа-файлами: Meta использует статическое изображение из шаблона
        // Если есть переменные в примере (например, для текста поверх изображения), обрабатываем их
        const example = component.example?.header_handle?.[0] || component.example?.header_text?.[0] || '';
        if (example && example.match(/\{\{(\d+)\}\}/)) {
          const matches = example.match(/\{\{(\d+)\}\}/g) || [];
          if (matches.length > 0) {
            const parameters: any[] = [];
            const sortedMatches = matches.sort((a: string, b: string) => {
              const numA = parseInt(a.match(/\d+/)?.[0] || '0');
              const numB = parseInt(b.match(/\d+/)?.[0] || '0');
              return numA - numB;
            });
            
            for (const match of sortedMatches) {
              const varNum = match.match(/\d+/)?.[0];
              if (varNum) {
                const placeholder = `{{${varNum}}}`;
                const value = variables[placeholder] || '';
                parameters.push({
                  type: 'text',
                  text: value || '',
                });
              }
            }
            
            if (parameters.length > 0) {
              componentData.parameters = parameters;
              components.push(componentData);
            }
          }
        }
        // Если нет переменных, Meta автоматически использует изображение из шаблона
        // Не нужно добавлять компонент в этом случае
      } else {
        // Текстовый HEADER
        const text = component.text || '';
        const matches = text.match(/\{\{(\d+)\}\}/g) || [];
        
        if (matches.length > 0) {
          const parameters: any[] = [];
          const sortedMatches = matches.sort((a: string, b: string) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || '0');
            const numB = parseInt(b.match(/\d+/)?.[0] || '0');
            return numA - numB;
          });
          
          for (const match of sortedMatches) {
            const varNum = match.match(/\d+/)?.[0];
            if (varNum) {
              const placeholder = `{{${varNum}}}`;
              const value = variables[placeholder] || '';
              parameters.push({
                type: 'text',
                text: value || '',
              });
            }
          }
          
          if (parameters.length > 0) {
            componentData.parameters = parameters;
            components.push(componentData);
          }
        }
      }
    }
    // Обработка BODY компонента
    else if (component.type === 'BODY') {
      const componentData: any = {
        type: 'body',
      };

      // Извлечь переменные из текста компонента (например, {{1}}, {{2}})
      const text = component.text || '';
      const matches = text.match(/\{\{(\d+)\}\}/g) || [];
      
      if (matches.length > 0) {
        const parameters: any[] = [];
        
        // Важно: параметры должны быть в порядке переменных ({{1}}, {{2}}, ...)
        const sortedMatches = matches.sort((a: string, b: string) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });
        
        for (const match of sortedMatches) {
          const varNum = match.match(/\d+/)?.[0];
          if (varNum) {
            const placeholder = `{{${varNum}}}`;
            const value = variables[placeholder] || '';
            
            parameters.push({
              type: 'text',
              text: value || '',
            });
          }
        }

        if (parameters.length > 0) {
          componentData.parameters = parameters;
          components.push(componentData);
        }
      }
    }
    // Обработка BUTTONS компонента
    else if (component.type === 'BUTTONS') {
      // Meta API автоматически обрабатывает кнопки с URL из шаблона
      // Если в шаблоне есть динамические URL (с переменными типа {{1}}), обрабатываем их
      const buttons = component.buttons || [];
      
      for (const button of buttons) {
        if (button.type === 'URL' && button.url) {
          // Проверяем, есть ли переменные в URL (например, https://example.com/{{1}})
          const urlMatches = button.url.match(/\{\{(\d+)\}\}/g) || [];
          if (urlMatches.length > 0) {
            // Если есть переменные, создаем компонент для кнопки
            const urlParameters: any[] = [];
            const sortedMatches = urlMatches.sort((a: string, b: string) => {
              const numA = parseInt(a.match(/\d+/)?.[0] || '0');
              const numB = parseInt(b.match(/\d+/)?.[0] || '0');
              return numA - numB;
            });
            
            for (const match of sortedMatches) {
              const varNum = match.match(/\d+/)?.[0];
              if (varNum) {
                const placeholder = `{{${varNum}}}`;
                const value = variables[placeholder] || '';
                urlParameters.push({
                  type: 'text',
                  text: value || '',
                });
              }
            }
            
            // Добавляем компонент для кнопки с динамическим URL
            if (urlParameters.length > 0) {
              components.push({
                type: 'button',
                sub_type: 'url',
                index: button.index || buttons.indexOf(button),
                parameters: urlParameters,
              });
            }
          }
          // Если URL статический (без переменных), Meta автоматически использует его из шаблона
        }
      }
    }
  }

  return components;
}

