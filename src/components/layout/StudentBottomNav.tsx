"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Home, History, Trophy, CreditCard, LogOut, CalendarCheck, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/alumno", label: "Hoy", icon: Home, exact: true },
  { href: "/alumno/turnos", label: "Turnos", icon: CalendarCheck },
  { href: "/alumno/tienda", label: "Tienda", icon: ShoppingBag },
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
      <div className="flex items-center justify-start gap-2 px-4 py-2 overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-spring active:scale-95 group shrink-0 min-w-[56px]",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
              <Icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", active && "scale-105 stroke-[2.5]")} />
              <span className={cn("text-[10px] font-medium transition-colors", active && "font-semibold")}>{label}</span>
              {active && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary animate-scale-in shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
              )}
            </Link>
          );
        })}
        <button onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground hover:text-destructive transition-spring active:scale-95 group shrink-0 ml-auto min-w-[56px]">
          <LogOut className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-0.5 text-muted-foreground group-hover:text-destructive" />
          <span className="text-[10px] font-medium group-hover:text-destructive">Salir</span>
        </button>
      </div>
    </nav>
  );
}
