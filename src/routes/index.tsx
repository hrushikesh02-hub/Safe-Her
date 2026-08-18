import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck, MapPin, Users, Phone, Building2, ClipboardList,
  Zap, ArrowRight, Star, ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { stats } from "@/lib/mockData";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-dvh">
      <PublicHeader />
      <Hero />
      <Features />
      <HowItWorks />
      <Stats />
      <Testimonials />
      <FAQ />
      <PublicFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 gradient-hero opacity-95" />
      <div className="absolute -right-32 top-20 -z-10 size-96 rounded-full bg-white/10 blur-3xl float-slow" />
      <div className="absolute -left-20 bottom-0 -z-10 size-72 rounded-full bg-emergency/30 blur-3xl" />
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 text-white md:grid-cols-2 md:py-28">
        <div className="fade-in-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <ShieldCheck className="size-3.5" /> Government-backed safety platform
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Help is one tap away — anytime, anywhere.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">
            SafeHer connects you instantly to verified volunteers, support teams, and authorities during unsafe situations — with live location, alert tracking, and minimal taps under stress.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-emergency text-white hover:bg-emergency/90 shadow-elegant">
              <Link to="/register">Get Protected Free <ArrowRight className="ml-1 size-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
              <Link to="/user/sos">Try Emergency Demo</Link>
            </Button>
          </div>
          <div className="mt-10 flex items-center gap-6 text-sm text-white/80">
            <div><span className="text-2xl font-bold text-white">48K+</span><div>Protected users</div></div>
            <div className="h-10 w-px bg-white/20" />
            <div><span className="text-2xl font-bold text-white">98.6%</span><div>Response success</div></div>
            <div className="h-10 w-px bg-white/20" />
            <div><span className="text-2xl font-bold text-white">3.2K</span><div>Active volunteers</div></div>
          </div>
        </div>
        <div className="relative">
          <div className="float-slow relative mx-auto w-fit">
            <div className="absolute inset-0 m-auto size-72 rounded-full bg-emergency/30 blur-2xl" />
            <div className="relative grid size-72 place-items-center rounded-full bg-emergency text-white shadow-emergency sos-pulse">
              <div className="text-center">
                <Zap className="mx-auto size-14" />
                <div className="mt-2 text-3xl font-bold">SOS</div>
                <div className="text-xs uppercase tracking-widest opacity-90">Tap for help</div>
              </div>
            </div>
          </div>
          <div className="absolute -left-2 top-10 hidden rounded-2xl border bg-card p-3 text-foreground shadow-elegant md:flex md:items-center md:gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-success/15 text-success"><ShieldCheck className="size-5" /></div>
            <div><div className="text-sm font-semibold">Volunteer accepted</div><div className="text-xs text-muted-foreground">ETA 4 min · 0.4 km</div></div>
          </div>
          <div className="absolute -right-4 bottom-6 hidden rounded-2xl border bg-card p-3 text-foreground shadow-elegant md:block">
            <div className="text-xs text-muted-foreground">Live location</div>
            <div className="text-sm font-semibold">12.9716° N, 77.5946° E</div>
          </div>
        </div>
      </div>
    </section>
  );
}

const features = [
  { icon: Zap, title: "One-tap SOS", desc: "A panic-friendly button optimized for stress — minimum taps to send help." },
  { icon: MapPin, title: "Live location sharing", desc: "Real-time GPS shared with responders and trusted contacts." },
  { icon: Phone, title: "Trusted contacts", desc: "Auto-notify family and close friends when an alert is triggered." },
  { icon: Users, title: "Volunteer network", desc: "Verified women volunteers nearby, ready to respond in minutes." },
  { icon: Building2, title: "Safe zones nearby", desc: "Hospitals, police stations and help centers around you." },
  { icon: ClipboardList, title: "Incident tracking", desc: "Every alert is logged, tracked, and resolved transparently." },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24">
      <div className="text-center">
        <h2 className="text-3xl font-bold md:text-4xl">Designed for the moments that matter</h2>
        <p className="mt-3 text-muted-foreground">Every feature is built around speed, trust, and resolution.</p>
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="group rounded-2xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-elegant">
            <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <Icon className="size-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const steps = [
  "Register in seconds",
  "Complete safety profile",
  "Add trusted contacts",
  "Press SOS when in danger",
  "Volunteers respond fast",
  "Incident tracked & resolved",
];

function HowItWorks() {
  return (
    <section id="how" className="bg-muted/40 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">How SafeHer works</h2>
          <p className="mt-3 text-muted-foreground">Six simple steps from setup to safety.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s} className="relative rounded-2xl border bg-card p-6 shadow-sm">
              <div className="absolute -top-4 left-6 grid size-9 place-items-center rounded-xl gradient-hero text-sm font-bold text-white shadow-elegant">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-4 font-semibold">{s}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Step {i + 1} of {steps.length}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const items = [
    { label: "Registered Users", value: stats.registeredUsers.toLocaleString() + "+" },
    { label: "Emergency Alerts Handled", value: stats.emergencyAlerts.toLocaleString() + "+" },
    { label: "Active Volunteers", value: stats.activeVolunteers.toLocaleString() + "+" },
    { label: "Response Success Rate", value: stats.successRate + "%" },
  ];
  return (
    <section id="stats" className="mx-auto max-w-7xl px-6 py-20">
      <div className="rounded-3xl gradient-hero p-10 text-white shadow-elegant">
        <div className="grid gap-8 md:grid-cols-4">
          {items.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl font-bold tracking-tight md:text-5xl">{s.value}</div>
              <div className="mt-2 text-sm text-white/80">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const testimonials = [
  { name: "Aanya R.", role: "Student, Bengaluru", quote: "I felt safer walking home knowing one tap could bring help in minutes." },
  { name: "Meera K.", role: "Volunteer", quote: "The platform is fast, organized, and lets us truly help women in need." },
  { name: "Priya S.", role: "Software engineer", quote: "Beautiful UI, but it's the speed under stress that made me a believer." },
];

function Testimonials() {
  return (
    <section className="bg-muted/40 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-3xl font-bold md:text-4xl">Trusted by women across the country</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex gap-1 text-warning">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}</div>
              <blockquote className="mt-3 text-sm leading-relaxed">"{t.quote}"</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-primary/10 font-bold text-primary">{t.name[0]}</div>
                <div><div className="text-sm font-semibold">{t.name}</div><div className="text-xs text-muted-foreground">{t.role}</div></div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqs = [
  { q: "Is SafeHer free to use?", a: "Yes — core SOS features and volunteer responses are completely free for users." },
  { q: "Are volunteers verified?", a: "Every volunteer goes through ID verification, background checks, and platform training." },
  { q: "Does it work without internet?", a: "SOS triggers a fallback SMS to trusted contacts when network is unstable." },
  { q: "Who can see my location?", a: "Only responders assigned to your alert and the contacts you've explicitly added." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
      <h2 className="text-center text-3xl font-bold md:text-4xl">Frequently asked questions</h2>
      <div className="mt-10 space-y-3">
        {faqs.map((f, i) => (
          <div key={f.q} className="rounded-2xl border bg-card">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between p-5 text-left font-medium"
            >
              {f.q}
              <ChevronDown className={`size-5 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && <div className="px-5 pb-5 text-sm text-muted-foreground">{f.a}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}