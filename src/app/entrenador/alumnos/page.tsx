import { createClient } from "@/lib/supabase/server";
import { Users, Plus, Search } from "lucide-react";
import Link from "next/link";
import { getInitials } from "@/lib/utils";

export default async function AlumnosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: students } = await supabase
    .from("users")
    .select("*")
    .eq("role", "student")
    .eq("created_by", user!.id)
    .order("full_name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alumnos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{students?.length ?? 0} alumnos registrados</p>
        </div>
        <Link href="/entrenador/alumnos/nuevo"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
          <Plus className="w-4 h-4" />
          Nuevo alumno
        </Link>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar alumno..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Lista */}
      {students && students.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {students.map((student) => (
            <Link key={student.id} href={`/entrenador/alumnos/${student.id}`}
              className="bg-white rounded-2xl p-5 shadow-sm border border-border hover:shadow-md hover:border-primary/30 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {getInitials(student.full_name || "?")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{student.full_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      student.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {student.active ? "Activo" : "Inactivo"}
                    </span>
                    {student.monthly_price && (
                      <span className="text-xs text-muted-foreground">
                        ${student.monthly_price}/mes
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-border">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sin alumnos todavía</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Agregá tu primer alumno para comenzar.
          </p>
          <Link href="/entrenador/alumnos/nuevo"
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
            <Plus className="w-4 h-4" />
            Agregar alumno
          </Link>
        </div>
      )}
    </div>
  );
}
