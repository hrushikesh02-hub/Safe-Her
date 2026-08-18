import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Shield,LogOut, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NavItem { label: string; to: string; icon: ReactNode }

export function DashboardLayout({
  portal,
  items,
  user,
}: {
  portal: "User" | "Volunteer" | "Admin";
  items: NavItem[];
  user: { name: string; role: string };
}) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  return (
    <div className="min-h-dvh bg-muted/40">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 transform bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-sidebar-primary">
              <Shield className="size-5" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">SafeHer</div>
              <div className="text-[11px] text-sidebar-foreground/60">{portal} Portal</div>
            </div>
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>
        <nav className="px-3 py-4">
          {items.map((it) => {
            const active = loc.pathname === it.to;
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-elegant"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                )}
              >
                <span className="grid size-7 place-items-center rounded-lg bg-sidebar-accent/60">{it.icon}</span>
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-3 right-3 rounded-xl bg-sidebar-accent/40 p-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-sidebar-primary text-sm font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-xs text-sidebar-foreground/60">{user.role}</div>
            </div>
            <Link to="/login" aria-label="Sign out" className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <LogOut className="size-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur sm:px-6">
  <button
    className="lg:hidden"
    onClick={() => setOpen(true)}
    aria-label="Open menu"
  >
    <Menu className="size-5" />
  </button>

  <div className="hidden text-sm text-muted-foreground lg:block">
    Welcome back,{" "}
    <span className="font-semibold text-foreground">
      {user.name.split(" ")[0]}
    </span>
  </div>
</header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}