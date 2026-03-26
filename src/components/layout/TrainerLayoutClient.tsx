"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Menu } from "lucide-react";
import TrainerSidebar from "@/components/layout/TrainerSidebar";
import BoxOnboarding from "@/components/BoxOnboarding";

export default function TrainerLayoutClient({
  user,
  children,
  needsOnboarding = false,
  boxData = null,
}: {
  user: Record<string, string> | null;
  children: React.ReactNode;
  needsOnboarding?: boolean;
  boxData?: any;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(needsOnboarding);
  const router = useRouter();

  // Apply theme from boxData
  useEffect(() => {
    if (boxData?.theme) {
      document.documentElement.setAttribute("data-theme", boxData.theme);
    }
    return () => { document.documentElement.removeAttribute("data-theme"); };
  }, [boxData?.theme]);

  return (
    <>
      {showOnboarding && boxData && (
        <BoxOnboarding
          boxId={boxData.id}
          boxName={boxData.name || ""}
          onComplete={() => { setShowOnboarding(false); router.refresh(); }}
        />
      )}
      <div className="flex h-screen bg-muted/30 overflow-hidden">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, static on desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0 lg:z-auto
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <TrainerSidebar
          user={user}
          onClose={() => setSidebarOpen(false)}
          boxData={boxData}
        />
      </div>

      {/* Right side: mobile header + content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-sidebar border-b border-sidebar-border shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            {boxData?.logo_url ? (
              <img src={boxData.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="bg-primary rounded-lg p-1.5 shrink-0">
                <Dumbbell className="w-4 h-4 text-white" />
              </div>
            )}
            <p className="text-white font-bold text-sm truncate">{boxData?.name || "EntrenAPP"}</p>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>

      </div>
      </div>
    </>
  );
}
