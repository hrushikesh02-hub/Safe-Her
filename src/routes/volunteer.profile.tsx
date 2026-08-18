import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/PageHeader";
import { Camera, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  getVolunteerProfile,
  updateVolunteerProfile,
  type Volunteer,
} from "@/services/volunteerService";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/volunteer/profile")({
  component: VolProfile,
});

function VolProfile() {
  const navigate = useNavigate();

  const [available, setAvailable] = useState(true);

  const [user, setUser] = useState<Volunteer | null>(null);
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  // Image the <img> tag actually renders (backend URL, object-URL preview, or localStorage fallback)
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tracks a blob: URL created via URL.createObjectURL so we can revoke it and
  // avoid memory leaks once it's no longer needed.
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    loadProfile();

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile() {
    try {
      const res = await getVolunteerProfile();
      const data = res.data.data;

      setUser(data);
      setName(data.name || "");
      setPhone(data.phone || "");

      // Prefer the backend image; only fall back to a locally cached one
      // if the backend has none.
      if (data.profileImage) {
        setProfileImage(data.profileImage);
      } else {
        const cached = localStorage.getItem("volunteerProfileImage");
        setProfileImage(cached || null);
      }

      // A fresh load means any pending local preview is stale.
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setSelectedFile(null);
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate({ to: "/login" });
        return;
      }

      if (status === 404) {
        toast.error("Volunteer profile not found.");
        return;
      }

      if (status === 500) {
        toast.error("Server error while loading profile.");
        return;
      }

      toast.error("Unable to load profile");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    objectUrlRef.current = previewUrl;

    setSelectedFile(file);
    setProfileImage(previewUrl);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("phone", phone);

      if (selectedFile) {
        formData.append("profileImage", selectedFile);
      }

      await updateVolunteerProfile(formData);

      toast.success("Profile Updated");

      setEdit(false);

      await loadProfile();
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate({ to: "/login" });
        return;
      }

      if (status === 404) {
        toast.error("Volunteer profile not found.");
        return;
      }

      if (status === 500) {
        toast.error("Server error while updating profile.");
        return;
      }

      toast.error("Update Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Volunteer Profile"
        desc="Manage your verification and availability."
      />

      <div className="grid gap-6 lg:grid-cols-[300px,1fr]">

        {/* LEFT CARD */}
        <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">

          <div className="relative mx-auto w-fit">

            <div className="grid size-24 place-items-center overflow-hidden rounded-full gradient-hero shadow-elegant">

              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || "V"}
                </span>
              )}

            </div>

            <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-primary p-2 text-white shadow-lg hover:scale-105 transition">

              <Camera size={16} />

              <input
                hidden
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />

            </label>

          </div>

          <h3 className="mt-4 font-semibold">
            {user?.name}
          </h3>

          <p className="text-xs text-muted-foreground">
            Joined{" "}
            {user?.createdAt
              ? new Date(user.createdAt).getFullYear()
              : ""}
          </p>

          {user?.isVerified ? (
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
              <CheckCircle2 className="size-3.5" />
              Verified
            </div>
          ) : (
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-600">
              <Clock className="size-3.5" />
              Pending Verification
            </div>
          )}

        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-6">

          <form
            className="rounded-2xl border bg-card p-6 shadow-sm"
            onSubmit={handleSubmit}
          >
            <h3 className="font-semibold">
              Personal Details
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2">

              <Field label="Full Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  readOnly={!edit}
                />
              </Field>

              <Field label="Phone">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  readOnly={!edit}
                />
              </Field>

              <Field label="Email">
                <Input
                  value={user?.email || ""}
                  readOnly
                />
              </Field>

            </div>

            <div className="mt-6 flex justify-end gap-2">

              {edit ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEdit(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>

                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={() => setEdit(true)}
                >
                  Edit Profile
                </Button>
              )}

            </div>

          </form>

          <div className="flex items-center justify-between rounded-2xl border bg-card p-6 shadow-sm">

            <div>
              <div className="font-semibold">
                Availability
              </div>

              <div className="text-xs text-muted-foreground">
                When on, you'll receive emergency alerts near you.
              </div>
            </div>

            <div className="flex items-center gap-3">

              <span
                className={`text-sm font-medium ${
                  available
                    ? "text-success"
                    : "text-muted-foreground"
                }`}
              >
                {available ? "Available" : "Unavailable"}
              </span>

              <Switch
                checked={available}
                onCheckedChange={setAvailable}
              />

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}