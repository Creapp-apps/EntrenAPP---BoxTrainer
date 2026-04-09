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
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}>
              <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
              <span className={cn("text-[10px] font-medium", active && "font-semibold")}>{label}</span>
            </Link>
          );
        })}
        {/* Menu button to open sidebar for other options like Pagos, Crossfit, Metrics, Config */}
        <button onClick={onMenuClick}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors">
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">Menú</span>
        </button>
      </div>
    </nav>
  );
}
