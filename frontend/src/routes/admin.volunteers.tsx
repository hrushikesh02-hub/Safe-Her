import { createFileRoute } from "@tanstack/react-router";
import { Check, X, Search, Users, UserCheck, UserX, RotateCw, Mail, Phone, Calendar, ShieldCheck, AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { useEffect, useState, useMemo } from "react";
import {
  getVolunteers,
  verifyVolunteer,
  rejectVolunteer,
  resendVerificationEmail,
} from "@/services/adminService";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/ui/UserAvatar";

export const Route = createFileRoute("/admin/volunteers")({ component: VolVerify });

function VolVerify() {
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject dialog state
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadVolunteers();
  }, []);

  async function loadVolunteers() {
    setLoading(true);
    try {
      const response = await getVolunteers();
      setVolunteers(response.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load volunteers");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(id: string) {
    setActionLoading(id);
    try {
      const res = await verifyVolunteer(id);
      if (res.data?.emailStatus === "FAILED") {
        toast.warning("Volunteer approved, but email delivery failed. You can use 'Resend Email'.");
      } else {
        toast.success("Volunteer Verified & Notification Email Sent!");
      }
      loadVolunteers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Verification Failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConfirmReject() {
    if (!rejectDialogId) return;
    setActionLoading(rejectDialogId);
    try {
      const res = await rejectVolunteer(rejectDialogId, rejectReason);
      if (res.data?.emailStatus === "FAILED") {
        toast.warning("Volunteer rejected, but notification email delivery failed.");
      } else {
        toast.success("Volunteer application rejected and notification email sent.");
      }
      setRejectDialogId(null);
      setRejectReason("");
      loadVolunteers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to reject volunteer");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResendEmail(id: string) {
    setActionLoading(id);
    try {
      await resendVerificationEmail(id);
      toast.success("Verification notification email resent successfully via Brevo!");
      loadVolunteers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to resend email");
    } finally {
      setActionLoading(null);
    }
  }

  const counts = useMemo(() => {
    const pending = volunteers.filter((v) => !v.isVerified && v.verificationStatus !== "REJECTED").length;
    const approved = volunteers.filter((v) => v.isVerified && v.verificationStatus !== "REJECTED").length;
    const rejected = volunteers.filter((v) => v.verificationStatus === "REJECTED").length;
    return { pending, approved, rejected, total: volunteers.length };
  }, [volunteers]);

  const filteredList = useMemo(() => {
    return volunteers.filter((v) => {
      let matchesTab = false;
      if (activeTab === "pending") {
        matchesTab = !v.isVerified && v.verificationStatus !== "REJECTED";
      } else if (activeTab === "approved") {
        matchesTab = v.isVerified && v.verificationStatus !== "REJECTED";
      } else if (activeTab === "rejected") {
        matchesTab = v.verificationStatus === "REJECTED";
      }

      const matchesSearch =
        v.name?.toLowerCase().includes(search.toLowerCase()) ||
        v.email?.toLowerCase().includes(search.toLowerCase()) ||
        v.phone?.includes(search);

      return matchesTab && matchesSearch;
    });
  }, [volunteers, activeTab, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Volunteer Verification Center"
        desc="Review volunteer applicant credentials, approve response readiness, and manage notification delivery."
      />

      {/* Top Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Registered"
          value={counts.total.toString()}
          icon={<Users className="size-5" />}
        />
        <StatCard
          label="Pending Verification"
          value={counts.pending.toString()}
          icon={<AlertCircle className="size-5 text-amber-500" />}
          tone="warning"
        />
        <StatCard
          label="Approved Responders"
          value={counts.approved.toString()}
          icon={<UserCheck className="size-5 text-emerald-600" />}
          tone="success"
        />
        <StatCard
          label="Rejected Applications"
          value={counts.rejected.toString()}
          icon={<UserX className="size-5 text-red-500" />}
          tone="emergency"
        />
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Verification Status Tabs */}
        <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl">
          <Button
            size="sm"
            variant={activeTab === "pending" ? "default" : "ghost"}
            onClick={() => setActiveTab("pending")}
            className="text-xs font-bold"
          >
            Pending ({counts.pending})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "approved" ? "default" : "ghost"}
            onClick={() => setActiveTab("approved")}
            className="text-xs font-bold"
          >
            Approved ({counts.approved})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "rejected" ? "default" : "ghost"}
            onClick={() => setActiveTab("rejected")}
            className="text-xs font-bold"
          >
            Rejected ({counts.rejected})
          </Button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Volunteer Grid List */}
      {filteredList.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
          <UserCheck className="size-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-sm">No volunteer records in this tab.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredList.map((v: any) => {
            const isApproved = v.isVerified && v.verificationStatus !== "REJECTED";
            const isRejected = v.verificationStatus === "REJECTED";
            const isPending = !isApproved && !isRejected;

            return (
              <div
                key={v._id}
                className={`rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                  isPending
                    ? "border-amber-400/50 bg-amber-500/5"
                    : isApproved
                    ? "border-emerald-500/30 bg-card"
                    : "border-red-400/40 bg-red-500/5 opacity-85"
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Avatar, Name, Status Badge */}
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={v.profileImage}
                      name={v.name}
                      role="volunteer"
                      size="lg"
                      className="rounded-2xl"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-foreground truncate">{v.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isApproved
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : isRejected
                              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {isApproved ? "VERIFIED" : isRejected ? "REJECTED" : "PENDING REVIEW"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Applicant Details */}
                  <div className="rounded-xl border bg-card/70 p-3 text-xs space-y-1.5 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-foreground font-medium truncate">{v.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-foreground font-medium">{v.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                      <span>Registered: {new Date(v.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Email Delivery Notification Status */}
                    {v.verificationNotificationStatus && (
                      <div className="flex items-center justify-between pt-1 border-t text-[11px]">
                        <span>Email Status:</span>
                        <span
                          className={`font-semibold ${
                            v.verificationNotificationStatus === "SENT"
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}
                        >
                          {v.verificationNotificationStatus === "SENT"
                            ? "✓ Notification Delivered"
                            : "⚠ Delivery Failed"}
                        </span>
                      </div>
                    )}

                    {/* Rejection reason display */}
                    {isRejected && v.rejectionReason && (
                      <div className="pt-1 border-t text-[11px] text-red-600">
                        <strong>Reason:</strong> {v.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t flex items-center gap-2">
                  {isPending && (
                    <>
                      <Button
                        size="sm"
                        disabled={actionLoading === v._id}
                        onClick={() => handleVerify(v._id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        <Check className="mr-1 size-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === v._id}
                        onClick={() => {
                          setRejectDialogId(v._id);
                          setRejectReason("");
                        }}
                        className="flex-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <X className="mr-1 size-3.5" />
                        Reject
                      </Button>
                    </>
                  )}

                  {isApproved && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading === v._id}
                      onClick={() => handleResendEmail(v._id)}
                      className="w-full text-xs"
                    >
                      <Send className="mr-1.5 size-3.5 text-primary" />
                      Resend Approval Email
                    </Button>
                  )}

                  {isRejected && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === v._id}
                        onClick={() => handleVerify(v._id)}
                        className="flex-1 text-xs text-emerald-600"
                      >
                        Re-Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === v._id}
                        onClick={() => handleResendEmail(v._id)}
                        className="flex-1 text-xs"
                      >
                        Resend Email
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Reason Modal Dialog */}
      <Dialog open={!!rejectDialogId} onOpenChange={(open) => !open && setRejectDialogId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-red-600">
              <UserX className="size-5" /> Reject Volunteer Application
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Please enter the administrative reason for declining this volunteer application. This explanation will be included in the automated notification email sent to the applicant.
            </p>
            <textarea
              className="w-full h-24 p-3 rounded-xl border bg-muted/30 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="e.g., Background verification incomplete, insufficient contact documentation..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRejectDialogId(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={actionLoading === rejectDialogId}
              onClick={handleConfirmReject}
              className="text-xs font-bold"
            >
              Confirm Rejection & Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}