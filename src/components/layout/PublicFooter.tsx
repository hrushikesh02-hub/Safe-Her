import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t bg-sidebar text-sidebar-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-sidebar-primary text-white">
              <Shield className="size-5" />
            </div>
            <span className="text-lg font-bold">SafeHer</span>
          </div>
          <p className="mt-4 text-sm text-sidebar-foreground/70">
            A government-backed women safety platform connecting users with verified responders, 24/7.
          </p>
        </div>
        <FooterCol title="Platform" links={[["About", "#"], ["Features", "#features"], ["How it works", "#how"]]} />
        <FooterCol title="Resources" links={[["Safety Resources", "#"], ["Contact", "#"], ["Help Center", "#"]]} />
        <FooterCol title="Legal" links={[["Terms of Service", "#"], ["Privacy Policy", "#"], ["Compliance", "#"]]} />
      </div>
      <div className="border-t border-sidebar-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-sidebar-foreground/60 md:flex-row">
          <span>© {new Date().getFullYear()} SafeHer. All rights reserved.</span>
          <span>For emergencies, always also call your local emergency number.</span>
        </div>
      </div>
    </footer>
  );

  function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
    return (
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <ul className="mt-4 space-y-2 text-sm text-sidebar-foreground/70">
          {links.map(([label, href]) => (
            <li key={label}><Link to={href as string} className="hover:text-sidebar-foreground">{label}</Link></li>
          ))}
        </ul>
      </div>
    );
  }
}