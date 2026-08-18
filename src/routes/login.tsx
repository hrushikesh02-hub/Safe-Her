import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Shield, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { login as loginService } from "@/services/authService";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const nav = useNavigate();
  const { login } = useAuth();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("SIGN IN BUTTON CLICKED");
    if (!email.includes("@") || pw.length < 8) {
      toast.error("Enter a valid email and password (min 8 chars).");
      return;
    }
    try {
  const response = await loginService({
    email,
    password: pw,
  });

  login(response.data, response.token);

  toast.success(response.message);

  if (response.data.role === "admin") {
    nav({ to: "/admin/dashboard" });
  } else if (response.data.role === "volunteer") {
    nav({ to: "/volunteer/dashboard" });
  } else {
    nav({ to: "/user/dashboard" });
  }
} catch (error: any) {
  console.log(error);
  console.log(error.response);
  console.log(error.response?.data);

  toast.error(
    error.response?.data?.message || "Login failed"
  );
}
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden gradient-hero p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-10 place-items-center rounded-xl bg-white/15"><Shield className="size-5" /></div>
          <span className="text-lg font-bold">SafeHer</span>
        </Link>
        <div>
          <h2 className="text-4xl font-bold leading-tight">Welcome back.<br/>Your safety, in your hands.</h2>
          <p className="mt-4 max-w-md text-white/80">Sign in to access SOS, live tracking, and your trusted volunteer network.</p>
        </div>
        <div className="text-xs text-white/60">© SafeHer · Government-backed safety platform</div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Sign in to SafeHer</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter your credentials to continue</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="you@example.com" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pw">Password</Label>
              <button type="button" className="text-xs font-medium text-primary hover:underline">Forgot password?</button>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="pw" type={show ? "text" : "password"} required value={pw} onChange={(e) => setPw(e.target.value)} className="pl-9 pr-10" placeholder="••••••••" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Toggle password visibility">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="rm" />
            <Label htmlFor="rm" className="text-sm font-normal">Remember me on this device</Label>
          </div>
          <Button type="submit" className="w-full gradient-hero text-white shadow-elegant">Sign in</Button>
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account? <Link to="/register" className="font-semibold text-primary hover:underline">Create one</Link>
          </p>
          <div className="rounded-xl border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
            Demo portals: <Link to="/user/dashboard" className="text-primary underline">User</Link> · <Link to="/volunteer/dashboard" className="text-primary underline">Volunteer</Link> · <Link to="/admin/dashboard" className="text-primary underline">Admin</Link>
          </div>
        </form>
      </div>
    </div>
  );
}