import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { getUserProfile, updateUserProfile } from "@/services/userService";
import { getUser } from "@/lib/auth";
import { Camera, CheckCircle2, User, Mail, Phone, ShieldCheck, Pencil, X } from "lucide-react";

export const Route = createFileRoute("/user/profile")({ component: ProfilePage });

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

interface UserData {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  profileImage?: string;
  isVerified?: boolean;
  isEmailVerified?: boolean;
  createdAt: string;
}

function ProfilePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<UserData | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await getUserProfile();
      const data = res.data;
      if (data) {
        setUser(data);
        setName(data.name || "");
        setPhone(data.phone || "");
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        toast.error("Session expired. Please sign in again.");
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
      toast.error("Please choose a valid JPG, PNG or WebP image.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Image size must be less than 5MB.");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  async function handleSaveProfile(e: React.FormEvent) {
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

      const res = await updateUserProfile(formData);
      const updatedUser = res.data;
      if (updatedUser) {
        const cached = getUser() || {};
        const merged = { ...cached, ...updatedUser };
        localStorage.setItem("user", JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent("user-profile-updated", { detail: merged }));
      }
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      loadProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-xs text-muted-foreground">Loading your profile...</div>;
  }

  const avatarUrl = previewUrl || user?.profileImage;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account information and emergency preferences.</p>
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

      {/* Main Profile Card */}
      <div className="bg-card rounded-3xl border border-border/80 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-border/60">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user?.name || "User Avatar"}
                className="size-24 rounded-full object-cover border-2 border-indigo-100 shadow-sm"
              />
            ) : (
              <div className="size-24 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-3xl flex items-center justify-center border-2 border-indigo-200">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}

            {isEditing && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 size-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors cursor-pointer"
                title="Upload profile photo"
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
              <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">
                <CheckCircle2 className="size-3 mr-1 inline text-emerald-600" />
                Verified Member
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Protected SafeHer User</p>
            {isEditing && (
              <p className="text-[11px] text-indigo-600 font-medium">
                Tap camera icon to change profile photo (JPG, PNG max 5MB).
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
              <span className="text-[10px] text-emerald-700 font-medium">✓ Verified</span>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <Phone className="size-3.5 text-indigo-600" /> Phone Number
              </span>
              <p className="font-semibold text-foreground text-sm">{user?.phone || "Not provided"}</p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-indigo-600" /> Account Role
              </span>
              <p className="font-semibold text-foreground text-sm capitalize">{user?.role}</p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">Member Since</span>
              <p className="font-semibold text-foreground text-sm">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Active Member"}
              </p>
            </div>
          </div>
        ) : (
          /* Edit Mode Form */
          <form onSubmit={handleSaveProfile} className="space-y-4">
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
              <p className="text-[10px] text-muted-foreground">Email is verified and cannot be modified.</p>
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