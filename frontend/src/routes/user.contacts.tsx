import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, Phone, User, Mail, Heart, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
} from "@/services/userService";
import { toast } from "sonner";

export const Route = createFileRoute("/user/contacts")({ component: ContactsPage });

interface Contact {
  _id?: string;
  id?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  relation: string;
}

function ContactsPage() {
  const [list, setList] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rel, setRel] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    setLoading(true);
    try {
      const response = await getEmergencyContacts();
      setList(response.data.data || []);
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(contact: Contact) {
    setIsEditing(true);
    setEditingId(contact._id || contact.id || "");
    setName(contact.contactName);
    setEmail(contact.contactEmail);
    setPhone(contact.contactPhone);
    setRel(contact.relation);
    setOpen(true);
  }

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setRel("");
    setIsEditing(false);
    setEditingId("");
  }

  async function saveContact() {
    if (!name || !email || !phone || !rel) {
      return toast.error("Please fill in all fields.");
    }

    try {
      if (isEditing) {
        await updateEmergencyContact(editingId, {
          contactName: name,
          contactEmail: email,
          contactPhone: phone,
          relation: rel,
        });
        toast.success("Contact updated successfully.");
      } else {
        await addEmergencyContact({
          contactName: name,
          contactEmail: email,
          contactPhone: phone,
          relation: rel,
        });
        toast.success("Trusted contact added.");
      }

      setOpen(false);
      resetForm();
      loadContacts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save contact.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this emergency contact?")) return;
    try {
      await deleteEmergencyContact(id);
      toast.success("Contact removed.");
      loadContacts();
    } catch {
      toast.error("Failed to delete contact.");
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Emergency Contacts
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            These trusted contacts will receive instant SMS and live GPS alerts during emergencies.
          </p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="font-bold text-xs h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs">
              <Plus className="mr-1.5 size-4" /> Add Trusted Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {isEditing ? "Edit Trusted Contact" : "Add Trusted Emergency Contact"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maya Sharma"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone Number (with country code)</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email Address</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@example.com"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Relationship</Label>
                <Input
                  value={rel}
                  onChange={(e) => setRel(e.target.value)}
                  placeholder="e.g. Mother, Sister, Partner, Roommate"
                  className="text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button onClick={saveContact} className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isEditing ? "Save Changes" : "Add Contact"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-muted-foreground">Loading trusted circle...</div>
      ) : list.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/80 p-8 text-center space-y-3 shadow-xs">
          <div className="size-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Heart className="size-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No emergency contacts yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Add at least one family member or trusted friend so they can be notified immediately during an emergency SOS.
          </p>
          <Button onClick={() => setOpen(true)} className="mt-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="mr-1.5 size-4" /> Add First Contact
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((c) => {
            const cid = c._id || c.id || "";
            return (
              <div key={cid} className="bg-card rounded-2xl border border-border/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-foreground">{c.contactName}</h3>
                      <span className="inline-block mt-0.5 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        {c.relation}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-slate-400" />
                      <span className="font-medium text-foreground">{c.contactPhone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 text-slate-400" />
                      <span>{c.contactEmail}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 mt-4 flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(c)} className="h-8 text-xs text-muted-foreground hover:text-foreground">
                    <Pencil className="size-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(cid)} className="h-8 text-xs text-red-600 hover:bg-red-50">
                    <Trash2 className="size-3.5 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}