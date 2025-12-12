import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Check, Users, FileText, Send, Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApprovedTemplates } from "@/hooks/useTemplates";
import { useContacts, useContactLists } from "@/hooks/useContacts";
import { useCreateCampaignBackend } from "@/hooks/useBackendCampaigns";
import { useSupabase } from "@/hooks/useSupabase";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/hooks/use-toast";

const steps = [
  { id: 1, name: "Шаблон", icon: MessageSquare },
  { id: 2, name: "Получатели", icon: Users },
  { id: 3, name: "Запуск", icon: Send },
];

export default function CreateBroadcast() {
  const navigate = useNavigate();
  const { isConfigured } = useSupabase();
  const { data: templates, isLoading: templatesLoading } = useApprovedTemplates();
  const { data: contacts } = useContacts();
  const { data: contactLists } = useContactLists();
  const createCampaign = useCreateCampaignBackend();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    templateId: "",
    variableMapping: {} as Record<string, string>,
    recipientMethod: "all",
    selectedListId: "",
    numbers: "",
    rateLimitPerBatch: 50,
    rateLimitDelaySeconds: 60,
  });

  const selectedTemplate = templates?.find((t: any) => t.id === formData.templateId);
  const templateVariables = selectedTemplate?.variables || [];

  const getRecipientCount = () => {
    if (formData.recipientMethod === "all") {
      return contacts?.filter((c: any) => c.opt_in)?.length || 0;
    }
    if (formData.recipientMethod === "paste") {
      return formData.numbers.split("\n").filter(Boolean).length;
    }
    if (formData.recipientMethod === "list" && formData.selectedListId) {
      // Would need to fetch list count
      return "—";
    }
    return 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && !formData.templateId) {
      toast({ title: "Ошибка", description: "Выберите шаблон", variant: "destructive" });
      return;
    }
    if (currentStep === 2) {
      const count = getRecipientCount();
      if (count === 0) {
        toast({ title: "Ошибка", description: "Добавьте получателей", variant: "destructive" });
        return;
      }
    }
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;
    
    setIsSubmitting(true);
    try {
      // Create campaign with template name
      const campaignName = `${selectedTemplate.name}_${new Date().toISOString().split('T')[0]}`;
      
      // Get contact IDs based on method
      let contactIds: string[] = [];
      let contactListId: string | undefined;
      let contactTags: string[] | undefined;

      if (formData.recipientMethod === "all") {
        contactIds = contacts?.filter((c: any) => c.opt_in)?.map((c: any) => c.id) || [];
      } else if (formData.recipientMethod === "list" && formData.selectedListId) {
        contactListId = formData.selectedListId;
      } else if (formData.recipientMethod === "paste") {
        // Для вставленных номеров нужно создать контакты или найти их
        const numbers = formData.numbers.split("\n").filter(Boolean);
        // Пока используем contact_ids, но нужно будет обработать номера
        contactIds = []; // TODO: обработать вставленные номера
      }

      const campaign = await createCampaign.mutateAsync({
        name: campaignName,
        description: "",
        template_id: formData.templateId,
        variable_mapping: formData.variableMapping,
        rate_limit: {
          batch: formData.rateLimitPerBatch,
          delay_minutes: Math.ceil(formData.rateLimitDelaySeconds / 60),
        },
        ...(contactListId && { contact_list_id: contactListId }),
        ...(contactIds.length > 0 && { contact_ids: contactIds }),
        ...(contactTags && { contact_tags: contactTags }),
      });

      toast({ title: "Готово", description: "Кампания создана" });
      navigate(`/broadcasts/${campaign.id}`);
    } catch (error) {
      // Error toast is handled by the mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen">
        <TopBar title="Новая рассылка" subtitle="Создание WhatsApp кампании" />
        <div className="p-6">
          <Card className="p-6">
            <EmptyState
              icon={Send}
              title="База данных не подключена"
              description="Подключите Supabase в настройках"
              action={{
                label: "Настройки",
                onClick: () => navigate("/settings"),
              }}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar
        title="Новая рассылка"
        subtitle="Выберите шаблон Meta и получателей"
      />

      <div className="p-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/broadcasts")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к рассылкам
        </Button>

        {/* Steps Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                      currentStep > step.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : currentStep === step.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground"
                    )}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "ml-3 text-sm font-medium",
                      currentStep >= step.id
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-6 h-0.5 w-20",
                      currentStep > step.id ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-6 max-w-3xl mx-auto">
          {/* Step 1: Select Template */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Выберите шаблон
                </h3>
                <p className="text-sm text-muted-foreground">
                  Шаблоны загружаются из Meta WhatsApp Business API
                </p>
              </div>

              {templatesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Загрузка шаблонов...
                </div>
              ) : templates?.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Нет шаблонов"
                  description="Синхронизируйте шаблоны из Meta в разделе Templates"
                  action={{
                    label: "Перейти к шаблонам",
                    onClick: () => navigate("/templates"),
                  }}
                />
              ) : (
                <div className="grid gap-3">
                  {templates?.map((template: any) => (
                    <div
                      key={template.id}
                      onClick={() => setFormData({ ...formData, templateId: template.id })}
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                        formData.templateId === template.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{template.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {template.language}
                            </Badge>
                            <Badge 
                              variant={template.status === 'approved' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {template.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.category}
                          </p>
                          {template.preview_text && (
                            <p className="text-sm mt-2 p-2 bg-muted rounded">
                              {template.preview_text}
                            </p>
                          )}
                        </div>
                        {formData.templateId === template.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Variable Mapping (if template has variables) */}
              {selectedTemplate && templateVariables.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label>Маппинг переменных</Label>
                    <p className="text-xs text-muted-foreground">
                      Укажите какие данные контакта подставлять в переменные
                    </p>
                  </div>
                  {templateVariables.map((varName: string, index: number) => (
                    <div key={varName} className="flex items-center gap-4">
                      <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {`{{${index + 1}}}`}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={formData.variableMapping[varName] || ""}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            variableMapping: {
                              ...formData.variableMapping,
                              [varName]: value,
                            },
                          })
                        }
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Выберите поле" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Имя</SelectItem>
                          <SelectItem value="phone">Телефон</SelectItem>
                          <SelectItem value="country">Страна</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Recipients */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Выберите получателей
                </h3>
                <p className="text-sm text-muted-foreground">
                  Кому отправить рассылку?
                </p>
              </div>

              <Tabs
                value={formData.recipientMethod}
                onValueChange={(value) =>
                  setFormData({ ...formData, recipientMethod: value })
                }
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">Все с opt-in</TabsTrigger>
                  <TabsTrigger value="list">Из списка</TabsTrigger>
                  <TabsTrigger value="paste">Вручную</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <div className="rounded-lg border border-border p-6 text-center">
                    <Users className="mx-auto h-10 w-10 text-primary" />
                    <p className="mt-3 text-sm font-medium">
                      Все контакты с согласием
                    </p>
                    <p className="text-3xl font-bold mt-2 text-primary">
                      {contacts?.filter((c: any) => c.opt_in)?.length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      получателей
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="list" className="mt-4">
                  <div className="space-y-4">
                    <Select
                      value={formData.selectedListId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, selectedListId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите список" />
                      </SelectTrigger>
                      <SelectContent>
                        {contactLists?.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            Нет сохранённых списков
                          </div>
                        ) : (
                          contactLists?.map((list: any) => (
                            <SelectItem key={list.id} value={list.id}>
                              {list.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="paste" className="mt-4">
                  <div className="space-y-2">
                    <Label>Номера телефонов (по одному на строку)</Label>
                    <Textarea
                      placeholder={"+39123456789\n+39987654321\n+39111222333"}
                      className="min-h-[150px] font-mono text-sm"
                      value={formData.numbers}
                      onChange={(e) =>
                        setFormData({ ...formData, numbers: e.target.value })
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      Введено: <strong>{formData.numbers.split("\n").filter(Boolean).length}</strong> номеров
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Rate Limits */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Ограничения скорости</h4>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label>Сообщений в пачке</Label>
                    <Input
                      type="number"
                      value={formData.rateLimitPerBatch}
                      onChange={(e) =>
                        setFormData({ ...formData, rateLimitPerBatch: parseInt(e.target.value) || 50 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Задержка между пачками (сек)</Label>
                    <Input
                      type="number"
                      value={formData.rateLimitDelaySeconds}
                      onChange={(e) =>
                        setFormData({ ...formData, rateLimitDelaySeconds: parseInt(e.target.value) || 60 })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Launch */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Проверьте и создайте
                </h3>
                <p className="text-sm text-muted-foreground">
                  Кампания будет создана как черновик
                </p>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Шаблон</span>
                  <span className="font-medium">{selectedTemplate?.name || "—"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Язык</span>
                  <Badge variant="secondary">{selectedTemplate?.language || "—"}</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Получателей</span>
                  <span className="font-medium text-lg">{getRecipientCount()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Скорость</span>
                  <span className="font-medium">
                    {formData.rateLimitPerBatch} / пачка, пауза {formData.rateLimitDelaySeconds}с
                  </span>
                </div>
              </div>

              {selectedTemplate?.preview_text && (
                <div className="space-y-2">
                  <Label>Превью сообщения</Label>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="bg-background rounded-lg p-3 shadow-sm max-w-sm">
                      <p className="text-sm">{selectedTemplate.preview_text}</p>
                      <p className="text-xs text-muted-foreground mt-2 text-right">12:34 ✓✓</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Создать кампанию
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                После создания перейдите на страницу кампании чтобы запустить рассылку
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex justify-between border-t border-border pt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
            {currentStep < 3 && (
              <Button onClick={handleNext}>
                Далее
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
