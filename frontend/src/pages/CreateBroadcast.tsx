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
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/hooks/use-toast";
import { formatAed, formatMessageCost, getMessageCostAed } from "@/lib/currency";

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

  const getRecipientCount = (): number => {
    if (formData.recipientMethod === "all") {
      return contacts?.filter((c: any) => c.opt_in)?.length || 0;
    }
    if (formData.recipientMethod === "paste") {
      return formData.numbers.split("\n").filter(Boolean).length;
    }
    if (formData.recipientMethod === "list" && formData.selectedListId) {
      // Would need to fetch list count - return 0 for now
      return 0;
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
                    <Label>Variable Mapping</Label>
                    <p className="text-xs text-muted-foreground">
                      Specify which contact data to use for variables
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
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="country">Country</SelectItem>
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
                            No saved lists
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

              {/* Rate Limits */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Rate Limits</h4>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label>Messages per batch</Label>
                    <Input
                      type="number"
                      value={formData.rateLimitPerBatch}
                      onChange={(e) =>
                        setFormData({ ...formData, rateLimitPerBatch: parseInt(e.target.value) || 50 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Delay between batches (sec)</Label>
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
                  <span className="text-muted-foreground">Rate</span>
                  <span className="font-medium">
                    {formData.rateLimitPerBatch} / batch, delay {formData.rateLimitDelaySeconds}s
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

              {selectedTemplate?.preview_text && (
                <div className="space-y-2">
                  <Label>Message Preview</Label>
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
