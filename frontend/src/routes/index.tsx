import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  MapPin,
  Users,
  Phone,
  ArrowRight,
  ChevronDown,
  Shield,
  Siren,
  Lock,
  Heart,
  CheckCircle2,
  Compass,
  Activity,
  Mic,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const Route = createFileRoute("/")({ component: LandingPage });

function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      <PublicHeader />
      <HeroSection />
      <CorePillarsSection />
      <HowItWorksSection />
      <PrivacyFirstSection />
      <VolunteerSection />
      <FaqSection />
      <CtaSection />
      <PublicFooter />
    </div>
  );
}

/* =========================================================================
   1. HERO SECTION
========================================================================= */
function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-card/80 via-background to-background py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/60 px-3.5 py-1 text-xs font-semibold text-indigo-950">
          <Shield className="size-3.5 text-indigo-600" />
          <span>Women's Personal Safety & Emergency Response</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
          Stay protected. Stay connected. <br className="hidden sm:inline" />
          Never walk alone.
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
          SafeHer provides continuous background safety protection, one-touch emergency SOS, and coordinates rapid assistance with your trusted contacts and verified nearby community volunteers.
        </p>

        {/* Primary Call to Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
          <Button asChild size="lg" className="w-full sm:w-auto h-12 px-7 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm">
            <Link to="/register">
              Join SafeHer for Free <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto h-12 px-6 font-semibold text-sm rounded-xl border-border">
            <Link to="/user/dashboard">
              Open App Dashboard
            </Link>
          </Button>
        </div>

        {/* 3 Human Trust Points */}
        <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left text-xs border-t border-border/60">
          <div className="flex items-start gap-2.5 p-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground">One-Tap Emergency SOS</strong>
              <p className="text-muted-foreground mt-0.5">Instant alerts with live coordinates.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground">Trusted Circle</strong>
              <p className="text-muted-foreground mt-0.5">Your family and friends informed first.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground">Verified Community</strong>
              <p className="text-muted-foreground mt-0.5">Local volunteers ready to assist.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   2. CORE PILLARS SECTION
========================================================================= */
function CorePillarsSection() {
  const pillars = [
    {
      icon: <ShieldCheck className="size-6 text-emerald-600" />,
      title: "Safety Shield Protection",
      description: "Passive acoustic and motion monitoring runs in the background to recognize screams, sudden decelerations, or unusual route deviations.",
    },
    {
      icon: <Siren className="size-6 text-red-600" />,
      title: "One-Touch Emergency SOS",
      description: "A single tap alerts your trusted contacts via SMS and triggers immediate coordination with nearby verified community responders.",
    },
    {
      icon: <MapPin className="size-6 text-indigo-600" />,
      title: "Verified Safe Havens",
      description: "Find verified 24/7 safe zones, women-friendly clinics, transit stations, and partner refuges nearby whenever you need immediate shelter.",
    },
    {
      icon: <Users className="size-6 text-blue-600" />,
      title: "Community Responder Network",
      description: "Background-checked community volunteers respond rapidly to provide escort and support until official emergency services arrive.",
    },
  ];

  return (
    <section className="py-16 md:py-24 border-b border-border/60 bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Complete Personal Safety, Simplified
          </h2>
          <p className="text-sm text-muted-foreground">
            Designed for ease of use when traveling, commuting, or walking alone after dark.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((p, i) => (
            <div key={i} className="bg-card p-6 rounded-2xl border border-border/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="size-11 rounded-xl bg-muted/60 flex items-center justify-center mb-4">
                  {p.icon}
                </div>
                <h3 className="font-bold text-base text-foreground mb-1.5">{p.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   3. HOW IT WORKS SECTION
========================================================================= */
function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      title: "Turn on Protection",
      desc: "Activate Safety Shield before your commute or night walk. SafeHer monitors in the background with minimal battery usage.",
    },
    {
      number: "2",
      title: "Automatic or Manual Distress",
      desc: "If high distress, fall impact, or panic is detected — or if you press SOS — an emergency alert is created immediately.",
    },
    {
      number: "3",
      title: "Coordinated Assistance",
      desc: "Trusted contacts receive live GPS coordinates while verified local responders are dispatched with estimated arrival times.",
    },
  ];

  return (
    <section className="py-16 md:py-24 border-b border-border/60">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            How SafeHer Protects You
          </h2>
          <p className="text-sm text-muted-foreground">
            Three simple steps engineered to save critical seconds during emergencies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="bg-card p-6 rounded-2xl border border-border/80 shadow-xs text-left relative">
              <div className="size-8 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center mb-4">
                {s.number}
              </div>
              <h3 className="font-bold text-base text-foreground mb-2">{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   4. PRIVACY & USER CONTROL
========================================================================= */
function PrivacyFirstSection() {
  return (
    <section className="py-16 md:py-20 border-b border-border/60 bg-muted/20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="bg-card rounded-3xl border border-border/80 p-8 sm:p-10 shadow-xs flex flex-col md:flex-row items-center gap-8">
          <div className="size-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Lock className="size-8" />
          </div>
          <div className="space-y-2 text-left flex-1">
            <h3 className="text-xl font-bold text-foreground">Your Privacy is Fully in Your Hands</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              SafeHer never shares your live GPS location during regular daily routines. Location data is only shared with your selected emergency contacts and assigned verified responders when an active emergency is triggered.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-foreground">
              <span>✓ End-to-end encrypted alerts</span>
              <span>✓ No public location broadcasts</span>
              <span>✓ One-tap pause at any time</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   5. VOLUNTEER SECTION
========================================================================= */
function VolunteerSection() {
  return (
    <section className="py-16 md:py-20 border-b border-border/60">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-4">
        <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <Heart className="size-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Become a Verified Community Responder
        </h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Join our network of verified volunteers helping women in their local neighborhood. Get notified only when emergencies occur within walking distance.
        </p>
        <div className="pt-2">
          <Button asChild size="lg" variant="outline" className="font-bold text-xs h-11 px-6 rounded-xl border-border">
            <Link to="/register">
              Sign Up as Volunteer &rarr;
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   6. FAQ SECTION
========================================================================= */
function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "Does SafeHer replace calling the police or 911/112?",
      a: "No. SafeHer is an assistive personal safety companion that alerts your family, coordinates nearby verified citizen responders, and shares GPS data. In immediate life-threatening situations, official emergency services should always be dialed directly.",
    },
    {
      q: "Will my contacts be alerted if I accidentally press SOS?",
      a: "When you tap SOS, a 3-second countdown gives you time to cancel before alerts are dispatched. If triggered accidentally, you can tap 'I am Safe' to immediately notify your contacts.",
    },
    {
      q: "How does the Safety Shield protect me?",
      a: "Safety Shield evaluates acoustic distress features (such as screams) and sudden movement anomalies (such as running or falls) in the background while you travel.",
    },
  ];

  return (
    <section className="py-16 md:py-24 border-b border-border/60 bg-muted/20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-muted-foreground">Everything you need to know about SafeHer.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/80 shadow-xs overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between text-sm font-bold text-foreground cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`size-4 text-muted-foreground transition-transform ${openIdx === i ? "rotate-180" : ""}`} />
              </button>
              {openIdx === i && (
                <div className="px-4 sm:px-5 pb-5 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   7. CTA SECTION
========================================================================= */
function CtaSection() {
  return (
    <section className="py-16 md:py-24 bg-card text-center">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Ready to feel safer wherever you go?
        </h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Create your free account, add your trusted circle, and keep safety monitoring active.
        </p>
        <div className="pt-2">
          <Button asChild size="lg" className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm">
            <Link to="/register">
              Get Started Now <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}