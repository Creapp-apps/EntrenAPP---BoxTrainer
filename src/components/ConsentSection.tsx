"use client";

import { useState, useRef, useEffect } from "react";
import { FileSignature, Pencil, X, Check, RefreshCw, ShieldAlert } from "lucide-react";

interface Props {
  studentName: string;
}

export default function ConsentSection({ studentName }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [athleteSignature, setAthleteSignature] = useState<string | null>(null);
  const [coachSignature, setCoachSignature] = useState<string | null>(null);
  const [signingRole, setSigningRole] = useState<"athlete" | "coach" | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const openSignModal = (role: "athlete" | "coach") => {
    setSigningRole(role);
    setIsModalOpen(true);
    // Pequeño delay para asegurar que el DOM renderice el canvas antes de configurar eventos
    setTimeout(() => {
      setupCanvas();
    }, 100);
  };

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resetear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000000";
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const getPos = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    // Manejo táctil o mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL("image/png");
    if (signingRole === "athlete") {
      setAthleteSignature(dataUrl);
      setConsentAccepted(true);
    } else {
      setCoachSignature(dataUrl);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="mt-10 space-y-6">
      
      {/* SECCIÓN INFORMATIVA DEL CONTRATO (Visible en informe y en print) */}
      <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-5 space-y-4 print:bg-transparent print:border-slate-300">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
          <ShieldAlert className="w-5 h-5 text-primary shrink-0" />
          <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase">
            Acuerdo de Consentimiento Bilateral & Deslinde
          </h3>
        </div>

        <div className="text-[11px] text-slate-500 leading-relaxed space-y-2 text-justify max-h-[150px] overflow-y-auto pr-2 print:max-h-none print:overflow-visible">
          <p>
            <strong>PRIMERA (Aptitud):</strong> El alumno <strong>{studentName}</strong> declara bajo juramento hallarse en perfectas condiciones de salud y aptitud física, no padeciendo afección cardiovascular o respiratoria limitante para la práctica deportiva de alta intensidad impartida en este Box.
          </p>
          <p>
            <strong>SEGUNDA (Supervisión):</strong> El equipo de profesionales y entrenadores del Box se compromete a planificar, supervisar y velar por la correcta técnica de ejecución durante las clases, brindando las adaptaciones necesarias según la morfología del deportista.
          </p>
          <p>
            <strong>TERCERA (Asunción de Riesgo):</strong> Ambas partes reconocen que el levantamiento de peso y el entrenamiento de alta intensidad conllevan un riesgo inherente de lesiones. El alumno asume voluntariamente dicho riesgo y exime de responsabilidad civil al establecimiento ante lesiones ocasionadas por el uso indebido o no autorizado de equipamiento.
          </p>
        </div>

        {/* Checkbox informativo en pantalla */}
        <div className="flex items-center gap-2 pt-2 print:hidden">
          <input 
            type="checkbox" 
            checked={consentAccepted}
            onChange={(e) => setConsentAccepted(e.target.checked)}
            className="w-4 h-4 accent-primary"
            id="checkConsent"
          />
          <label htmlFor="checkConsent" className="text-xs font-bold text-slate-700 cursor-pointer">
            El alumno acepta y ratifica los términos contractuales expresados arriba.
          </label>
        </div>
      </div>

      {/* BLOQUE DE FIRMAS DOBLES (Ejecutivo) */}
      <div className="grid grid-cols-2 gap-12 pt-6">
        
        {/* Columna Alumno */}
        <div className="flex flex-col items-center text-center">
          <div className="w-full aspect-[3/1] border-2 border-dashed border-slate-200 rounded-2xl bg-white flex flex-col items-center justify-center relative group cursor-pointer hover:border-primary/30 hover:bg-slate-50/40 transition-all overflow-hidden print:border-0 print:border-b-2 print:border-slate-400 print:rounded-none"
            onClick={() => openSignModal("athlete")}
          >
            {athleteSignature ? (
              <img src={athleteSignature} alt="Firma Alumno" className="w-full h-full object-contain p-2" />
            ) : (
              <div className="flex flex-col items-center text-slate-400 print:hidden">
                <Pencil className="w-5 h-5 mb-1 group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-wider">Tocar para Firmar Alumno</span>
              </div>
            )}

            {/* Label flotante hover */}
            {athleteSignature && (
              <span className="absolute bottom-2 right-2 text-[9px] font-bold text-primary bg-primary/5 border border-primary/10 px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                Editar
              </span>
            )}
          </div>
          <p className="text-xs font-black text-slate-700 mt-3 uppercase tracking-widest border-t border-slate-100 w-full pt-2">Firma del Atleta</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{studentName}</p>
        </div>

        {/* Columna Entrenador */}
        <div className="flex flex-col items-center text-center">
          <div className="w-full aspect-[3/1] border-2 border-dashed border-slate-200 rounded-2xl bg-white flex flex-col items-center justify-center relative group cursor-pointer hover:border-primary/30 hover:bg-slate-50/40 transition-all overflow-hidden print:border-0 print:border-b-2 print:border-slate-400 print:rounded-none"
            onClick={() => openSignModal("coach")}
          >
            {coachSignature ? (
              <img src={coachSignature} alt="Firma Entrenador" className="w-full h-full object-contain p-2" />
            ) : (
              <div className="flex flex-col items-center text-slate-400 print:hidden">
                <FileSignature className="w-5 h-5 mb-1 group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-wider">Firma Entrenador / Box</span>
              </div>
            )}
            
            {coachSignature && (
              <span className="absolute bottom-2 right-2 text-[9px] font-bold text-primary bg-primary/5 border border-primary/10 px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                Editar
              </span>
            )}
          </div>
          <p className="text-xs font-black text-slate-700 mt-3 uppercase tracking-widest border-t border-slate-100 w-full pt-2">Aval Profesional</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Wolfpack Coaching Staff</p>
        </div>

      </div>

      {/* MODAL PANEL DE DIBUJO DE FIRMA (Solo en pantalla) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[999] flex items-center justify-center p-4 print:hidden animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100">
            
            {/* Cabecera Modal */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-slate-700" />
                <h3 className="font-black text-slate-900 text-sm tracking-tight">
                  Firma Digital {signingRole === "athlete" ? "Alumno" : "Entrenador"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo Modal */}
            <div className="p-6 space-y-4 flex flex-col items-center">
              <p className="text-[11px] text-slate-500 text-center">
                Usa tu dedo o mouse dentro del recuadro blanco para estampar tu firma de consentimiento bilateral.
              </p>

              {/* Canvas de Dibujo */}
              <div className="w-full bg-white border-2 border-slate-200 rounded-xl relative overflow-hidden shadow-inner cursor-crosshair select-none" style={{ touchAction: "none" }}>
                <canvas
                  ref={canvasRef}
                  width={350}
                  height={200}
                  className="w-full aspect-[7/4]"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={endDrawing}
                />
              </div>

              {/* Controles */}
              <div className="flex items-center gap-2 w-full">
                <button 
                  onClick={clearCanvas}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Limpiar Lienzo
                </button>
                <button 
                  onClick={saveSignature}
                  className="flex-1 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-950/20 active:scale-[0.97] transition-all"
                >
                  <Check className="w-4 h-4 text-primary" /> Confirmar Firma
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
