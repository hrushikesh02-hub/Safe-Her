import { Link } from "@tanstack/react-router";
import { Shield, Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/40 backdrop-blur-md bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-white shadow-sm">
            <Shield className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight leading-none text-foreground">SafeHer</span>
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Safety Platform</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-7 md:flex">
          <a href="#how" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="#ai-system" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">AI System</a>
          <a href="#safety-shield" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Safety Shield</a>
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#privacy" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Privacy & Trust</a>
          <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Button asChild variant="ghost" size="sm" className="font-semibold text-sm">
            <Link to="/login">Sign In</Link>
          </Button>
          <Button asChild size="sm" className="bg-primary text-primary-foreground font-bold shadow hover:bg-primary/90">
            <Link to="/register">
              <Sparkles className="mr-1.5 size-3.5" /> Get Started
            </Link>
          </Button>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-foreground hover:bg-muted"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background/95 backdrop-blur px-5 py-4 space-y-3">
          <nav className="flex flex-col space-y-2.5 text-sm font-medium">
            <a onClick={() => setMobileMenuOpen(false)} href="#how" className="py-1 text-muted-foreground hover:text-foreground">How It Works</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#ai-system" className="py-1 text-muted-foreground hover:text-foreground">AI System</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#safety-shield" className="py-1 text-muted-foreground hover:text-foreground">Safety Shield</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#features" className="py-1 text-muted-foreground hover:text-foreground">Features</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#privacy" className="py-1 text-muted-foreground hover:text-foreground">Privacy & Trust</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#faq" className="py-1 text-muted-foreground hover:text-foreground">FAQ</a>
          </nav>
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            <Button asChild variant="outline" className="w-full justify-center">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild className="w-full justify-center bg-primary text-primary-foreground font-bold">
              <Link to="/register">Get Started Free</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}