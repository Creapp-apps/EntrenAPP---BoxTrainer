"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Home, History, Trophy, CreditCard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/alumno", label: "Hoy", icon: Home, exact: true },
  { href: "/alumno/historial", label: "Historial", icon: History },
  { href: "/alumno/prs", label: "PRs", icon: Trophy },
  { href: "/alumno/pagos", label: "Pagos", icon: CreditCard },
];

export default function StudentBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide nav during active training session
  if (pathname.startsWith("/alumno/entrenar/")) return null;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}>
              <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
              <span className={cn("text-xs font-medium", active && "font-semibold")}>{label}</span>
            </Link>
          );
        })}
        <button onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-muted-foreground hover:text-destructive transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="text-xs font-medium">Salir</span>
        </button>
      </div>
    </nav>
  );
}
