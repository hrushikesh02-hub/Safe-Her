import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { getUserProfile, updateUserProfile } from "@/services/userService";
import { Camera } from "lucide-react";

export const Route = createFileRoute("/user/profile")({ component: ProfilePage });

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  profileImage: string | null;
  createdAt: string;
  updatedAt: string;
}

function ProfilePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const objectUrlRef = useRef<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await getUserProfile();
      const data = res.data;

      if (!data || typeof data !== "object") {
        throw new Error("Unexpected profile response shape");
      }

      setUser(data);
      setName(data.name || "");
      setPhone(data.phone || "");
      setNotFound(false);

      // A fresh load means any pending local preview is stale.
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate({ to: "/login" });
        return;
      }

      if (status === 403) {
        toast.error("Access denied.");
        return;
      }

      if (status === 404) {
        setNotFound(true);
        return;
      }

      if (status === 500) {
        toast.error("Server error while loading profile.");
        return;
      }

      console.error("Load profile failed:", error);
      toast.error("Unable to load profile");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadProfile();

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Image must be smaller than 5 MB.");
      e.target.value = "";
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    setSelectedFile(file);
    setPreviewUrl(url);
  }

  function handleCancel() {
    setName(user?.name || "");
    setPhone(user?.phone || "");

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setSelectedFile(null);

    setEdit(false);
  }

  function validate(): string | null {
    if (!name.trim()) {
      return "Name cannot be empty.";
    }

    if (!PHONE_REGEX.test(phone.trim())) {
      return "Please enter a valid phone number.";
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
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

      await updateUserProfile(formData);

      toast.success("Profile Updated");
      setEdit(false);
      setSelectedFile(null);

      await loadProfile();
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate({ to: "/login" });
        return;
      }

      if (status === 403) {
        toast.error("Access denied.");
        return;
      }

      if (status === 500) {
        toast.error("Server error while updating profile.");
        return;
      }

      toast.error(error?.response?.data?.message || "Update Failed");
    } finally {
      setSaving(false);
    }
  }

  const displayImage = previewUrl || user?.profileImage || null;
  const completion = calculateCompletion(user);

  if (notFound) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Personal Safety Profile"
          desc="Keep this updated — it helps responders assist you faster."
        />
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Profile not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal Safety Profile"
        desc="Keep this updated — it helps responders assist you faster."
      />
      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
          {loading ? (
            <ProfileCardSkeleton />
          ) : (
            <>
              <div className="relative mx-auto w-fit">
                <div className="grid size-24 place-items-center overflow-hidden rounded-full gradient-hero shadow-elegant">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={`${user?.name || "User"} profile photo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  )}
                </div>

                <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-primary p-2 text-white shadow-lg hover:scale-105 transition">
                  <Camera size={16} />
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              <h3 className="mt-4 font-semibold">{user?.name}</h3>
              <p className="text-xs text-muted-foreground">
                Protected since{" "}
                {user?.createdAt ? new Date(user.createdAt).getFullYear() : ""}
              </p>
              <div className="mt-4 rounded-xl bg-success/10 px-3 py-2 text-xs font-medium text-success">
                Profile {completion}% complete
              </div>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-6 shadow-sm">
          {loading ? (
            <FormSkeleton />
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Full name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} readOnly={!edit} />
                </Field>
                <Field label="Phone">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} readOnly={!edit} />
                </Field>
                <Field label="Email">
                  <Input value={user?.email || ""} readOnly />
                </Field>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                {edit ? (
                  <>
                    <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
                      Cancel
                    </Button>
                    <Button type="submit" className="gradient-hero text-white" disabled={saving}>
                      {saving ? "Saving..." : "Save changes"}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setEdit(true)}
                    className="gradient-hero text-white"
                    disabled={loading}
                  >
                    Edit profile
                  </Button>
                )}
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

function calculateCompletion(user: User | null): number {
  if (!user) return 0;

  const fields = [user.name, user.phone, user.email, user.profileImage];
  const completed = fields.filter((f) => Boolean(f && f.trim?.() !== "")).length;

  return Math.round((completed / fields.length) * 100);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ProfileCardSkeleton() {
  return (
    <div className="flex flex-col items-center">
      <div className="size-24 animate-pulse rounded-full bg-muted" />
      <div className="mt-4 h-4 w-28 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-6 w-32 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}