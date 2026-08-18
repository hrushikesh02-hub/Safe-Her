import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, Phone } from "lucide-react";
import { useState,useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  getEmergencyContacts,
  addEmergencyContact,updateEmergencyContact,deleteEmergencyContact
} from "@/services/userService";
import { PageHeader } from "@/components/PageHeader";
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
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [rel, setRel] = useState("");
  const [email, setEmail] = useState("");
  useEffect(() => {
  loadContacts();
}, []);

async function loadContacts() {
  try {
    const response = await getEmergencyContacts();
    setList(response.data.data);
  } catch {
    toast.error("Failed to load contacts");
  }
}

  async function saveContact() {
  if (!name || !email || !phone || !rel) {
    return toast.error("All fields are required");
  }

  try {
  if (isEditing) {
    await updateEmergencyContact(editingId, {
      contactName: name,
      contactEmail: email,
      contactPhone: phone,
      relation: rel,
    });

    toast.success("Contact updated");
  } else {
    await addEmergencyContact({
      contactName: name,
      contactEmail: email,
      contactPhone: phone,
      relation: rel,
    });

    toast.success("Contact added");
  }

    setOpen(false);
    setName("");
    setEmail("");
    setPhone("");
    setRel("");
    setIsEditing(false);
setEditingId("");

    loadContacts();
  } catch (error: any) {
    toast.error(
      error.response?.data?.message || "Failed to add contact"
    );
  }
}

  return (
    <div className="space-y-6">
      <PageHeader title="Trusted emergency contacts" desc="These contacts are notified instantly when you trigger an SOS." action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gradient-hero text-white"><Plus className="mr-1 size-4" />Add contact</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add emergency contact</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div className="space-y-2"><Label>Relationship</Label><Input value={rel} onChange={(e) => setRel(e.target.value)} placeholder="Sister, Father, Friend..." /></div>
              <Button
  onClick={saveContact}
  className="w-full gradient-hero text-white"
>
  {isEditing ? "Update Contact" : "Save Contact"}
</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <div key={c.id} className="group rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-elegant">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-full gradient-hero font-bold text-white">{c.contactName[0]}</div>
                <div>
                  <div className="font-semibold">{c.contactName}</div>
                  <div className="text-xs text-muted-foreground">{c.relation}</div>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                <Button
  size="icon"
  variant="ghost"
  aria-label="Edit"
  onClick={() => {
    setIsEditing(true);
    setEditingId(c._id ?? c.id ?? "");

    setName(c.contactName);
    setEmail(c.contactEmail);
    setPhone(c.contactPhone);
    setRel(c.relation);

    setOpen(true);
  }}
>
  <Pencil className="size-4" />
</Button>
                <Button size="icon" variant="ghost" aria-label="Delete" onClick={async () => {
  try {
    await deleteEmergencyContact(c._id ?? c.id ?? "");

    toast.success("Contact removed");

    loadContacts();
  } catch (error: any) {
    toast.error(
      error.response?.data?.message || "Failed to delete contact"
    );
  }
}}><Trash2 className="size-4 text-emergency" /></Button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Phone className="size-4 text-muted-foreground" /> {c.contactPhone}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {c.contactEmail}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-4 text-sm font-semibold">Table view</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Phone</th><th className="p-4">Relationship</th></tr>
          </thead>
          <tbody className="divide-y">
            {list.map((c) => (
              <tr key={c.id}><td className="p-4 font-medium">{c.contactName}</td><td className="p-4">{c.contactEmail}</td><td className="p-4">{c.contactPhone}</td><td className="p-4">{c.relation}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}