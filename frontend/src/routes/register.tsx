import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Shield, ArrowRight, User, Heart, Lock, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { register as registerService } from "@/services/authService";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const [role, setRole] = useState<"user" | "volunteer">("user");
  const [form, setForm] = useState({ name: "", email: "", phone: "", pw: "", confirm: "" });
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      return toast.error("Please enter your full name.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      return toast.error("Please enter a valid email address.");
    }

    if (!/^[0-9+\s-]{8,15}$/.test(form.phone)) {
      return toast.error("Please enter a valid mobile number.");
    }

    if (form.pw.length < 8) {
      return toast.error("Password must be at least 8 characters.");
    }

    if (form.pw !== form.confirm) {
      return toast.error("Passwords do not match.");
    }

    setLoading(true);
    try {
      const response = await registerService({
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        phone: form.phone.trim(),
        password: form.pw,
        role,
      });

      toast.success(response.message || "Account created! Please check your email for the verification code.");

      // Navigate to OTP verification page
      nav({
        to: "/verify-otp",
        search: { email: form.email.toLowerCase().trim() },
      });
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.requireOtpVerification) {
        toast.info("Account pending verification. Redirecting to enter code...");
        nav({
          to: "/verify-otp",
          search: { email: data.email || form.email },
        });
        return;
      }
      toast.error(data?.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-muted/30 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
          <div className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <Shield className="size-5" />
          </div>
          <span className="font-bold text-base text-foreground tracking-tight">SafeHer</span>
        </Link>

        <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-10 shadow-xs">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Create your SafeHer account</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Join our trusted personal safety community in less than a minute.
            </p>
          </div>

          {/* Account Role Selector */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setRole("user")}
              className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                role === "user"
                  ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-200"
                  : "border-border/80 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <User className="size-4 text-indigo-600" />
                I Need Protection (Protected Member)
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Access 24/7 background Safety Shield, instant SOS, trusted contacts alerts, and nearby safe havens.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setRole("volunteer")}
              className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                role === "volunteer"
                  ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-200"
                  : "border-border/80 hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Heart className="size-4 text-emerald-600" />
                I Want to Help (Community Responder)
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Receive localized emergency alerts to provide rapid escort and assistance to women in distress.
              </p>
            </button>
          </div>

          {/* Registration Form */}
          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium">Full Name</Label>
              <Input
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. Mansi Sharma"
                required
                className="text-xs h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email Address (for real OTP verification)</Label>
              <Input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="name@example.com"
                required
                className="text-xs h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mobile Phone Number</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="+91 98765 43210"
                required
                className="text-xs h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Password (min 8 chars)</Label>
              <Input
                type="password"
                value={form.pw}
                onChange={set("pw")}
                placeholder="••••••••"
                required
                className="text-xs h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Confirm Password</Label>
              <Input
                type="password"
                value={form.confirm}
                onChange={set("confirm")}
                placeholder="••••••••"
                required
                className="text-xs h-10"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                {loading ? "Creating Account & Sending OTP..." : `Register as ${role === "volunteer" ? "Volunteer" : "Protected Member"}`}
              </Button>

              <p className="mt-3 text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-bold text-indigo-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}