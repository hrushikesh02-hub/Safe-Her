import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Shield, ArrowRight, RotateCw, CheckCircle2, Mail, Lock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { verifyOtp, resendOtp } from "@/services/authService";

export const Route = createFileRoute("/verify-otp")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      email: typeof search.email === "string" ? search.email : "",
    };
  },
  component: VerifyOtpPage,
});

function VerifyOtpPage() {
  const { email: initialEmail } = useSearch({ from: "/verify-otp" });
  const [email, setEmail] = useState(initialEmail || "");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const nav = useNavigate();
  const { login } = useAuth();

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus first input on mount
  useEffect(() => {
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, []);

  function handleDigitChange(index: number, value: string) {
    // Handle typing a single digit
    const cleanValue = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanValue;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (cleanValue && index < 5 && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1]?.focus();
    }

    // If all 6 digits entered, auto-submit
    if (cleanValue && index === 5 && newDigits.every((d) => d !== "")) {
      submitOtp(newDigits.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setOtpDigits(newDigits);

    const focusIndex = Math.min(pastedData.length, 5);
    inputsRef.current[focusIndex]?.focus();

    if (pastedData.length === 6) {
      submitOtp(pastedData);
    }
  }

  async function submitOtp(codeToSubmit?: string) {
    const fullOtp = codeToSubmit || otpDigits.join("");
    if (!email) {
      toast.error("Email address is missing.");
      return;
    }
    if (fullOtp.length !== 6) {
      toast.error("Please enter all 6 digits of the verification code.");
      return;
    }

    setLoading(true);
    try {
      const response = await verifyOtp({
        email: email.toLowerCase().trim(),
        otp: fullOtp,
      });

      toast.success(response.message || "Email verified successfully!");

      if (response.token && response.data) {
        login(response.data, response.token);

        if (response.data.role === "admin") {
          nav({ to: "/admin/dashboard" });
        } else if (response.data.role === "volunteer") {
          nav({ to: "/volunteer/dashboard" });
        } else {
          nav({ to: "/user/dashboard" });
        }
      } else {
        nav({ to: "/login" });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    if (!email) {
      toast.error("Please provide your email address.");
      return;
    }

    setResending(true);
    try {
      const res = await resendOtp(email.toLowerCase().trim());
      toast.success(res.message || "New verification code sent!");
      setCooldown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-dvh bg-muted/30 flex flex-col justify-between">
      {/* Top Header */}
      <header className="p-6">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <Shield className="size-5" />
          </div>
          <span className="font-bold text-base text-foreground tracking-tight">SafeHer</span>
        </Link>
      </header>

      {/* Main Verification Card */}
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <div className="bg-card rounded-3xl border border-border/80 p-6 sm:p-8 shadow-xs text-center space-y-6">
          <div className="size-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Mail className="size-7" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Verify your email</h1>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              We've sent a 6-digit verification code to:
            </p>
            <p className="text-xs font-semibold text-foreground mt-0.5 font-mono">
              {email || "your email address"}
            </p>
          </div>

          {/* 6 Digit Input Boxes */}
          <div className="flex justify-center gap-2 sm:gap-2.5">
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputsRef.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                disabled={loading}
                className="size-11 sm:size-12 rounded-xl border border-border/90 bg-muted/30 text-center text-xl font-bold font-mono text-foreground focus:border-indigo-600 focus:bg-background focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {/* Action Button */}
          <Button
            onClick={() => submitOtp()}
            disabled={loading || otpDigits.some((d) => !d)}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            {loading ? "Verifying code..." : "Verify & Continue"}
          </Button>

          {/* Resend Cooldown Section */}
          <div className="pt-2 text-xs text-muted-foreground border-t border-border/60">
            <p>Didn't receive the email?</p>
            {cooldown > 0 ? (
              <p className="mt-1 font-medium text-slate-500">
                Resend available in <strong className="text-foreground">{cooldown}s</strong>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="mt-1 font-bold text-indigo-600 hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <RotateCw className={`size-3 ${resending ? "animate-spin" : ""}`} />
                Resend verification code
              </button>
            )}
          </div>

          <div className="text-[11px] text-muted-foreground pt-1">
            Wrong email address?{" "}
            <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
              Register again
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-muted-foreground">
        © SafeHer · Women's Personal Safety & Emergency Response Platform
      </footer>
    </div>
  );
}
