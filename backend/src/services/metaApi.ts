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
   * Правила:
   * - Удаляем все символы кроме цифр и +
   * - Если номер начинается с 0, удаляем его
   * - Если нет + в начале, добавляем
   * - Проверяем длину (7-15 цифр после +)
   * - Номер должен начинаться с цифры 1-9 (код страны)
   */
  private normalizePhoneNumber(phone: string): string {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    let normalized = phone.replace(/[^\d+]/g, '');
    const hasPlus = normalized.startsWith('+');
    if (hasPlus) {
      normalized = normalized.substring(1);
    }
    if (normalized.startsWith('0') && normalized.length > 1) {
      normalized = normalized.substring(1);
    }
    if (normalized.length < 7 || normalized.length > 15) {
      throw new Error(`Invalid phone number length: ${normalized.length}. Must be 7-15 digits.`);
    }
    if (!/^[1-9]/.test(normalized)) {
      throw new Error('Phone number must start with digit 1-9 (country code)');
    }
    return '+' + normalized;
  }

  /**
   * Проверить подключение к Meta API
   */
  async getHealth() {
    try {
      // Тестовый режим: если META_API_TEST_MODE=true, возвращаем успешный статус
      if (process.env.META_API_TEST_MODE === 'true') {
        return {
          connected: true,
          test_mode: true,
          message: 'Test mode enabled - Meta API calls are mocked',
        };
      }
      
      // Пробуем получить информацию о номере телефона
      await this.getPhoneNumberInfo();
      return {
        connected: true,
        test_mode: false,
      };
    } catch (error: any) {
      return {
        connected: false,
        test_mode: false,
        error: error.message || 'Connection failed',
      };
    }
  }

  /**
   * Получить все шаблоны из Meta API
   */
  async getTemplates() {
    try {
      // Тестовый режим: если META_API_TEST_MODE=true, возвращаем пустой массив
      if (process.env.META_API_TEST_MODE === 'true') {
        console.log('🧪 TEST MODE: Mocking Meta API templates request');
        return [];
      }
      
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
      
      // Тестовый режим: если META_API_TEST_MODE=true, не отправляем реальный запрос
      if (process.env.META_API_TEST_MODE === 'true') {
        console.log('🧪 TEST MODE: Mocking Meta API call for template message');
        console.log('📤 Request:', JSON.stringify(requestBody, null, 2));
        // Возвращаем мок-ответ, похожий на реальный ответ Meta API
        return {
          messaging_product: 'whatsapp',
          contacts: [{ input: normalizedPhone, wa_id: normalizedPhone }],
          messages: [{
            id: `wamid.TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }]
        };
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
        fullError: error.response?.data,
      });

      // Специальная обработка ошибки разрешений
      if (errorCode === 200 || errorMessage?.includes('permissions')) {
        console.error('⚠️ PERMISSION ERROR DETECTED');
        console.error('Please check:');
        console.error('1. Token has permissions: whatsapp_business_messaging, whatsapp_business_management');
        console.error('2. App is connected to WhatsApp Business Account');
        console.error('3. System User has access to WhatsApp Business Account');
        console.error('4. Phone Number ID is correct and accessible');
      }
      
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
      
      const requestBody = {
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'text',
        text: { body: text },
      };
      
      // Тестовый режим: если META_API_TEST_MODE=true, не отправляем реальный запрос
      if (process.env.META_API_TEST_MODE === 'true') {
        console.log('🧪 TEST MODE: Mocking Meta API call for text message');
        console.log('📤 Request:', JSON.stringify(requestBody, null, 2));
        // Возвращаем мок-ответ, похожий на реальный ответ Meta API
        return {
          messaging_product: 'whatsapp',
          contacts: [{ input: normalizedPhone, wa_id: normalizedPhone }],
          messages: [{
            id: `wamid.TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }]
        };
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
      // Тестовый режим: если META_API_TEST_MODE=true, возвращаем мок-данные
      if (process.env.META_API_TEST_MODE === 'true') {
        console.log('🧪 TEST MODE: Mocking Meta API phone number info request');
        return {
          display_phone_number: '+1234567890',
          verified_name: 'Test Business',
        };
      }
      
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
      // Тестовый режим: если META_API_TEST_MODE=true, возвращаем мок-данные
      if (process.env.META_API_TEST_MODE === 'true') {
        console.log('🧪 TEST MODE: Mocking Meta API business account info request');
        return {
          id: config.meta.businessAccountId,
          name: 'Test Business Account',
          message_template_namespace: 'test_namespace',
        };
      }
      
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

  /**
   * Проверить разрешения токена и доступ к WhatsApp
   */
  async testSendPermission() {
    const result: any = {
      can_access_phone: false,
      can_access_business_account: false,
      phone_info: null,
      business_account_info: null,
      required_permissions: ['whatsapp_business_messaging', 'whatsapp_business_management'],
      errors: [],
      recommendations: [],
    };

    try {
      // 1. Проверяем доступ к номеру телефона
      try {
        const phoneInfo = await this.getPhoneNumberInfo();
        result.can_access_phone = true;
        result.phone_info = phoneInfo;
      } catch (error: any) {
        result.errors.push(`Phone access: ${error.message}`);
        result.recommendations.push('Проверьте, что Phone Number ID правильный и токен имеет доступ к нему');
      }

      // 2. Проверяем доступ к Business Account
      try {
        const businessInfo = await this.getBusinessAccountInfo();
        result.can_access_business_account = true;
        result.business_account_info = businessInfo;
      } catch (error: any) {
        result.errors.push(`Business Account access: ${error.message}`);
        result.recommendations.push('Проверьте, что Business Account ID правильный и токен имеет доступ к нему');
      }

      // 3. Если есть ошибка доступа, добавляем рекомендации
      if (!result.can_access_phone || !result.can_access_business_account) {
        result.recommendations.push(
          'Убедитесь, что токен создан через System User с разрешениями: whatsapp_business_messaging, whatsapp_business_management'
        );
        result.recommendations.push(
          'Проверьте, что приложение связано с WhatsApp Business Account в Business Manager'
        );
        result.recommendations.push(
          'Убедитесь, что System User имеет доступ к WhatsApp Business Account'
        );
      }

      return result;
    } catch (error: any) {
      result.errors.push(`General error: ${error.message}`);
      return result;
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
        // Если нет переменных в HEADER с медиа, не добавляем компонент
        // Meta автоматически использует статическое изображение из шаблона
      } else {
        // HEADER текстовый - обрабатываем переменные
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
    } else if (component.type === 'BODY') {
      // Обработка BODY компонента
      const componentData: any = {
        type: 'body',
      };

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
    } else if (component.type === 'BUTTONS') {
      // Обработка BUTTONS компонента
      // Meta API требует отдельный компонент для каждой кнопки с динамическими переменными
      if (component.buttons) {
        for (let buttonIndex = 0; buttonIndex < component.buttons.length; buttonIndex++) {
          const button = component.buttons[buttonIndex];
          
          // Обрабатываем только кнопки с динамическими переменными
          if (button.type === 'URL' && button.url) {
            const urlMatches = button.url.match(/\{\{(\d+)\}\}/g) || [];
            if (urlMatches.length > 0) {
              const buttonComponent: any = {
                type: 'button',
                sub_type: 'url',
                index: buttonIndex, // Index кнопки (0, 1, 2...)
                parameters: [],
              };
              
              const sortedUrlMatches = urlMatches.sort((a: string, b: string) => {
                const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                return numA - numB;
              });
              
              for (const match of sortedUrlMatches) {
                const varNum = match.match(/\d+/)?.[0];
                if (varNum) {
                  const placeholder = `{{${varNum}}}`;
                  const value = variables[placeholder] || '';
                  buttonComponent.parameters.push({
                    type: 'text',
                    text: value || '',
                  });
                }
              }
              
              if (buttonComponent.parameters.length > 0) {
                components.push(buttonComponent);
              }
            }
          } else if (button.type === 'QUICK_REPLY' && button.text) {
            // Quick Reply кнопки не поддерживают динамические переменные в Meta API
            // Они всегда статические
          } else if (button.type === 'PHONE_NUMBER' && button.phone_number) {
            // Phone Number кнопки не поддерживают динамические переменные
            // Они всегда статические
          }
        }
      }
    }
  }
  return components;
}
