import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ContactHistoryDialog } from "@/components/ContactHistoryDialog";
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
import { Search, Plus, Upload, Download, MoreHorizontal, Users, Trash2, FileText, AlertCircle, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useContacts, useCreateContact, useDeleteContact, useBulkCreateContacts } from "@/hooks/useContacts";
import { useSupabase } from "@/hooks/useSupabase";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

// CSV Example for download
const CSV_EXAMPLE = `phone,name,country,tags,opt_in
+393331234567,Mario Rossi,IT,"VIP,Newsletter",true
+393339876543,Giulia Bianchi,IT,Newsletter,true
+41791234567,Hans Mueller,CH,"VIP,Premium",true
+393334567890,Luca Verdi,IT,,false`;

export default function Contacts() {
  const navigate = useNavigate();
  const { isConfigured } = useSupabase();
  const { isUser } = useAuth();
  const { data: contacts, isLoading, error } = useContacts();
  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();
  const bulkCreate = useBulkCreateContacts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [newContact, setNewContact] = useState({
    phone: "",
    name: "",
    tags: "",
    opt_in: true,
  });
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedContactForHistory, setSelectedContactForHistory] = useState<{
    id: string;
    name: string | null;
    phone: string;
  } | null>(null);

  const filteredContacts = contacts?.filter(
    (c: any) =>
      c.phone.includes(searchQuery) ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const handleAddContact = async () => {
    if (!newContact.phone) {
      toast({ title: "Error", description: "Phone number is required", variant: "destructive" });
      return;
    }
    
    await createContact.mutateAsync({
      phone: newContact.phone,
      name: newContact.name || undefined,
      tags: newContact.tags ? newContact.tags.split(",").map(t => t.trim()) : [],
      opt_in: newContact.opt_in,
      opt_in_at: newContact.opt_in ? new Date().toISOString() : undefined,
    });
    
    setIsAddOpen(false);
    setNewContact({ phone: "", name: "", tags: "", opt_in: true });
    toast({ title: "Contact Added", description: "Contact created successfully" });
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
      if (row.opt_in) {
        row.opt_in_at = new Date().toISOString();
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
      await bulkCreate.mutateAsync(importPreview);
      setIsImportOpen(false);
      setImportPreview([]);
      setImportErrors([]);
      toast({ 
        title: "Import Complete", 
        description: `Imported ${importPreview.length} contacts` 
      });
    } catch (error: any) {
      toast({ title: "Import Error", description: error.message, variant: "destructive" });
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

  const exportContacts = () => {
    if (!contacts || contacts.length === 0) {
      toast({ title: "Error", description: "No contacts to export", variant: "destructive" });
      return;
    }

    const headers = ['phone', 'name', 'country', 'tags', 'opt_in'];
    const rows = contacts.map((c: any) => [
      c.phone,
      c.name || '',
      c.country || '',
      `"${(c.tags || []).join(',')}"`,
      c.opt_in ? 'true' : 'false'
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${contacts.length} contacts exported` });
  };

  const handleDelete = async (id: string) => {
    await deleteContact.mutateAsync(id);
  };

  const getCountryFlag = (country: string | null) => {
    switch (country) {
      case "IT": return "🇮🇹";
      case "CH": return "🇨🇭";
      case "FR": return "🇫🇷";
      case "DE": return "🇩🇪";
      case "US": return "🇺🇸";
      default: return "🌍";
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen">
        <TopBar title="Contacts" subtitle="Manage your WhatsApp contact lists" />
        <div className="p-6">
          <Card className="p-6">
            <EmptyState
              icon={Users}
              title="Database not connected"
              description="Connect to Supabase in Settings to manage contacts."
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
        title="Contacts"
        subtitle="Manage your WhatsApp contact lists"
      />

      <div className="p-6">
        {/* Actions */}
        <div className="mb-6 flex items-center justify-between">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
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
              <Button variant="outline" onClick={exportContacts}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadCSVExample}>
                <FileText className="mr-2 h-4 w-4" />
                CSV Example
              </Button>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      placeholder="+39 XXX XXX XXXX"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name (optional)</Label>
                    <Input
                      id="name"
                      placeholder="Full name"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (optional, comma-separated)</Label>
                    <Input
                      id="tags"
                      placeholder="VIP, Newsletter"
                      value={newContact.tags}
                      onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="opt-in">Opt-in Consent</Label>
                    <Switch
                      id="opt-in"
                      checked={newContact.opt_in}
                      onCheckedChange={(checked) => setNewContact({ ...newContact, opt_in: checked })}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleAddContact}
                    disabled={createContact.isPending}
                  >
                    {createContact.isPending ? "Adding..." : "Add Contact"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          )}

          {/* Import CSV Dialog */}
          {!isUser && (
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import Contacts from CSV</DialogTitle>
                  <DialogDescription>
                    Review data before importing
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
                            <TableHead>Country</TableHead>
                            <TableHead>Tags</TableHead>
                            <TableHead>Opt-in</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.slice(0, 10).map((row, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-sm">{row.phone}</TableCell>
                              <TableCell>{row.name || '—'}</TableCell>
                              <TableCell>{row.country || '—'}</TableCell>
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
                      <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleImportConfirm} disabled={bulkCreate.isPending}>
                        {bulkCreate.isPending ? "Importing..." : `Import ${importPreview.length} contacts`}
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
        </div>

        {/* Stats */}
        <div className="mb-6 flex gap-4">
          <Card className="px-4 py-3">
            <p className="text-sm text-muted-foreground">Total Contacts</p>
            <p className="text-2xl font-semibold">
              {isLoading ? <Skeleton className="h-8 w-16" /> : contacts?.length || 0}
            </p>
          </Card>
          <Card className="px-4 py-3">
            <p className="text-sm text-muted-foreground">Opt-in</p>
            <p className="text-2xl font-semibold text-success">
              {isLoading ? <Skeleton className="h-8 w-16" /> : contacts?.filter((c: any) => c.opt_in)?.length || 0}
            </p>
          </Card>
          <Card className="px-4 py-3">
            <p className="text-sm text-muted-foreground">Opt-out</p>
            <p className="text-2xl font-semibold text-muted-foreground">
              {isLoading ? <Skeleton className="h-8 w-16" /> : contacts?.filter((c: any) => !c.opt_in)?.length || 0}
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

        {/* Error State */}
        {error && (
          <Card className="p-6">
            <EmptyState
              icon={Users}
              title="Failed to load contacts"
              description={error.message}
            />
          </Card>
        )}

        {/* Table */}
        {!isLoading && !error && filteredContacts.length > 0 ? (
          <Card>
            <Table className="table-sticky">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Phone</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Opt-in</TableHead>
                  <TableHead>Last Interaction</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
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
                      <span className="inline-flex items-center gap-1">
                        <span className="text-lg">{getCountryFlag(contact.country)}</span>
                        {contact.country || "—"}
                      </span>
                    </TableCell>
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
                      <Badge variant={contact.opt_in ? "default" : "secondary"}>
                        {contact.opt_in ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.last_interaction
                        ? format(new Date(contact.last_interaction), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!isUser && (
                            <>
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedContactForHistory({
                                    id: contact.id,
                                    name: contact.name || null,
                                    phone: contact.phone,
                                  });
                                  setHistoryDialogOpen(true);
                                }}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                View History
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(contact.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          !isLoading && !error && (
            <Card className="p-6">
              <EmptyState
                icon={Users}
                title="No contacts yet"
                description="Add your first contact or import from CSV."
                action={{
                  label: "Add Contact",
                  onClick: () => setIsAddOpen(true),
                }}
              />
            </Card>
          )
        )}

        {/* Contact History Dialog */}
        {selectedContactForHistory && (
          <ContactHistoryDialog
            contactId={selectedContactForHistory.id}
            contactName={selectedContactForHistory.name || ""}
            contactPhone={selectedContactForHistory.phone}
            open={historyDialogOpen}
            onOpenChange={setHistoryDialogOpen}
          />
        )}
      </div>
    </div>
  );
}
