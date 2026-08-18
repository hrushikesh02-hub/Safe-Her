import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl gradient-hero text-white shadow-elegant">
            <Shield className="size-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">SafeHer</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">Features</a>
          <a href="#how" className="text-sm font-medium text-muted-foreground hover:text-foreground">How it works</a>
          <a href="#stats" className="text-sm font-medium text-muted-foreground hover:text-foreground">Impact</a>
          <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/login">Sign in</Link></Button>
          <Button asChild size="sm" className="gradient-hero text-white shadow-elegant"><Link to="/register">Get started</Link></Button>
        </div>
      </div>
    </header>
  );
}