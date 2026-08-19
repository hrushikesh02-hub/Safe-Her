import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  MapPin,
  Users,
  Phone,
  Building2,
  ClipboardList,
  Zap,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Mic,
  Activity,
  Navigation,
  Lock,
  EyeOff,
  Video,
  FileText,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Compass,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const Route = createFileRoute("/")({ component: LandingPage });

function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <PublicHeader />
      <HeroSection />
      <FourLayersSection />
      <AiSystemSection />
      <SafetyShieldShowcase />
      <EmergencyFlowSection />
      <FeaturesGridSection />
      <TrustAndPrivacySection />
      <FaqSection />
      <EmergencyDisclaimerSection />
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
    <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-background via-muted/20 to-background py-16 md:py-24">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-10 size-72 rounded-full bg-rose-500/10 blur-[100px] pointer-events-none -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8 items-center">
          {/* Left Column: Hero Text */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary backdrop-blur">
              <Sparkles className="size-3.5" />
              <span>AI-ASSISTED WOMEN'S PERSONAL SAFETY</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-foreground">
              Stay aware. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-600 to-rose-600">
                Stay connected.
              </span>{" "}
              <br />
              Stay safer.
            </h1>

            <p className="max-w-xl mx-auto lg:mx-0 text-base sm:text-lg text-muted-foreground leading-relaxed">
              SafeHer combines multi-sensor AI safety monitoring, location awareness, and coordinated emergency dispatch to support you during critical moments when every second matters.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
              <Button asChild size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 h-12 px-7 rounded-2xl">
                <Link to="/register">
                  Get Started Free <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto font-semibold border-border hover:bg-muted h-12 px-6 rounded-2xl">
                <Link to="/user/ai-fusion">
                  Explore Safety Shield
                </Link>
              </Button>
            </div>

            {/* Reassuring Pillars */}
            <div className="pt-6 border-t border-border/60 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-left">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Voice AI</div>
                <div className="text-sm font-semibold text-foreground mt-0.5">Distress Keyword Guard</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Motion AI</div>
                <div className="text-sm font-semibold text-foreground mt-0.5">Fall & Impact Sensing</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dispatch</div>
                <div className="text-sm font-semibold text-foreground mt-0.5">Contacts & Responders</div>
              </div>
            </div>
          </div>

          {/* Right Column: Safety Shield Visual Mockup */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-sm rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl p-6 shadow-2xl space-y-5">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl bg-primary/10 grid place-items-center text-primary">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-primary">SafeHer AI</div>
                    <div className="text-sm font-bold text-foreground">Safety Shield Overview</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> ACTIVE
                </span>
              </div>

              {/* Central Risk Dial Concept */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-4 text-center space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                  Multi-Modal Risk Index
                </div>
                <div className="text-3xl font-black text-foreground">15 / 100</div>
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  🟢 Normal & Safe Baseline
                </div>
              </div>

              {/* Sensor Channel Indicators */}
              <div className="space-y-2.5 text-xs font-medium">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 border border-border/40">
                  <span className="flex items-center gap-2 text-foreground">
                    <Mic className="size-4 text-primary" /> Voice Distress AI
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Listening</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 border border-border/40">
                  <span className="flex items-center gap-2 text-foreground">
                    <Activity className="size-4 text-purple-500" /> Movement Anomaly AI
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Calibrated</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 border border-border/40">
                  <span className="flex items-center gap-2 text-foreground">
                    <Navigation className="size-4 text-blue-500" /> GPS Context Engine
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Tracking</span>
                </div>
              </div>

              {/* Emergency SOS Preview */}
              <div className="pt-2">
                <div className="w-full py-3 rounded-2xl bg-rose-600/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2">
                  <Zap className="size-4" /> 1-Tap Emergency Trigger Ready
                </div>
              </div>

              <div className="text-[10px] text-center text-muted-foreground">
                *Visual representation of SafeHer's multi-sensor protection interface
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   2. FOUR LAYERS OF SAFETY
========================================================================= */
function FourLayersSection() {
  const layers = [
    {
      num: "01",
      title: "DETECT",
      subtitle: "Continuous Sensor Telemetry",
      desc: "Voice AI processes spoken emergency keywords and loud acoustic screams, while device motion sensors detect sudden impact or rapid struggle.",
      color: "from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
    },
    {
      num: "02",
      title: "UNDERSTAND",
      subtitle: "Multi-Modal Risk Fusion",
      desc: "SafeHer synthesizes acoustic cues, accelerometer telemetry, and spatial GPS context into a unified real-time risk score.",
      color: "from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
    },
    {
      num: "03",
      title: "ALERT",
      subtitle: "Multi-Channel Emergency SOS",
      desc: "1-tap manual SOS or automatic distress triggers notify designated emergency contacts with precise live location via Brevo email alerts.",
      color: "from-rose-500/10 to-amber-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
    },
    {
      num: "04",
      title: "RESPOND",
      subtitle: "Coordinated Community Dispatch",
      desc: "SafeHer matches and alerts eligible nearby registered volunteers, providing live routing and command center incident tracking.",
      color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <section id="how" className="py-20 border-b border-border/40 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-primary">Architecture</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Built Around Four Layers of Safety
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            A comprehensive, technology-driven framework designed to reduce response latency when you need help.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {layers.map((layer) => (
            <div
              key={layer.num}
              className={`rounded-3xl border p-6 bg-gradient-to-br ${layer.color} backdrop-blur space-y-4 flex flex-col justify-between`}
            >
              <div>
                <div className="text-2xl font-black opacity-40">{layer.num}</div>
                <h3 className="text-lg font-bold text-foreground mt-2">{layer.title}</h3>
                <div className="text-xs font-semibold opacity-80">{layer.subtitle}</div>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  {layer.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   3. AI SYSTEM ARCHITECTURE
========================================================================= */
function AiSystemSection() {
  const modules = [
    {
      icon: Mic,
      title: "Voice AI & Keyword Detection",
      badge: "Phase 1 Intelligence",
      desc: "Analyzes audio for recognized distress words (such as 'HELP ME', 'SAVE ME', 'EMERGENCY', 'BACHAO') and sudden high-intensity acoustic scream spikes.",
    },
    {
      icon: Activity,
      title: "Movement & Anomaly AI",
      badge: "Phase 2 Intelligence",
      desc: "Captures 3-axis accelerometer motion patterns to detect possible physical struggles, sudden falls, running, or abrupt stops.",
    },
    {
      icon: Navigation,
      title: "Location Intelligence",
      badge: "Context Awareness",
      desc: "Evaluates real GPS coordinates, route consistency, and ambient environmental context to supply accurate data to responders.",
    },
    {
      icon: Sparkles,
      title: "Multi-Modal Risk Fusion",
      badge: "Unified Risk Engine",
      desc: "Combines voice, movement, and location signals through a mathematical fusion model to calculate dynamic risk levels (LOW, MEDIUM, HIGH, CRITICAL).",
    },
    {
      icon: Compass,
      title: "Predictive Safety Analytics",
      badge: "Phase 3 Early Warning",
      desc: "Identifies changing safety patterns based on time-of-day, proximity to verified safe zones, and movement telemetry.",
    },
    {
      icon: Users,
      title: "Smart Responder Matching",
      badge: "Phase 4 Dispatch",
      desc: "Calculates proximity, availability, and response metrics to notify top-ranked volunteers and initiate the emergency resolution timeline.",
    },
  ];

  return (
    <section id="ai-system" className="py-20 border-b border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-primary">Intelligence</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            One Safety System. Multiple Signals.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            SafeHer connects multiple AI capabilities into a cohesive platform that works transparently to support your peace of mind.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.title}
                className="rounded-3xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="size-11 rounded-2xl bg-primary/10 grid place-items-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    {m.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground pt-1">{m.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   4. SAFETY SHIELD SHOWCASE
========================================================================= */
function SafetyShieldShowcase() {
  return (
    <section id="safety-shield" className="py-20 border-b border-border/40 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-card p-8 md:p-12 shadow-xl">
          <div className="grid gap-8 lg:grid-cols-12 items-center">
            {/* Left: Info */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                <ShieldCheck className="size-4" /> Safety Shield Command
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Continuous AI Protection in a Single Clean Interface
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Safety Shield unifies SafeHer's voice monitoring, movement tracking, and emergency readiness into one simple, non-intrusive dashboard. Turn it on with one tap whenever you're traveling, commuting, or walking alone.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <CheckCircle2 className="size-4 text-emerald-500" /> Live Risk Index Scoring
                </div>
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <CheckCircle2 className="size-4 text-emerald-500" /> Acoustic Scream Detection
                </div>
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <CheckCircle2 className="size-4 text-emerald-500" /> Spoken Keyword Watch
                </div>
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <CheckCircle2 className="size-4 text-emerald-500" /> Non-Literate Friendly UX
                </div>
              </div>

              <div className="pt-3">
                <Button asChild size="lg" className="bg-primary text-primary-foreground font-bold rounded-2xl h-12 px-6 shadow">
                  <Link to="/user/ai-fusion">
                    Open Safety Shield <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right: UI Snapshot Preview */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-2xl space-y-4 text-center">
                <div className="size-16 rounded-full bg-white/20 grid place-items-center mx-auto">
                  <ShieldCheck className="size-10 text-emerald-100" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
                    PROTECTED STATUS
                  </span>
                  <h3 className="text-xl font-black mt-2">Safety Shield is Active</h3>
                  <p className="text-xs text-emerald-100 mt-1">
                    Multi-sensor background intelligence is continuously active.
                  </p>
                </div>

                <div className="rounded-2xl bg-black/20 p-4 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                    Calculated Risk Index
                  </div>
                  <div className="text-2xl font-black">15 / 100</div>
                  <div className="text-[11px] font-medium text-emerald-200">LOW RISK (SAFE)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   5. EMERGENCY FLOW VISUALIZATION
========================================================================= */
function EmergencyFlowSection() {
  const steps = [
    {
      title: "1. Distress Triggered",
      desc: "Either via 1-tap manual SOS or automatically when Voice AI detects distress keywords/screams.",
    },
    {
      title: "2. Emergency Incident Created",
      desc: "MongoDB creates an encrypted incident record with user coordinates, distress classification, and priority.",
    },
    {
      title: "3. Contacts Notified",
      desc: "Designated emergency contacts immediately receive an alert email containing the live GPS tracking link.",
    },
    {
      title: "4. Volunteers Coordinated",
      desc: "Top-ranked eligible community responders receive incident requests with distance and navigation details.",
    },
    {
      title: "5. Resolution & Safety Check",
      desc: "Responders assist on scene; incident timeline is recorded and marked resolved in the command center.",
    },
  ];

  return (
    <section className="py-20 border-b border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-primary">Emergency Lifecycle</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            From Distress Signal to Resolution
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Here is the exact step-by-step pipeline SafeHer initiates when an emergency occurs.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, idx) => (
            <div
              key={step.title}
              className="rounded-2xl border border-border bg-card p-5 space-y-3 flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="size-7 rounded-lg bg-primary/10 text-primary font-black text-xs grid place-items-center">
                  {idx + 1}
                </div>
                <h3 className="text-sm font-bold text-foreground mt-3">{step.title}</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   6. VERIFIED FEATURES GRID
========================================================================= */
function FeaturesGridSection() {
  const featureList = [
    {
      icon: Zap,
      title: "One-Tap Panic SOS",
      desc: "Optimized for extreme stress. A single prominent button triggers emergency countdown and dispatch.",
    },
    {
      icon: Mic,
      title: "Automatic Voice Distress Detection",
      desc: "Listens for emergency keywords and acoustic spikes to initiate automatic SOS when hands are unavailable.",
    },
    {
      icon: Phone,
      title: "Emergency Contacts Network",
      desc: "Configured family members and trusted friends receive automated dispatch alerts with exact location details.",
    },
    {
      icon: Users,
      title: "Volunteer Coordination",
      desc: "Matches nearby registered volunteers using proximity scoring and tracks their estimated arrival time.",
    },
    {
      icon: Video,
      title: "Emergency Evidence Capture",
      desc: "Automatically records camera video and audio clips upon SOS activation, saving evidence to the incident log.",
    },
    {
      icon: Building2,
      title: "Safe Zones Directory",
      desc: "Access a verified directory of nearby police stations, hospitals, and designated women's safety centers.",
    },
    {
      icon: Compass,
      title: "Predictive Safety (Phase 3)",
      desc: "Analyzes route, time-of-day, and ambient factors to supply situational risk awareness.",
    },
    {
      icon: FileText,
      title: "Incident Reports & Analytics",
      desc: "Complete audit logs and downloadable incident summary reports for administrative and personal review.",
    },
  ];

  return (
    <section id="features" className="py-20 border-b border-border/40 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-primary">Capabilities</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Designed for Real-World Women's Safety
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Every feature in SafeHer is built directly on implemented backend services and AI models.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featureList.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-3xl border border-border bg-card p-6 space-y-3 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="size-11 rounded-2xl bg-primary/10 text-primary grid place-items-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   7. TRUST & PRIVACY SECTION
========================================================================= */
function TrustAndPrivacySection() {
  const trustPoints = [
    {
      icon: Lock,
      title: "Authenticated User Accounts",
      desc: "Secure bcrypt password hashing and token-based authentication protect user credentials and personal safety data.",
    },
    {
      icon: EyeOff,
      title: "Role-Based Data Isolation",
      desc: "Strict architectural separation between Users, Volunteers, and Admins ensures users only see their own profile and active alerts.",
    },
    {
      icon: MapPin,
      title: "Controlled Location Transmission",
      desc: "GPS coordinates are accessed and transmitted solely when you enable monitoring or trigger an emergency SOS.",
    },
    {
      icon: Video,
      title: "Protected Evidence Records",
      desc: "Emergency video and audio evidence are stored securely on Cloudinary and accessible exclusively for incident review.",
    },
  ];

  return (
    <section id="privacy" className="py-20 border-b border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-primary">Trust & Privacy</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Designed With Privacy and Security First
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Personal safety requires uncompromising data integrity. We prioritize user consent and transparent data handling.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map((pt) => {
            const Icon = pt.icon;
            return (
              <div
                key={pt.title}
                className="rounded-3xl border border-border bg-card p-6 space-y-3 shadow-sm"
              >
                <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{pt.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{pt.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   8. FREQUENTLY ASKED QUESTIONS (TRUTHFUL)
========================================================================= */
function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "What does SafeHer actually monitor when Safety Shield is active?",
      a: "When you turn on Safety Shield, the app uses your microphone stream to detect spoken emergency keywords (like 'HELP ME' or 'SAVE ME') and acoustic scream spikes, alongside your device's accelerometer for sudden movement or fall patterns, and GPS coordinates for location context.",
    },
    {
      q: "How does the Automatic SOS trigger work?",
      a: "If the Voice AI detects a clear distress phrase or scream, or if the Multi-Modal Fusion score reaches the Critical threshold, the system immediately presents a short cancellation countdown. If not canceled, it automatically dispatches emergency alerts to your contacts and nearby volunteers.",
    },
    {
      q: "Who receives my emergency alerts?",
      a: "When an SOS is activated, automated alert emails are sent to your designated emergency contacts with your live GPS location. Simultaneously, the incident is broadcast to eligible nearby registered SafeHer volunteers and the Admin Command Center.",
    },
    {
      q: "Can I turn off monitoring whenever I want?",
      a: "Yes. You have total control. You can start and stop Safety Shield monitoring with a single button at any moment. When monitoring is stopped, all microphone and accelerometer sensor listeners are completely deactivated.",
    },
    {
      q: "Is SafeHer a replacement for police or government emergency services?",
      a: "No. SafeHer is an assistive personal safety and community response tool designed to provide rapid coordination and evidence capture. In an immediate life-threatening situation, you should also contact official local emergency services (dial 112, 100, or 1091).",
    },
  ];

  return (
    <section id="faq" className="py-20 border-b border-border/40 bg-muted/20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-primary">Clarity</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-muted-foreground">
            Straightforward answers about how SafeHer works.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-border bg-card overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-5 text-left font-semibold text-sm text-foreground hover:text-primary transition-colors"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`size-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-4 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   9. EMERGENCY SERVICES DISCLAIMER
========================================================================= */
function EmergencyDisclaimerSection() {
  return (
    <section id="emergency-disclaimer" className="py-10 bg-background border-b border-border/40">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-xs text-muted-foreground leading-relaxed space-y-1">
          <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1.5 uppercase tracking-wider">
            <AlertTriangle className="size-4" /> Important Safety Notice
          </div>
          <p>
            SafeHer is an AI-assisted safety and emergency coordination platform. AI predictions and automated sensor detections are supportive tools and may occasionally be influenced by environmental factors. In an immediate life-threatening crisis, please also contact official local emergency services directly (Police: 112 / 100, Women Helpline: 1091).
          </p>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   10. CTA SECTION
========================================================================= */
function CtaSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-primary/5 text-center">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-6">
        <div className="size-16 rounded-3xl bg-primary/10 text-primary grid place-items-center mx-auto">
          <ShieldCheck className="size-8" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Ready to Take Control of Your Personal Safety?
        </h2>
        <p className="max-w-xl mx-auto text-sm sm:text-base text-muted-foreground">
          Create your free SafeHer safety profile in less than a minute, set up your trusted emergency contacts, and activate multi-sensor AI protection.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Button asChild size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground font-bold shadow-lg hover:bg-primary/90 h-12 px-8 rounded-2xl">
            <Link to="/register">
              Create Safety Profile <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto font-semibold rounded-2xl h-12 px-6">
            <Link to="/login">
              Sign In to Account
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}