"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Dumbbell,
  Users,
  BookOpen,
  Calendar,
  CreditCard,
  LogOut,
  LayoutDashboard,
  ChevronRight,
  Bell,
  X,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/entrenador", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/entrenador/alumnos", label: "Alumnos", icon: Users },
  { href: "/entrenador/ejercicios", label: "Ejercicios", icon: BookOpen },
  { href: "/entrenador/ciclos", label: "Ciclos", icon: Calendar },
  { href: "/entrenador/pagos", label: "Pagos", icon: CreditCard },
];

export default function TrainerSidebar({
  user,
  onClose,
}: {
  user: Record<string, string> | null;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    router.push("/auth/login");
  };

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <aside className="w-72 lg:w-64 bg-sidebar flex flex-col h-full shrink-0">
      {/* Logo + close button on mobile */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="bg-primary rounded-xl p-2">
          <Dumbbell className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sidebar-foreground font-bold text-sm">EntrenAPP</p>
          <p className="text-sidebar-foreground/50 text-xs">Panel Entrenador</p>
        </div>
        {/* Close button — only shows on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-xl text-sm font-medium transition-colors group",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className="w-5 h-5 lg:w-4 lg:h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-6 lg:pb-4 space-y-1 border-t border-sidebar-border pt-3">
        <button
          onClick={handleNavClick}
          className="flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors w-full">
          <Bell className="w-5 h-5 lg:w-4 lg:h-4" />
          Notificaciones
        </button>
        <Link
          href="/entrenador/configuracion"
          onClick={handleNavClick}
          className={cn(
            "flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-xl text-sm font-medium transition-colors",
            pathname.startsWith("/entrenador/configuracion")
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <Settings className="w-5 h-5 lg:w-4 lg:h-4" />
          <span className="flex-1">Configuración</span>
          {pathname.startsWith("/entrenador/configuracion") && <ChevronRight className="w-3 h-3 opacity-60" />}
        </Link>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-9 h-9 lg:w-8 lg:h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm lg:text-xs font-bold shrink-0">
            {user?.full_name?.[0]?.toUpperCase() || "E"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-foreground text-sm lg:text-xs font-medium truncate">
              {user?.full_name || "Entrenador"}
            </p>
            <p className="text-sidebar-foreground/50 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-colors w-full"
        >
          <LogOut className="w-5 h-5 lg:w-4 lg:h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
