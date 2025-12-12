import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle, ClipboardList, Users } from "lucide-react";
import { useSupabase } from "@/hooks/useSupabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { contactListsBackendApi } from "@/lib/backend-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// CSV Example for download
const CSV_EXAMPLE = `phone,name,tags,opt_in
+393331234567,Mario Rossi,"VIP,Newsletter",true
+393339876543,Giulia Bianchi,Newsletter,true
+41791234567,Hans Mueller,"VIP,Premium",true
+393334567890,Luca Verdi,,false`;

export default function ListDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isConfigured } = useSupabase();
  const { isUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Получить информацию о списке
  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ['contact-lists', id],
    queryFn: () => contactListsBackendApi.getById(id!),
    enabled: !!id,
  });

  // Получить контакты из списка
  const { data: listMembers, isLoading: contactsLoading } = useQuery({
    queryKey: ['contact-lists', id, 'contacts'],
    queryFn: () => contactListsBackendApi.getContacts(id!),
    enabled: !!id,
  });

  // Импорт контактов в список
  const importContacts = useMutation({
    mutationFn: (contacts: any[]) =>
      contactListsBackendApi.import(id!, contacts),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists', id, 'contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      setIsImportOpen(false);
      setImportPreview([]);
      setImportErrors([]);
      toast({ 
        title: "Import Successful", 
        description: `Imported ${data.imported} contacts, ${data.skipped} skipped` 
      });
    },
    onError: (error: any) => {
      toast({ title: "Import Error", description: error.message, variant: "destructive" });
    },
  });

  // listMembers возвращает массив объектов вида { id, list_id, contact_id, contact: {...} }
  const contacts = listMembers?.map((member: any) => {
    // Извлекаем объект contact из каждого member
    return member.contact;
  }).filter((c: any) => c && c.id) || [];
  
  const filteredContacts = contacts.filter(
    (c: any) =>
      c.phone.includes(searchQuery) ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const errors: string[] = [];
    const data: any[] = [];
    
    // Validate headers
    if (!headers.includes('phone')) {
      errors.push('CSV must contain a "phone" column');
      return { data: [], errors };
    }
    
    // Удаляем country из обработки, если он есть
    if (headers.includes('country')) {
      const countryIndex = headers.indexOf('country');
      headers.splice(countryIndex, 1);
    }

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
      const row: any = {};
      
      headers.forEach((header, index) => {
        let value = values[index]?.trim() || '';
        // Remove quotes
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        row[header] = value;
      });

      // Validate phone
      if (!row.phone) {
        errors.push(`Row ${i + 1}: missing phone number`);
        continue;
      }

      // Parse tags
      if (row.tags) {
        row.tags = row.tags.split(',').map((t: string) => t.trim());
      } else {
        row.tags = [];
      }

      // Для списков opt_in ВСЕГДА true (требование Meta)
      // Игнорируем значение из CSV, всегда ставим true
      row.opt_in = true;
      
      // Name defaults to null if empty
      if (!row.name || row.name.trim() === '') {
        row.name = null;
      }

      data.push(row);
    }

    return { data, errors };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({ title: "Error", description: "Please select a CSV file", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { data, errors } = parseCSV(text);
      setImportPreview(data);
      setImportErrors(errors);
      setIsImportOpen(true);
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportConfirm = async () => {
    if (importPreview.length === 0) {
      toast({ title: "Error", description: "No data to import", variant: "destructive" });
      return;
    }

    try {
      // ВАЖНО: Для списков opt_in ВСЕГДА true (требование Meta)
      const contactsToImport = importPreview.map((c: any) => ({
        phone: c.phone,
        name: c.name || null,
        tags: c.tags || [],
        opt_in: true, // Всегда true для контактов в списках
      }));
      
      await importContacts.mutateAsync(contactsToImport);
    } catch (error: any) {
      // Error handled by mutation
    }
  };

  const downloadCSVExample = () => {
    const blob = new Blob([CSV_EXAMPLE], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_example.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: "CSV example file downloaded" });
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen">
        <TopBar title="List Details" subtitle="View and manage list contacts" />
        <div className="p-6">
          <Card className="p-6">
            <EmptyState
              icon={ClipboardList}
              title="Database not connected"
              description="Connect to Supabase in Settings to view lists."
              action={{
                label: "Go to Settings",
                onClick: () => navigate("/settings"),
              }}
            />
          </Card>
        </div>
      </div>
    );
  }

  if (listLoading) {
    return (
      <div className="min-h-screen">
        <TopBar title="List Details" subtitle="Loading..." />
        <div className="p-6">
          <Card className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen">
        <TopBar title="List Details" subtitle="List not found" />
        <div className="p-6">
          <Card className="p-6">
            <EmptyState
              icon={ClipboardList}
              title="List not found"
              description="The list you're looking for doesn't exist."
              action={{
                label: "Back to Lists",
                onClick: () => navigate("/lists"),
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
        title={list.name}
        subtitle={list.description || "Contact list details"}
      />

      <div className="p-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/lists")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Lists
        </Button>

        {/* Actions */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative w-64">
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {!isUser && (
            <div className="flex gap-2">
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadCSVExample}>
                <FileText className="mr-2 h-4 w-4" />
                CSV Example
              </Button>
            </div>
          )}
        </div>

        {/* Import CSV Dialog */}
        {!isUser && (
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Contacts to List</DialogTitle>
                <DialogDescription>
                  Review data before importing to "{list.name}"
                </DialogDescription>
              </DialogHeader>
              
              {importErrors.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    Errors found:
                  </div>
                  {importErrors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              )}

              {importPreview.length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Ready to import: {importPreview.length} contacts
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Phone</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Tags</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-sm">{row.phone}</TableCell>
                            <TableCell>{row.name || '—'}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {row.tags?.map((tag: string) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default">
                                Opt-in ✓
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {importPreview.length > 10 && (
                      <div className="p-2 text-center text-sm text-muted-foreground bg-muted/50">
                        ... and {importPreview.length - 10} more contacts
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleImportConfirm} disabled={importContacts.isPending}>
                      {importContacts.isPending ? "Importing..." : `Import ${importPreview.length} contacts`}
                    </Button>
                  </div>
                </>
              )}

              {importPreview.length === 0 && importErrors.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  No data to import
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Stats */}
        <div className="mb-6 flex gap-4">
          <Card className="px-4 py-3">
            <p className="text-sm text-muted-foreground">Total Contacts</p>
            <p className="text-2xl font-semibold">
              {contactsLoading ? <Skeleton className="h-8 w-16" /> : contacts.length}
            </p>
          </Card>
          <Card className="px-4 py-3">
            <p className="text-sm text-muted-foreground">Opt-in</p>
            <p className="text-2xl font-semibold text-success">
              {contactsLoading ? <Skeleton className="h-8 w-16" /> : contacts.filter((c: any) => c.opt_in)?.length || 0}
            </p>
          </Card>
        </div>

        {/* Loading State */}
        {contactsLoading && (
          <Card className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!contactsLoading && filteredContacts.length === 0 && (
          <Card className="p-6">
            <EmptyState
              icon={Users}
              title="No contacts found"
              description={searchQuery ? "Try a different search term" : "This list is empty. Import contacts to get started."}
              action={
                !isUser
                  ? {
                      label: "Import CSV",
                      onClick: () => fileInputRef.current?.click(),
                    }
                  : undefined
              }
            />
          </Card>
        )}

        {/* Contacts Table */}
        {!contactsLoading && filteredContacts.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Opt-in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact: any) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-mono text-sm">
                      {contact.phone}
                    </TableCell>
                    <TableCell>{contact.name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags?.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        Opt-in ✓
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}

