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
import { useContacts } from "@/hooks/useContacts";
import { useContactListsFromBackend } from "@/hooks/useBackendContacts";
import { useCreateCampaignBackend } from "@/hooks/useBackendCampaigns";
import { useSupabase } from "@/hooks/useSupabase";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/hooks/use-toast";
import { formatAed, formatMessageCost, getMessageCostAed } from "@/lib/currency";
import { contactsBackendApi } from "@/lib/backend-api";

const steps = [
  { id: 1, name: "Template", icon: MessageSquare },
  { id: 2, name: "Recipients", icon: Users },
  { id: 3, name: "Launch", icon: Send },
];

export default function CreateBroadcast() {
  const navigate = useNavigate();
  const { isConfigured } = useSupabase();
  const { isUser } = useAuth();
  const { data: templates, isLoading: templatesLoading } = useApprovedTemplates();
  
  // Redirect user role to broadcasts list
  if (isUser) {
    navigate("/broadcasts");
    return null;
  }
  const { data: contacts, refetch: refetchContacts } = useContacts();
  const { data: contactLists } = useContactListsFromBackend();
  const createCampaign = useCreateCampaignBackend();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    templateId: "",
    variableMapping: {} as Record<string, string>,
    recipientMethod: "all",
    selectedListId: "",
    numbers: "",
  });

  const selectedTemplate = templates?.find((t: any) => t.id === formData.templateId);
  // Получаем переменные из шаблона и сортируем их по номеру ({{1}}, {{2}}, ...)
  const templateVariables = (selectedTemplate?.variables || []).sort((a: string, b: string) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
    return numA - numB;
  });

  const getRecipientCount = (): number => {
    if (formData.recipientMethod === "all") {
      return contacts?.filter((c: any) => c.opt_in)?.length || 0;
    }
    if (formData.recipientMethod === "paste") {
      return formData.numbers.split("\n").filter(Boolean).length;
    }
    if (formData.recipientMethod === "list" && formData.selectedListId) {
      // Получаем количество контактов из выбранного списка
      const selectedList = contactLists?.find((l: any) => l.id === formData.selectedListId);
      // Если у списка есть информация о количестве контактов, используем её
      // Иначе возвращаем 0 (будет загружено при создании кампании)
      return selectedList?.contact_count || 0;
    }
    return 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && !formData.templateId) {
      toast({ title: "Error", description: "Please select a template", variant: "destructive" });
      return;
    }
    if (currentStep === 2) {
      const count = getRecipientCount();
      if (count === 0) {
        toast({ title: "Error", description: "Please add recipients", variant: "destructive" });
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
        if (contactIds.length === 0) {
          toast({ 
            title: "Error", 
            description: "No opt-in contacts found", 
            variant: "destructive" 
          });
          setIsSubmitting(false);
          return;
        }
      } else if (formData.recipientMethod === "list") {
        if (!formData.selectedListId) {
          toast({ 
            title: "Error", 
            description: "Please select a contact list", 
            variant: "destructive" 
          });
          setIsSubmitting(false);
          return;
        }
        contactListId = formData.selectedListId;
      } else if (formData.recipientMethod === "paste") {
        // Для вставленных номеров находим существующие контакты по номерам
        const numbers = formData.numbers.split("\n").filter(Boolean).map(n => n.trim());
        if (numbers.length === 0) {
          toast({ 
            title: "Error", 
            description: "Please enter at least one phone number", 
            variant: "destructive" 
          });
          setIsSubmitting(false);
          return;
        }
        
        // Нормализуем номера для поиска
        const normalizedNumbers = numbers.map(n => n.replace(/[^\d+]/g, ''));
        
        // Находим существующие контакты по номерам телефонов
        const foundContacts = contacts?.filter((c: any) => {
          const normalizedPhone = c.phone.replace(/[^\d+]/g, '');
          return normalizedNumbers.some(n => {
            return normalizedPhone === n || 
                   normalizedPhone.endsWith(n) ||
                   n.endsWith(normalizedPhone);
          });
        }) || [];
        
        // Находим номера, для которых контакты не найдены
        const foundPhones = new Set(foundContacts.map((c: any) => c.phone.replace(/[^\d+]/g, '')));
        const missingNumbers = normalizedNumbers.filter(n => {
          return !Array.from(foundPhones).some(fp => 
            fp === n || fp.endsWith(n) || n.endsWith(fp)
          );
        });
        
        // Создаем контакты для номеров, которых нет в базе
        if (missingNumbers.length > 0) {
          try {
            const newContacts = await Promise.all(
              missingNumbers.map(phone => 
                contactsBackendApi.create({
                  phone: phone.startsWith('+') ? phone : `+${phone}`,
                  name: undefined,
                  opt_in: true, // Автоматически созданные контакты для рассылки имеют opt_in: true
                })
              )
            );
            // Добавляем новые контакты к найденным
            foundContacts.push(...newContacts);
            // Обновляем список контактов
            await refetchContacts();
          } catch (createError: any) {
            console.error('Error creating contacts:', createError);
            toast({ 
              title: "Error", 
              description: `Failed to create contacts: ${createError.message}`, 
              variant: "destructive" 
            });
            setIsSubmitting(false);
            return;
          }
        }
        
        // Фильтруем только opt-in контакты и получаем их ID
        contactIds = foundContacts
          .filter((c: any) => c.opt_in === true)
          .map((c: any) => c.id);
        
        if (contactIds.length === 0) {
          toast({ 
            title: "Error", 
            description: "No opt-in contacts found for the entered phone numbers", 
            variant: "destructive" 
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Проверка: должен быть хотя бы один способ выбора контактов
      if (!contactListId && contactIds.length === 0 && !contactTags) {
        toast({ 
          title: "Error", 
          description: "Please select contacts using one of the methods: all contacts, contact list, or paste phone numbers", 
          variant: "destructive" 
        });
        setIsSubmitting(false);
        return;
      }

      const campaign = await createCampaign.mutateAsync({
        name: campaignName,
        description: "",
        template_id: formData.templateId,
        variable_mapping: formData.variableMapping,
        // rate_limit теперь берется из настроек автоматически
        ...(contactListId && { contact_list_id: contactListId }),
        ...(contactIds.length > 0 && { contact_ids: contactIds }),
        ...(contactTags && contactTags.length > 0 && { contact_tags: contactTags }),
      });

      toast({ title: "Success", description: "Campaign created" });
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
        <TopBar title="New Broadcast" subtitle="Create WhatsApp campaign" />
        <div className="p-6">
          <Card className="p-6">
            <EmptyState
              icon={Send}
              title="Database not connected"
              description="Connect to Supabase in Settings"
              action={{
                label: "Settings",
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
        title="New Broadcast"
        subtitle="Select Meta template and recipients"
      />

      <div className="p-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/broadcasts")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Broadcasts
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
                  Select Template
                </h3>
                <p className="text-sm text-muted-foreground">
                  Templates are loaded from Meta WhatsApp Business API
                </p>
              </div>

              {templatesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading templates...
                </div>
              ) : templates?.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No Templates"
                  description="Sync templates from Meta in the Templates section"
                  action={{
                    label: "Go to Templates",
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
                          
                          {/* Информация о компонентах */}
                          {template.components && (
                            <div className="flex flex-wrap gap-2 mt-2 text-xs">
                              {template.components.some((c: any) => c.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format)) && (
                                <span className="rounded bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  🖼️ {template.components.find((c: any) => c.type === 'HEADER')?.format || 'Media'}
                                </span>
                              )}
                              {template.components.some((c: any) => c.type === 'BUTTONS') && (
                                <span className="rounded bg-green-100 px-2 py-1 text-green-700 dark:bg-green-900 dark:text-green-300">
                                  🔘 Buttons ({template.components.find((c: any) => c.type === 'BUTTONS')?.buttons?.length || 0})
                                </span>
                              )}
                              {template.components.some((c: any) => c.type === 'BODY') && (
                                <span className="rounded bg-gray-100 px-2 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                  📝 Body Text
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Preview сообщения */}
                          <div className="mt-3 rounded-lg bg-muted/30 p-3">
                            <div className="bubble-outgoing max-w-[280px] p-2">
                              {/* Показать изображение если есть HEADER с IMAGE */}
                              {template.components?.some((c: any) => c.type === 'HEADER' && c.format === 'IMAGE') && (
                                <div className="mb-2 rounded bg-muted overflow-hidden">
                                  {template.components?.find((c: any) => c.type === 'HEADER' && c.format === 'IMAGE')?.example?.header_handle?.[0] ? (
                                    <img 
                                      src={template.components.find((c: any) => c.type === 'HEADER' && c.format === 'IMAGE').example.header_handle[0]} 
                                      alt="Template header" 
                                      className="w-full h-auto max-h-48 object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                        if (placeholder) placeholder.style.display = 'block';
                                      }}
                                    />
                                  ) : null}
                                  <div className="p-4 text-center text-xs text-muted-foreground bg-muted" style={{ display: template.components?.find((c: any) => c.type === 'HEADER' && c.format === 'IMAGE')?.example?.header_handle?.[0] ? 'none' : 'block' }}>
                                    🖼️ Image Preview
                                  </div>
                                </div>
                              )}
                              <p className="text-sm text-foreground whitespace-pre-line">
                                {template.preview_text || template.components?.find((c: any) => c.type === 'BODY')?.text || "Template content"}
                              </p>
                              {/* Показать кнопки если есть - делаем их кликабельными */}
                              {template.components?.find((c: any) => c.type === 'BUTTONS')?.buttons?.map((button: any, idx: number) => {
                                const buttonUrl = button.type === 'URL' ? button.url : null;
                                const buttonText = button.text || button.url || 'Button';
                                
                                return (
                                  <a
                                    key={idx}
                                    href={buttonUrl || '#'}
                                    target={buttonUrl ? "_blank" : undefined}
                                    rel={buttonUrl ? "noopener noreferrer" : undefined}
                                    onClick={(e) => {
                                      if (!buttonUrl) {
                                        e.preventDefault();
                                        toast({
                                          title: button.type === 'QUICK_REPLY' ? 'Quick Reply' : button.type === 'PHONE_NUMBER' ? 'Phone Number' : 'Button',
                                          description: buttonText,
                                        });
                                      }
                                    }}
                                    className={cn(
                                      "mt-2 block rounded bg-primary/10 px-2 py-1 text-xs text-primary transition-colors",
                                      buttonUrl ? "hover:bg-primary/20 cursor-pointer" : "cursor-default"
                                    )}
                                  >
                                    {button.type === 'URL' && '🔗'} {button.type === 'QUICK_REPLY' && '💬'} {button.type === 'PHONE_NUMBER' && '📞'}
                                    {buttonText}
                                  </a>
                                );
                              })}
                              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                                12:34 PM ✓✓
                              </p>
                            </div>
                          </div>
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
                    <Label>Variable Mapping</Label>
                    <p className="text-xs text-muted-foreground">
                      Specify which contact data to use for variables
                    </p>
                  </div>
                  {templateVariables.map((varName: string) => (
                    <div key={varName} className="flex items-center gap-4">
                      <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {varName}
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
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
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
                  Select Recipients
                </h3>
                <p className="text-sm text-muted-foreground">
                  Who should receive the broadcast?
                </p>
              </div>

              <Tabs
                value={formData.recipientMethod}
                onValueChange={(value) =>
                  setFormData({ ...formData, recipientMethod: value })
                }
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All with opt-in</TabsTrigger>
                  <TabsTrigger value="list">From list</TabsTrigger>
                  <TabsTrigger value="paste">Manual</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <div className="rounded-lg border border-border p-6 text-center">
                    <Users className="mx-auto h-10 w-10 text-primary" />
                    <p className="mt-3 text-sm font-medium">
                      All contacts with consent
                    </p>
                    <p className="text-3xl font-bold mt-2 text-primary">
                      {contacts?.filter((c: any) => c.opt_in)?.length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      recipients
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
                        <SelectValue placeholder="Select list" />
                      </SelectTrigger>
                      <SelectContent>
                        {contactLists?.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No saved lists. Create one in Lists section.
                          </div>
                        ) : (
                          contactLists?.map((list: any) => (
                            <SelectItem key={list.id} value={list.id}>
                              {list.name} {list.contact_count ? `(${list.contact_count})` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {formData.selectedListId && (
                      <div className="rounded-lg border border-border p-6 text-center">
                        <Users className="mx-auto h-10 w-10 text-primary" />
                        <p className="mt-3 text-sm font-medium">
                          Selected list
                        </p>
                        <p className="text-3xl font-bold mt-2 text-primary">
                          {getRecipientCount()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          recipients
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="paste" className="mt-4">
                  <div className="space-y-2">
                    <Label>Phone Numbers (one per line)</Label>
                    <Textarea
                      placeholder={"+39123456789\n+39987654321\n+39111222333"}
                      className="min-h-[150px] font-mono text-sm"
                      value={formData.numbers}
                      onChange={(e) =>
                        setFormData({ ...formData, numbers: e.target.value })
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      Entered: <strong>{formData.numbers.split("\n").filter(Boolean).length}</strong> numbers
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Rate Limits теперь настраиваются в Settings */}
              <div className="space-y-4 pt-4 border-t">
                <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                  <p>Rate limits настраиваются в разделе Settings и применяются ко всем кампаниям.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Launch */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Review and Create
                </h3>
                <p className="text-sm text-muted-foreground">
                  Campaign will be created as draft
                </p>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Template</span>
                  <span className="font-medium">{selectedTemplate?.name || "—"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Language</span>
                  <Badge variant="secondary">{selectedTemplate?.language || "—"}</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Recipients</span>
                  <span className="font-medium text-lg">{getRecipientCount()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Rate Limits</span>
                  <span className="font-medium text-sm text-muted-foreground">
                    Из настроек
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Estimated cost</span>
                  <span className="font-medium text-primary">
                    {(() => {
                      const count = getRecipientCount();
                      if (count === 0) return "—";
                      const cost = getMessageCostAed((selectedTemplate?.category as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION') || 'MARKETING');
                      return `≈ ${formatAed(count * cost)}`;
                    })()}
                  </span>
                </div>
              </div>

              {selectedTemplate && (
                <div className="space-y-2">
                  <Label>Message Preview</Label>
                  
                  {/* Информация о компонентах */}
                  {selectedTemplate.components && (
                    <div className="flex flex-wrap gap-2 mb-2 text-xs">
                      {selectedTemplate.components.some((c: any) => c.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format)) && (
                        <span className="rounded bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          🖼️ {selectedTemplate.components.find((c: any) => c.type === 'HEADER')?.format || 'Media'}
                        </span>
                      )}
                      {selectedTemplate.components.some((c: any) => c.type === 'BUTTONS') && (
                        <span className="rounded bg-green-100 px-2 py-1 text-green-700 dark:bg-green-900 dark:text-green-300">
                          🔘 Buttons ({selectedTemplate.components.find((c: any) => c.type === 'BUTTONS')?.buttons?.length || 0})
                        </span>
                      )}
                      {selectedTemplate.components.some((c: any) => c.type === 'BODY') && (
                        <span className="rounded bg-gray-100 px-2 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          📝 Body Text
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="bg-background rounded-lg p-3 shadow-sm max-w-sm">
                      <div className="bubble-outgoing">
                        {/* Показать изображение если есть HEADER с IMAGE */}
                        {selectedTemplate.components?.some((c: any) => c.type === 'HEADER' && c.format === 'IMAGE') && (
                          <div className="mb-2 rounded bg-muted overflow-hidden">
                            {selectedTemplate.components?.find((c: any) => c.type === 'HEADER' && c.format === 'IMAGE')?.example?.header_handle?.[0] ? (
                              <img 
                                src={selectedTemplate.components.find((c: any) => c.type === 'HEADER' && c.format === 'IMAGE').example.header_handle[0]} 
                                alt="Template header" 
                                className="w-full h-auto max-h-48 object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                  if (placeholder) placeholder.style.display = 'block';
                                }}
                              />
                            ) : null}
                            <div className="p-4 text-center text-xs text-muted-foreground bg-muted" style={{ display: selectedTemplate.components?.find((c: any) => c.type === 'HEADER' && c.format === 'IMAGE')?.example?.header_handle?.[0] ? 'none' : 'block' }}>
                              🖼️ Image Preview
                            </div>
                          </div>
                        )}
                        <p className="text-sm text-foreground whitespace-pre-line">
                          {selectedTemplate.preview_text || selectedTemplate.components?.find((c: any) => c.type === 'BODY')?.text || "Template content"}
                        </p>
                        {/* Показать кнопки если есть - делаем их кликабельными */}
                        {selectedTemplate.components?.find((c: any) => c.type === 'BUTTONS')?.buttons?.map((button: any, idx: number) => {
                          const buttonUrl = button.type === 'URL' ? button.url : null;
                          const buttonText = button.text || button.url || 'Button';
                          
                          return (
                            <a
                              key={idx}
                              href={buttonUrl || '#'}
                              target={buttonUrl ? "_blank" : undefined}
                              rel={buttonUrl ? "noopener noreferrer" : undefined}
                              onClick={(e) => {
                                if (!buttonUrl) {
                                  e.preventDefault();
                                  toast({
                                    title: button.type === 'QUICK_REPLY' ? 'Quick Reply' : button.type === 'PHONE_NUMBER' ? 'Phone Number' : 'Button',
                                    description: buttonText,
                                  });
                                }
                              }}
                              className={cn(
                                "mt-2 block rounded bg-primary/10 px-2 py-1 text-xs text-primary transition-colors",
                                buttonUrl ? "hover:bg-primary/20 cursor-pointer" : "cursor-default"
                              )}
                            >
                              {button.type === 'URL' && '🔗'} {button.type === 'QUICK_REPLY' && '💬'} {button.type === 'PHONE_NUMBER' && '📞'}
                              {buttonText}
                            </a>
                          );
                        })}
                        <p className="text-xs text-muted-foreground mt-2 text-right">12:34 ✓✓</p>
                      </div>
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create Campaign
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                After creation, go to campaign page to start the broadcast
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
              Back
            </Button>
            {currentStep < 3 && (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
