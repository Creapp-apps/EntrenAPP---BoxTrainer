import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Dumbbell, ChevronRight, ShieldAlert } from "lucide-react";
import InviteClientHandler from "./InviteClientHandler";

export default async function InvitePage({ params }: { params: { box_id: string } }) {
  const supabase = await createClient();
  
  // Obtener datos del Box para personalizar el saludo
  const { data: box, error } = await supabase
    .from("boxes")
    .select("name")
    .eq("id", params.box_id)
    .single();

  // Si el Box no existe, mostramos una UI amigable indicando el error en lugar de romper la app
  if (error || !box) {
    return (
      <div className="min-h-screen bg-[#0e1217] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden border border-border">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-red-50 flex items-center justify-center shadow-inner mb-6">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Invitación Inválida
          </h1>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            El código de invitación es incorrecto o ha expirado. Por favor, solicita a tu entrenador que te envíe un nuevo enlace.
          </p>
          <div className="mt-8">
            <Link href="/auth/login" className="inline-flex items-center justify-center w-full bg-primary text-white py-3.5 px-4 rounded-2xl font-semibold hover:bg-primary/90 transition">
              Ir al Inicio de Sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1217] flex flex-col items-center justify-center p-4 select-none">
      {/* Capturador cliente del Box ID */}
      <InviteClientHandler boxId={params.box_id} />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden border border-border">
        {/* Círculos decorativos */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center shadow-inner mb-6">
            <Dumbbell className="w-10 h-10 text-primary" />
          </div>

          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Te invitaron a unirte a
          </h1>
          <h2 className="text-3xl font-extrabold text-primary mt-1.5 px-2 truncate" title={box.name}>
            {box.name}
          </h2>

          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            Crea tu cuenta o inicia sesión para acceder a tu planificación, registrar tus cargas reales y gestionar tus reservas de turnos.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/auth/signup"
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-4 px-4 rounded-2xl font-semibold hover:bg-primary/90 transition shadow-lg shadow-primary/20 group"
            >
              Crear cuenta gratis
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/auth/login"
              className="w-full text-foreground bg-muted/50 border border-border py-4 px-4 rounded-2xl font-semibold hover:bg-muted transition"
            >
              Ya tengo cuenta, Iniciar sesión
            </Link>
          </div>
        </div>
      </div>

      <p className="text-white/20 text-[10px] mt-8 font-bold tracking-[0.2em] uppercase">
        POWERED BY ENTRENAPP
      </p>
    </div>
  );
}
