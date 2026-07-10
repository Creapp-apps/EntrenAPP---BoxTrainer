"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, BookOpen, Calendar, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/entrenador", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/entrenador/alumnos", label: "Alumnos", icon: Users },
  { href: "/entrenador/ciclos", label: "Ciclos", icon: Calendar },
  { href: "/entrenador/ejercicios", label: "Ejercicios", icon: BookOpen },
];

export default function TrainerBottomNav({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-40 pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-spring active:scale-95 group min-w-[64px]",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
              <Icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", active && "scale-105 stroke-[2.5]")} />
              <span className={cn("text-[9px] font-medium transition-colors", active && "font-semibold")}>{label}</span>
              {active && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary animate-scale-in shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
              )}
            </Link>
          );
        })}
        {/* Menu button to open sidebar for other options like Pagos, Crossfit, Metrics, Config */}
        <button onClick={onMenuClick}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground hover:text-foreground transition-spring active:scale-95 group min-w-[64px]">
          <Menu className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
          <span className="text-[9px] font-medium">Menú</span>
        </button>
      </div>
    </nav>
  );
}
