import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Shield, Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { login } = useAuth();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@") || pw.length < 8) {
      toast.error("Please enter a valid email and password (minimum 8 characters).");
      return;
    }

    setLoading(true);
    try {
      const response = await loginService({
        email: email.toLowerCase().trim(),
        password: pw,
      });

      login(response.data, response.token);
      toast.success(response.message || "Signed in successfully!");

      if (response.data.role === "admin") {
        nav({ to: "/admin/dashboard" });
      } else if (response.data.role === "volunteer") {
        nav({ to: "/volunteer/dashboard" });
      } else {
        nav({ to: "/user/dashboard" });
      }
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.requireEmailVerification) {
        toast.info("Please verify your email address to continue.");
        nav({
          to: "/verify-otp",
          search: { email: data.email || email },
        });
        return;
      }

      toast.error(data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-12 bg-background">
      {/* Left Column: Reassuring SafeHer Hero Showcase */}
      <div className="relative hidden lg:flex lg:col-span-5 bg-slate-900 text-white p-10 xl:p-12 flex-col justify-between overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 size-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 size-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <Link to="/" className="relative flex items-center gap-2.5 z-10">
          <div className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Shield className="size-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">SafeHer</span>
        </Link>

        <div className="relative z-10 space-y-4">
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur">
            Personal Safety & Emergency Response
          </div>
          <h2 className="text-3xl xl:text-4xl font-extrabold leading-tight text-white tracking-tight">
            Welcome back.<br />Your safety, in your hands.
          </h2>
          <p className="text-sm text-slate-300 max-w-sm leading-relaxed">
            Sign in to access background Safety Shield protection, live location tracking, and coordinated community assistance.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-400">
          © SafeHer · Women's Personal Safety Network
        </div>
      </div>

      {/* Right Column: Sign In Form */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-5">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white">
              <Shield className="size-4.5" />
            </div>
            <span className="text-base font-bold text-foreground">SafeHer</span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Sign in to SafeHer</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Enter your credentials to access your safety portal</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 text-xs h-10"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="pw" className="text-xs font-medium">Password</Label>
              <button type="button" onClick={() => toast.info("Please contact SafeHer admin to reset password.")} className="text-[11px] font-semibold text-indigo-600 hover:underline">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pw"
                type={show ? "text" : "password"}
                required
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="pl-9 pr-10 text-xs h-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-1">
            Don't have an account?{" "}
            <Link to="/register" className="font-bold text-indigo-600 hover:underline">
              Create an account
            </Link>
          </p>

          <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5 text-xs text-muted-foreground text-center">
            Need emergency help immediately without signing in?{" "}
            <Link to="/user/sos" className="font-bold text-red-600 hover:underline block mt-0.5">
              Open Emergency SOS &rarr;
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}