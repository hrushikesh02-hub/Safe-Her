import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { nearbyResponders } from "@/lib/mockData";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getSupportTeams } from "@/services/userService";
import { requestSupport } from "@/services/userService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/user/support-teams")({ component: SupportTeams });

function SupportTeams() {
  const [responders, setResponders] = useState<any[]>([]);
  useEffect(() => {
  fetchSupportTeams();
}, []);

const fetchSupportTeams = async () => {
  try {
    const response = await getSupportTeams();
    setResponders(response.data.data);
  } catch (error) {
    console.log(error);
    toast.error("Unable to load support teams");
  }
};
const handleRequest = async (
  volunteerId: string
) => {

  try {

    const response =
      await requestSupport(volunteerId);

    toast.success(
      response.data.message
    );

  } catch (error:any) {

    toast.error(
      error.response?.data?.message
    );

  }

};

const [selectedVolunteer, setSelectedVolunteer] = useState<any>(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Nearby support teams" desc="Verified volunteers and responders within 3 km of you." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {responders.map((r) => (
          <div key={r.id} className="rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-elegant">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-full gradient-hero font-bold text-white">{r.name[0]}</div>
              <div className="flex-1">
                <div className="font-semibold">{r.name}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
  <Star className="size-3 fill-warning text-warning" />
  Verified Volunteer
</div>
              </div>
              <StatusBadge status={r.isVerified ? "Verified" : "Pending"} />
            </div>
            <div className="mt-4 flex gap-2">
              <Button
  variant="outline"
  className="flex-1"
  onClick={() => setSelectedVolunteer(r)}
>
  View Details
</Button>
             <Button
className="flex-1 gradient-hero text-white"
onClick={() => handleRequest(r._id)}
>
Request
</Button> 
            </div>
          </div>
        ))}
      </div>
      <Dialog
  open={!!selectedVolunteer}
  onOpenChange={() => setSelectedVolunteer(null)}
>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Volunteer Details</DialogTitle>
    </DialogHeader>

    {selectedVolunteer && (
      <div className="space-y-5">

        <div className="flex justify-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-primary text-3xl font-bold text-white">
            {selectedVolunteer.name.charAt(0)}
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Name</p>
          <p className="font-semibold">{selectedVolunteer.name}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p>{selectedVolunteer.email}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Phone</p>
          <p>{selectedVolunteer.phone}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Role</p>
          <p className="capitalize">{selectedVolunteer.role}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Verification</p>
          <p>
            {selectedVolunteer.isVerified
              ? "✅ Verified Volunteer"
              : "❌ Not Verified"}
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Availability</p>
          <p>
            {selectedVolunteer.isBlocked
              ? "Unavailable"
              : "Available"}
          </p>
        </div>

        <Button
          className="w-full gradient-hero text-white"
          onClick={() => {
            handleRequest(selectedVolunteer._id);
            setSelectedVolunteer(null);
          }}
        >
          Request Assistance
        </Button>

      </div>
    )}
  </DialogContent>
</Dialog>
    </div>
    
  );
}