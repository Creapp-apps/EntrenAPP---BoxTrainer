"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, MapPin, Dumbbell, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/ui/loading-screen";

interface BoxResult {
  id: string;
  name: string;
  branding_config: {
    primary_color?: string;
  } | null;
}

export default function BuscarBoxPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BoxResult[]>([]);
  const [loading, setLoading] = useState(true); // Carga inicial para mostrar todos

  useEffect(() => {
    const fetchBoxes = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/boxes/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.boxes || []);
        }
      } catch (error) {
        console.error("Error fetching boxes:", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchBoxes, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="min-h-screen bg-[#060608] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-2xl z-10 relative">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-12">
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span className="text-sm font-semibold">Volver al inicio</span>
        </Link>

        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            Encontrá tu gimnasio
          </h1>
          <p className="text-lg text-white/50">
            Buscá el centro en el que entrenás para acceder a su plataforma exclusiva.
          </p>
        </div>

        {/* Buscador */}
        <div className="relative mb-8 group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
            <Search className="w-6 h-6 text-white/30 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: CrossFit Palermo, Funcional Pro..."
            className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 focus:border-primary/50 text-white rounded-2xl py-5 pl-16 pr-6 text-lg outline-none transition-all shadow-2xl placeholder:text-white/20"
            autoFocus
          />
        </div>

        {/* Resultados */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-3 sm:p-4 min-h-[300px] max-h-[500px] overflow-y-auto custom-scrollbar shadow-2xl relative">
          {loading ? (
            <LoadingScreen message="Buscando centros..." className="py-12" />
          ) : results.length > 0 ? (
            <div className="space-y-2">
              {results.map((box, idx) => (
                <Link
                  href={`/box/${box.id}`}
                  key={box.id}
                  className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all group animate-slide-in-left opacity-0"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: box.branding_config?.primary_color || "#333" }}
                    >
                      <Dumbbell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white group-hover:text-primary transition-colors">
                        {box.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-white/40 text-xs font-semibold mt-0.5">
                        <MapPin className="w-3 h-3" />
                        Centro oficial EntrenAPP
                      </div>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-white group-hover:-rotate-45 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-2">
                <Search className="w-6 h-6 text-white/20" />
              </div>
              <h4 className="text-white font-bold text-lg">No encontramos resultados</h4>
              <p className="text-white/40 text-sm max-w-sm">
                No hay ningún centro que coincida con "{query}". Probá buscando con otro nombre o pedile el enlace a tu entrenador.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
