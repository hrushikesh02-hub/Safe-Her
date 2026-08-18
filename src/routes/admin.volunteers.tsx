import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  getVolunteers,
  verifyVolunteer,
  rejectVolunteer,
} from "@/services/adminService";
import { Input } from "@/components/ui/input";
import { Search, Users, UserCheck, UserX } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

export const Route = createFileRoute("/admin/volunteers")({ component: VolVerify });

function VolVerify() {
  const [volunteers, setVolunteers] = useState<any[]>([]);
const [search, setSearch] = useState("");

useEffect(() => {
  loadVolunteers();
}, []);

async function loadVolunteers() {
  try {
    const response = await getVolunteers();

    setVolunteers(response.data.data);

  } catch (error) {
    console.error(error);
    toast.error("Unable to load volunteers");
  }
}

async function handleVerify(id: string) {
  try {
    await verifyVolunteer(id);

    toast.success("Volunteer Verified");

    loadVolunteers();

  } catch (error) {
    toast.error("Verification Failed");
  }
}

async function handleReject(id: string) {

  const ok = window.confirm(
    "Reject this volunteer?"
  );

  if (!ok) return;

  try {

    await rejectVolunteer(id);

    toast.success("Volunteer Rejected");

    loadVolunteers();

  } catch (error) {

    toast.error("Unable to Reject");

  }

}
const filteredVolunteers = volunteers.filter(
  (v: any) =>
    !v.isVerified &&
    (
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.email.toLowerCase().includes(search.toLowerCase())
    )
);
  return (
    <div className="space-y-6">
      <PageHeader title="Volunteer verification" desc="Approve or reject pending volunteer applications." />
      <div className="grid gap-4 sm:grid-cols-3">

  <StatCard
    label="Total Volunteers"
    value={volunteers.length.toString()}
    icon={<Users className="size-4" />}
  />

  <StatCard
    label="Verified"
    value={
      volunteers.filter((v)=>v.isVerified).length.toString()
    }
    icon={<UserCheck className="size-4" />}
    tone="success"
  />

  <StatCard
    label="Pending"
    value={
      volunteers.filter((v)=>!v.isVerified).length.toString()
    }
    icon={<UserX className="size-4" />}
    tone="warning"
  />

</div>

<div className="relative max-w-md">

<Search className="absolute left-3 top-3 size-4 text-muted-foreground"/>

<Input
placeholder="Search Volunteer..."
className="pl-10"
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>

</div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredVolunteers.map((v:any) => (
          <div key={v._id} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-full gradient-hero font-bold text-white">{v.name[0]}</div>
              <div className="flex-1">
                <div className="font-semibold">{v.name}</div>
                <div className="text-xs text-muted-foreground">
  {v.email}
</div>

<div className="text-xs text-muted-foreground">
  {v.phone}
</div>

<div className="text-xs text-muted-foreground">
  Joined {new Date(v.createdAt).toLocaleDateString()}
</div>
              </div>
              <StatusBadge
status={v.isVerified ? "Verified" : "Pending"}
/>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => handleVerify(v._id) }disabled={v.isVerified} className="flex-1 bg-success text-white hover:bg-success/90"><Check className="mr-1 size-4" />Verify</Button>
              <Button onClick={() => handleReject(v._id)} variant="outline" className="flex-1"><X className="mr-1 size-4" />Reject</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}