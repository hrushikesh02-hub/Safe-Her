import { Link } from "@tanstack/react-router";
import { Shield, Sparkles, Heart } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t bg-card text-card-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        {/* Brand Col */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-white">
              <Shield className="size-5" />
            </div>
            <span className="text-lg font-black tracking-tight">SafeHer</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            An AI-assisted safety and emergency coordination platform designed to empower women with multi-modal risk intelligence, rapid SOS triggers, and coordinated community response.
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Built for safety with</span>
            <Heart className="size-3 text-rose-500 fill-rose-500 inline" />
          </div>
        </div>

        {/* Platform Links */}
        <div>
          <h4 className="text-sm font-bold tracking-tight text-foreground uppercase text-xs">Platform</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/register" className="hover:text-foreground transition-colors">Create Safety Profile</Link></li>
            <li><Link to="/user/ai-fusion" className="hover:text-foreground transition-colors">Safety Shield (AI)</Link></li>
            <li><Link to="/user/sos" className="hover:text-foreground transition-colors">Emergency SOS Flow</Link></li>
            <li><a href="#how" className="hover:text-foreground transition-colors">How Response Works</a></li>
          </ul>
        </div>

        {/* Access Portals */}
        <div>
          <h4 className="text-sm font-bold tracking-tight text-foreground uppercase text-xs">Portals</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/login" className="hover:text-foreground transition-colors">User Sign In</Link></li>
            <li><Link to="/register" className="hover:text-foreground transition-colors">Volunteer Registration</Link></li>
            <li><Link to="/login" className="hover:text-foreground transition-colors">Admin Command Center</Link></li>
            <li><a href="#faq" className="hover:text-foreground transition-colors">Frequently Asked Questions</a></li>
          </ul>
        </div>

        {/* Privacy & Trust */}
        <div>
          <h4 className="text-sm font-bold tracking-tight text-foreground uppercase text-xs">Safety & Trust</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><a href="#privacy" className="hover:text-foreground transition-colors">Role-Based Access</a></li>
            <li><a href="#privacy" className="hover:text-foreground transition-colors">Controlled Location Data</a></li>
            <li><a href="#privacy" className="hover:text-foreground transition-colors">Protected Evidence Logs</a></li>
            <li><a href="#emergency-disclaimer" className="hover:text-foreground transition-colors">Emergency Protocol</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} SafeHer Platform. All rights reserved.</span>
          <span className="text-center md:text-right font-medium">
            In an immediate life-threatening emergency, always dial official emergency services (112 / 100 / 1091).
          </span>
        </div>
      </div>
    </footer>
  );
}