import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // ✅ Leer el rol desde app_metadata (no requiere DB query)
  const role = user.app_metadata?.role;
  if (role !== "super_admin") redirect("/");

  return (
    <div className="min-h-screen bg-[#060608] flex relative overflow-hidden text-white font-sans selection:bg-indigo-500/30">
      
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside className="w-64 bg-white/[0.01] backdrop-blur-xl border-r border-white/5 flex flex-col sticky top-0 h-screen z-20">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white font-black text-sm">SA</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight">CreAPP</p>
            <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Super Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <NavLink href="/super-admin" label="Dashboard" icon="📊" />
          <NavLink href="/super-admin/boxes" label="Boxes" icon="🏋️" />
          <NavLink href="/super-admin/subscriptions" label="Suscripciones" icon="💳" />
        </nav>

        {/* Footer */}
        <div className="px-4 py-5 border-t border-white/5 space-y-3">
          <LogoutButton />
          <p className="text-[10px] text-white/30 text-center uppercase tracking-widest font-semibold">v1.0.0 · CreAPP</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen relative z-10 h-screen overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#060608]/80 border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white tracking-tight">Panel de Control</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full shadow-inner">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-white/70">{user.email}</span>
            </div>
          </div>
        </header>
        
        <div className="p-8 pb-20">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.04] hover:border-white/10 border border-transparent transition-all group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/10 group-hover:to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="text-lg group-hover:scale-110 transition-transform relative z-10">{icon}</span>
      <span className="relative z-10">{label}</span>
    </a>
  );
}
