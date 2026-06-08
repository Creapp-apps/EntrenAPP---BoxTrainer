import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[#060608] text-white font-sans selection:bg-orange-500/30 overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-12 group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Volver al inicio
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">Términos y Privacidad</h1>
            <p className="text-orange-400 font-medium tracking-wide uppercase mt-2">Última actualización: Mayo 2026</p>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl space-y-10">
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">1. Aceptación de los Términos</h2>
            <p className="text-white/60 leading-relaxed">
              Al registrarte y utilizar CreAPP, aceptas estar sujeto a estos Términos y Condiciones. CreAPP provee un software de gestión deportiva ("SaaS") diseñado para dueños de centros de entrenamiento, gimnasios y boxes, así como para sus respectivos alumnos y profesores.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">2. Planes, Prueba Gratuita y Límites</h2>
            <p className="text-white/60 leading-relaxed">
              CreAPP ofrece un período de prueba gratuito (Demo) de 30 días con acceso a todas las funcionalidades, limitado a un máximo de 50 alumnos activos. Una vez finalizado el período de prueba, el cliente deberá suscribirse a un plan pago. Los planes están estrictamente limitados por la cantidad de alumnos activos contratados (50, 100, 150, o +200 Premium). Si se alcanza el límite, el sistema no permitirá el alta de nuevos alumnos hasta que se realice una actualización (Upgrade) del plan.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">3. Política de Privacidad y Ley 25.326</h2>
            <p className="text-white/60 leading-relaxed">
              De conformidad con la Ley Nacional de Protección de Datos Personales N° 25.326 de la República Argentina, informamos que los datos suministrados por los usuarios son resguardados bajo estrictas normas de seguridad.
            </p>
            <ul className="list-disc list-inside text-white/60 space-y-2 mt-4 ml-4">
              <li><strong>No comercialización:</strong> CreAPP no vende, alquila ni comparte bases de datos de alumnos, métricas financieras o rutinas con terceros.</li>
              <li><strong>Propiedad de los datos:</strong> La información cargada por cada Box pertenece exclusivamente al dueño de dicho Box.</li>
              <li><strong>Derecho de acceso:</strong> Todo usuario tiene derecho a solicitar la modificación o eliminación de sus datos personales de nuestros servidores en cualquier momento.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">4. Analíticas y Mejora del Producto</h2>
            <p className="text-white/60 leading-relaxed">
              Para garantizar una mejora continua de la plataforma, CreAPP recolecta datos de uso <strong>completamente anonimizados</strong> (telemetría). Esto incluye métricas de interacción (clicks, flujos de navegación, adopción de funcionalidades y reporte de errores). 
            </p>
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5 mt-4">
              <p className="text-indigo-200 text-sm">
                <strong>¿Por qué lo hacemos?</strong> El trackeo de experiencia de usuario nos permite identificar qué herramientas son más útiles para los dueños de Box y dónde debemos mejorar la interfaz, asegurando que CreAPP sea cada vez más rápido, intuitivo y eficiente. Ningún dato recolectado para este fin permite identificar individuos, leer rutinas privadas ni acceder a datos de facturación.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">5. Disponibilidad del Servicio</h2>
            <p className="text-white/60 leading-relaxed">
              CreAPP se compromete a mantener el software operativo el 99% del tiempo (SLA). Sin embargo, no nos hacemos responsables por caídas de servidores de terceros (proveedores de nube) o interrupciones por mantenimiento programado, las cuales serán notificadas con antelación a los administradores.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
