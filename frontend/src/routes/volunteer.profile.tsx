import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getVolunteerProfile,
  updateVolunteerProfile,
  type Volunteer,
} from "@/services/volunteerService";
import { getUser } from "@/lib/auth";
import { Camera, CheckCircle2, Clock, Mail, Phone, Heart, Pencil, X, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/volunteer/profile")({
  component: VolProfile,
});

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function VolProfile() {
  const navigate = useNavigate();

  const [user, setUser] = useState<Volunteer | null>(null);
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await getVolunteerProfile();
      const data = res.data.data;
      if (data) {
        setUser(data);
        setName(data.name || "");
        setPhone(data.phone || "");
        setProfileImage(data.profileImage || null);
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate({ to: "/login" });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type)) {
      toast.error("Please select a valid JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Image size must be less than 5MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("phone", phone.trim());
      if (selectedFile) {
        formData.append("profileImage", selectedFile);
      }

      const res = await updateVolunteerProfile(formData);
      const updatedUser = res.data;
      if (updatedUser) {
        const cached = getUser() || {};
        const merged = { ...cached, ...updatedUser };
        localStorage.setItem("user", JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent("user-profile-updated", { detail: merged }));
      }
      toast.success("Volunteer profile updated successfully!");
      setIsEditing(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      loadProfile();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-xs text-muted-foreground">Loading volunteer profile...</div>;
  }

  const avatarUrl = previewUrl || profileImage;
  const isApproved = user?.isVerified && user?.verificationStatus !== "REJECTED";
  const isRejected = user?.verificationStatus === "REJECTED";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Volunteer Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your responder details and verification status.</p>
        </div>
        {!isEditing && (
          <Button
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
          >
            <Pencil className="size-3.5 mr-1.5" /> Edit Profile
          </Button>
        )}
      </div>

      <div className="bg-card rounded-3xl border border-border/80 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-border/60">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user?.name || "Volunteer Avatar"}
                className="size-24 rounded-full object-cover border-2 border-emerald-100 shadow-sm"
              />
            ) : (
              <div className="size-24 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-3xl flex items-center justify-center border-2 border-emerald-200">
                {user?.name?.charAt(0).toUpperCase() || "V"}
              </div>
            )}

            {isEditing && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 size-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors cursor-pointer"
                title="Upload photo"
              >
                <Camera className="size-4" />
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
          </div>

          <div className="text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
              {isApproved ? (
                <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">
                  <CheckCircle2 className="size-3 mr-1 inline text-emerald-600" />
                  Verified Responder
                </Badge>
              ) : isRejected ? (
                <Badge variant="destructive" className="text-[10px] font-bold">
                  Verification Rejected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-800 border-amber-200">
                  <Clock className="size-3 mr-1 inline text-amber-600" />
                  Pending Admin Approval
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Community Emergency Responder</p>
            {isEditing && (
              <p className="text-[11px] text-indigo-600 font-medium">
                Tap camera icon to update photo (max 5MB).
              </p>
            )}
          </div>
        </div>

        {/* View Mode */}
        {!isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <Mail className="size-3.5 text-indigo-600" /> Email Address
              </span>
              <p className="font-semibold text-foreground text-sm">{user?.email}</p>
              <span className="text-[10px] text-emerald-700 font-medium">✓ Email Verified</span>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <Phone className="size-3.5 text-indigo-600" /> Phone Number
              </span>
              <p className="font-semibold text-foreground text-sm">{user?.phone || "Not provided"}</p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <Heart className="size-3.5 text-emerald-600" /> Volunteer Status
              </span>
              <p className="font-semibold text-foreground text-sm">
                {isApproved ? "Active & Authorized" : isRejected ? "Application Declined" : "Awaiting Admin Review"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">Account Role</span>
              <p className="font-semibold text-foreground text-sm">Community Responder</p>
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Phone Number</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="text-xs h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Email Address</Label>
              <Input
                value={user?.email}
                disabled
                className="text-xs h-10 bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setName(user?.name || "");
                  setPhone(user?.phone || "");
                }}
                className="text-xs"
              >
                <X className="size-3.5 mr-1" /> Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {saving ? "Saving Changes..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}