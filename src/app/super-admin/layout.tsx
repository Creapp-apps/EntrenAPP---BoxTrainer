import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") redirect("/");

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111113] border-r border-white/5 flex flex-col sticky top-0 h-screen">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-black text-xs">SA</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">CreAPP Admin</p>
              <p className="text-[10px] text-white/40">Super Administrator</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink href="/super-admin" label="Dashboard" icon="📊" />
          <NavLink href="/super-admin/boxes" label="Boxes" icon="🏋️" />
          <NavLink href="/super-admin/subscriptions" label="Suscripciones" icon="💳" />
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/5 space-y-2">
          <LogoutButton />
          <p className="text-[10px] text-white/30 px-3">v1.0.0 · CreAPP Platform</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-10 backdrop-blur-xl bg-[#0a0a0b]/80 border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white/90">Super Admin</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40 bg-white/5 px-3 py-1.5 rounded-lg">
              {user.email}
            </span>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
      <span className="text-base">{icon}</span>
      {label}
    </a>
  );
}
