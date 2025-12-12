import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Upload, Download, Trash2, FileText, AlertCircle, CheckCircle, Users, ClipboardList } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSupabase } from "@/hooks/useSupabase";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { contactListsBackendApi } from "@/lib/backend-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// CSV Example for download
const CSV_EXAMPLE = `phone,name,tags,opt_in
+393331234567,Mario Rossi,"VIP,Newsletter",true
+393339876543,Giulia Bianchi,Newsletter,true
+41791234567,Hans Mueller,"VIP,Premium",true
+393334567890,Luca Verdi,,false`;

export default function Lists() {
  const navigate = useNavigate();
  const { isConfigured } = useSupabase();
  const { isUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [newList, setNewList] = useState({
    name: "",
    description: "",
  });

  // Получить все списки
  const { data: lists, isLoading } = useQuery({
    queryKey: ['contact-lists'],
    queryFn: () => contactListsBackendApi.getAll(),
  });

  // Создать список
  const createList = useMutation({
    mutationFn: (data: { name: string; description?: string }) => 
      contactListsBackendApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      setIsAddOpen(false);
      setNewList({ name: "", description: "" });
      toast({ title: "List Created", description: "Contact list created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create list", variant: "destructive" });
    },
  });

  // Импорт контактов в список
  const importContacts = useMutation({
    mutationFn: ({ listId, contacts }: { listId: string; contacts: any[] }) =>
      contactListsBackendApi.import(listId, contacts),
    onSuccess: (data) => {
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

  const filteredLists = lists?.filter(
    (list: any) =>
      list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      list.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleAddList = async () => {
    if (!newList.name) {
      toast({ title: "Error", description: "List name is required", variant: "destructive" });
      return;
    }
    
    await createList.mutateAsync({
      name: newList.name,
      description: newList.description || undefined,
    });
  };

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

      // Parse opt_in
      row.opt_in = row.opt_in === 'true' || row.opt_in === '1' || row.opt_in === 'yes';
      
      // Name defaults to "—" if empty
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
    if (importPreview.length === 0 || !selectedListId) {
      toast({ title: "Error", description: "No data to import or list not selected", variant: "destructive" });
      return;
    }

    try {
      const contactsToImport = importPreview.map((c: any) => ({
        phone: c.phone,
        name: c.name || null,
        tags: c.tags || [],
        opt_in: c.opt_in !== undefined ? c.opt_in : true,
      }));
      
      await importContacts.mutateAsync({ listId: selectedListId, contacts: contactsToImport });
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

  const handleDelete = async (id: string) => {
    // TODO: Implement delete
    toast({ title: "Not implemented", description: "Delete functionality coming soon" });
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen">
        <TopBar title="Lists" subtitle="Manage contact lists for campaigns" />
        <div className="p-6">
          <Card className="p-6">
            <EmptyState
              icon={ClipboardList}
              title="Database not connected"
              description="Connect to Supabase in Settings to manage lists."
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

  return (
    <div className="min-h-screen">
      <TopBar
        title="Lists"
        subtitle="Upload and manage contact lists for campaigns"
      />

      <div className="p-6">
        {/* Actions */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search lists..."
              className="pl-9"
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
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create List
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New List</DialogTitle>
                    <DialogDescription>
                      Create a new contact list for campaigns
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">List Name *</Label>
                      <Input
                        id="name"
                        placeholder="My Campaign List"
                        value={newList.name}
                        onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Optional description"
                        value={newList.description}
                        onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleAddList}
                      disabled={createList.isPending}
                    >
                      {createList.isPending ? "Creating..." : "Create List"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
                  Select a list and review data before importing
                </DialogDescription>
              </DialogHeader>
              
              {!selectedListId && (
                <div className="space-y-2">
                  <Label>Select List</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    onChange={(e) => setSelectedListId(e.target.value)}
                    value={selectedListId || ''}
                  >
                    <option value="">Choose a list...</option>
                    {lists?.map((list: any) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
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

              {importPreview.length > 0 && selectedListId && (
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
                          <TableHead>Opt-in</TableHead>
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
                              <Badge variant={row.opt_in ? "default" : "secondary"}>
                                {row.opt_in ? "Yes" : "No"}
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
                    <Button variant="outline" onClick={() => {
                      setIsImportOpen(false);
                      setSelectedListId(null);
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleImportConfirm} disabled={importContacts.isPending}>
                      {importContacts.isPending ? "Importing..." : `Import ${importPreview.length} contacts`}
                    </Button>
                  </div>
                </>
              )}

              {importPreview.length === 0 && importErrors.length === 0 && selectedListId && (
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
            <p className="text-sm text-muted-foreground">Total Lists</p>
            <p className="text-2xl font-semibold">
              {isLoading ? <Skeleton className="h-8 w-16" /> : lists?.length || 0}
            </p>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && filteredLists.length === 0 && (
          <Card className="p-6">
            <EmptyState
              icon={ClipboardList}
              title="No lists found"
              description={searchQuery ? "Try a different search term" : "Create your first contact list to get started"}
              action={
                !isUser
                  ? {
                      label: "Create List",
                      onClick: () => setIsAddOpen(true),
                    }
                  : undefined
              }
            />
          </Card>
        )}

        {/* Lists Table */}
        {!isLoading && filteredLists.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLists.map((list: any) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{list.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {list.description || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(list.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Users className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/lists/${list.id}`)}>
                            View Contacts
                          </DropdownMenuItem>
                          {!isUser && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(list.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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

