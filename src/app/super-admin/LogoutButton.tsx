"use client";

import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  return (
    <button
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = "/auth/login";
      }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full">
      🚪 Cerrar sesión
    </button>
  );
}
