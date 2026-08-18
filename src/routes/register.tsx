import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Shield } from "lucide-react";
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
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    
if (!form.name.trim()) {
  return toast.error("Name is required.");
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailRegex.test(form.email)) {
  return toast.error("Enter a valid email address.");
}

if (!/^[6-9]\d{9}$/.test(form.phone)) {
  return toast.error("Enter a valid 10-digit mobile number.");
}
    if (form.pw.length < 8) return toast.error("Password must be at least 8 chars.");
    if (form.pw !== form.confirm) return toast.error("Passwords don't match.");
    setLoading(true);
    try {
  const response = await registerService({
    name: form.name,
    email: form.email,
    phone: form.phone,
    password: form.pw,
    role,
  });

  toast.success(response.message);

  nav({
    to: "/login",
  });
} catch (error: any) {
  toast.error(
    error.response?.data?.message || "Registration failed"
  );
}finally {
  setLoading(false);
}
  }

  return (
    <div className="min-h-dvh bg-muted/40">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl gradient-hero text-white"><Shield className="size-5" /></div>
          <span className="font-bold">SafeHer</span>
        </Link>
        <div className="mt-8 rounded-3xl border bg-card p-8 shadow-elegant">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Join the safest community for women — it takes less than a minute.</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {(["user", "volunteer"] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`rounded-2xl border p-4 text-left transition ${role === r ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "hover:border-primary/40"}`}>
                <div className="text-sm font-semibold capitalize">{r === "user" ? "I need protection" : "I want to help as volunteer"}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {r === "user" ? "Access SOS, live tracking and trusted contacts." : "Respond to nearby emergency alerts in your city."}
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Full Name"><Input value={form.name} onChange={set("name")} required /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} required /></Field>
            <Field label="Phone Number"><Input type="tel" value={form.phone} onChange={set("phone")} required /></Field>
            <Field label="Role"><Input value={role} readOnly className="capitalize" /></Field>
            <Field label="Password"><Input type="password" value={form.pw} onChange={set("pw")} required /></Field>
            <Field label="Confirm Password"><Input type="password" value={form.confirm} onChange={set("confirm")} required /></Field>
            <div className="sm:col-span-2">
              <Button
  type="submit"
  disabled={loading}
  className="w-full gradient-hero text-white shadow-elegant"
>
  {loading ? "Creating Account..." : "Create account"}
</Button>
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}