import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../services/supabase';
import { metaApi } from '../services/metaApi';

const router = Router();

// GET /api/templates - Получить все шаблоны
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await db.templates.findAll();
    res.json(templates);
  } catch (error: any) {
    return next(error);
  }
});

// POST /api/templates/sync - Синхронизировать шаблоны из Meta API
// ВАЖНО: Этот роут должен быть ПЕРЕД /:id, иначе /sync будет интерпретироваться как id
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metaTemplates = await metaApi.getTemplates();
    let synced = 0;

    for (const metaTemplate of metaTemplates) {
      // Извлечь переменные из компонентов
      const variables: string[] = [];
      const components = metaTemplate.components || [];

      for (const component of components) {
        if (component.type === 'BODY' || component.type === 'HEADER') {
          // Переменные в тексте BODY или HEADER
          const text = component.text || component.example?.body_text?.[0] || component.example?.header_text?.[0] || '';
          const matches = text.match(/\{\{(\d+)\}\}/g);
          if (matches) {
            variables.push(...matches);
          }
        } else if (component.type === 'BUTTONS') {
          // Переменные в URL кнопок (например, https://example.com/{{1}})
          const buttons = component.buttons || [];
          for (const button of buttons) {
            if (button.type === 'URL' && button.url) {
              const urlMatches = button.url.match(/\{\{(\d+)\}\}/g);
              if (urlMatches) {
                variables.push(...urlMatches);
              }
            }
          }
        }
      }

      // Создать preview_text с информацией о компонентах
      const bodyComponent = components.find((c: any) => c.type === 'BODY');
      const headerComponent = components.find((c: any) => c.type === 'HEADER');
      const buttonsComponent = components.find((c: any) => c.type === 'BUTTONS');
      
      let previewText = bodyComponent?.text || '';
      
      // Добавить информацию о наличии изображения в HEADER
      if (headerComponent?.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComponent.format)) {
        const mediaType = headerComponent.format.toLowerCase();
        previewText = `[${mediaType}] ${previewText}`.trim();
      }
      
      // Добавить информацию о кнопках
      if (buttonsComponent?.buttons && buttonsComponent.buttons.length > 0) {
        const buttonTypes = buttonsComponent.buttons.map((b: any) => {
          if (b.type === 'URL') return '🔗 Link';
          if (b.type === 'QUICK_REPLY') return '💬 Quick Reply';
          if (b.type === 'PHONE_NUMBER') return '📞 Call';
          return '🔘 Button';
        });
        previewText = `${previewText}\n\n${buttonTypes.join(' • ')}`;
      }

      // Преобразовать статус из Meta API (APPROVED/PENDING/REJECTED) в lowercase для базы данных
      const statusMap: Record<string, 'approved' | 'pending' | 'rejected'> = {
        'APPROVED': 'approved',
        'PENDING': 'pending',
        'REJECTED': 'rejected',
      };
      const normalizedStatus = statusMap[metaTemplate.status?.toUpperCase() || ''] || 'pending';

      const template = {
        whatsapp_template_id: metaTemplate.id,
        name: metaTemplate.name,
        category: metaTemplate.category,
        language: metaTemplate.language,
        status: normalizedStatus,
        components: metaTemplate.components || [],
        variables: [...new Set(variables)], // уникальные переменные
        preview_text: previewText,
      };

      await db.templates.upsert(template);
      synced++;
    }

    res.json({ synced });
  } catch (error: any) {
    return next(error);
  }
});

// GET /api/templates/:id - Получить шаблон по ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const template = await db.templates.findById(id);
    res.json(template);
  } catch (error: any) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        error: true,
        message: 'Template not found',
        code: 'NOT_FOUND',
      });
    }
    return next(error);
  }
});

export default router;

