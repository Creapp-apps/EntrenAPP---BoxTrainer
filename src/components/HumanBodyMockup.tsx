"use client";

import React, { useState } from "react";

// Identificadores únicos de partes del cuerpo y sus etiquetas legibles
const BODY_PARTS_DETAILS: Record<string, { label: string; view: "frente" | "espalda"; x: number; y: number }> = {
  cabeza: { label: "Cabeza", view: "frente", x: 75, y: 30 },
  cuello: { label: "Cuello", view: "frente", x: 75, y: 55 },
  hombro_d: { label: "Hombro Derecho", view: "frente", x: 40, y: 75 },
  hombro_i: { label: "Hombro Izquierdo", view: "frente", x: 110, y: 75 },
  pecho: { label: "Pecho", view: "frente", x: 75, y: 95 },
  brazo_d: { label: "Bíceps Derecho", view: "frente", x: 30, y: 110 },
  brazo_i: { label: "Bíceps Izquierdo", view: "frente", x: 120, y: 110 },
  codo_d: { label: "Codo Derecho", view: "frente", x: 26, y: 135 },
  codo_i: { label: "Codo Izquierdo", view: "frente", x: 124, y: 135 },
  antebrazo_d: { label: "Antebrazo Derecho", view: "frente", x: 22, y: 165 },
  antebrazo_i: { label: "Antebrazo Izquierdo", view: "frente", x: 128, y: 165 },
  muñeca_d: { label: "Muñeca Derecha", view: "frente", x: 18, y: 195 },
  muñeca_i: { label: "Muñeca Izquierda", view: "frente", x: 132, y: 195 },
  mano_d: { label: "Mano Derecha", view: "frente", x: 15, y: 215 },
  mano_i: { label: "Mano Izquierda", view: "frente", x: 135, y: 215 },
  abdomen: { label: "Abdomen", view: "frente", x: 75, y: 140 },
  cadera: { label: "Cadera", view: "frente", x: 75, y: 180 },
  cuadriceps_d: { label: "Cuádriceps Derecho", view: "frente", x: 55, y: 225 },
  cuadriceps_i: { label: "Cuádriceps Izquierdo", view: "frente", x: 95, y: 225 },
  rodilla_d: { label: "Rodilla Derecha", view: "frente", x: 55, y: 275 },
  rodilla_i: { label: "Rodilla Izquierda", view: "frente", x: 95, y: 275 },
  tibia_d: { label: "Tibia Derecha", view: "frente", x: 55, y: 320 },
  tibia_i: { label: "Tibia Izquierda", view: "frente", x: 95, y: 320 },
  tobillo_d: { label: "Tobillo Derecho", view: "frente", x: 55, y: 355 },
  tobillo_i: { label: "Tobillo Izquierdo", view: "frente", x: 95, y: 355 },
  pie_d: { label: "Pie Derecho", view: "frente", x: 52, y: 380 },
  pie_i: { label: "Pie Izquierdo", view: "frente", x: 98, y: 380 },

  // Vista posterior (espalda)
  cervicales: { label: "Cervicales", view: "espalda", x: 75, y: 55 },
  trapecio_d: { label: "Trapecio Derecho", view: "espalda", x: 55, y: 70 },
  trapecio_i: { label: "Trapecio Izquierdo", view: "espalda", x: 95, y: 70 },
  dorsal_d: { label: "Dorsal Derecho", view: "espalda", x: 52, y: 105 },
  dorsal_i: { label: "Dorsal Izquierdo", view: "espalda", x: 98, y: 105 },
  lumbar: { label: "Zona Lumbar", view: "espalda", x: 75, y: 155 },
  espalda_alta: { label: "Espalda Alta", view: "espalda", x: 75, y: 90 },
  triceps_d: { label: "Tríceps Derecho", view: "espalda", x: 28, y: 110 },
  triceps_i: { label: "Tríceps Izquierdo", view: "espalda", x: 122, y: 110 },
  codo_d_post: { label: "Codo Derecho (Post)", view: "espalda", x: 26, y: 135 },
  codo_i_post: { label: "Codo Izquierdo (Post)", view: "espalda", x: 124, y: 135 },
  gluteo_d: { label: "Glúteo Derecho", view: "espalda", x: 55, y: 195 },
  gluteo_i: { label: "Glúteo Izquierdo", view: "espalda", x: 95, y: 195 },
  isquios_d: { label: "Isquiotibiales Der.", view: "espalda", x: 55, y: 245 },
  isquios_i: { label: "Isquiotibiales Izq.", view: "espalda", x: 95, y: 245 },
  corva_d: { label: "Corva Derecha", view: "espalda", x: 55, y: 290 },
  corva_i: { label: "Corva Izquierda", view: "espalda", x: 95, y: 290 },
  gemelo_d: { label: "Gemelo Derecho", view: "espalda", x: 55, y: 330 },
  gemelo_i: { label: "Gemelo Izquierdo", view: "espalda", x: 95, y: 330 },
  talon_d: { label: "Talón Derecho", view: "espalda", x: 55, y: 375 },
  talon_i: { label: "Talón Izquierdo", view: "espalda", x: 95, y: 375 },
};

interface HumanBodyMockupProps {
  gender?: "hombre" | "mujer" | "no_especificar";
  selectedParts?: string[];
  onChange?: (parts: string[]) => void;
  readOnly?: boolean;
}

export default function HumanBodyMockup({
  gender = "no_especificar",
  selectedParts = [],
  onChange,
  readOnly = false,
}: HumanBodyMockupProps) {
  const [view, setView] = useState<"frente" | "espalda">("frente");

  // Manejar click sobre la parte del cuerpo
  const handlePartClick = (partId: string) => {
    if (readOnly || !onChange) return;
    const isSelected = selectedParts.includes(partId);
    let updated: string[];
    if (isSelected) {
      updated = selectedParts.filter(p => p !== partId);
    } else {
      updated = [...selectedParts, partId];
    }
    onChange(updated);
  };

  // Filtrar partes correspondientes a la vista actual
  const currentViewParts = Object.entries(BODY_PARTS_DETAILS).filter(
    ([_, details]) => details.view === view
  );

  // Definición de las siluetas SVG según el género
  const renderSilueta = () => {
    const strokeColor = "#dc2626"; // Rojo de lesiones
    const fillColor = "#f3f4f6";

    if (gender === "mujer") {
      return (
        <g stroke="#94a3b8" strokeWidth="2" fill={fillColor} strokeLinecap="round" strokeLinejoin="round">
          {/* Cabeza */}
          <circle cx="75" cy="30" r="12" />
          {/* Cuello */}
          <path d="M71 42 v6 h8 v-6 Z" />
          {/* Hombros y Brazos */}
          <path d="M71 45 C58 45 42 50 38 65 L28 120 C26 130 20 180 18 195 L14 210 C12 216 16 220 18 220 C20 220 22 214 24 205 L28 180" />
          <path d="M79 45 C92 45 108 50 112 65 L122 120 C124 130 130 180 132 195 L136 210 C138 216 134 220 132 220 C130 220 128 214 126 205 L122 180" />
          {/* Tronco con curvas femeninas (cintura angosta, caderas más anchas) */}
          <path d="M38 65 C40 95 48 115 48 135 C48 150 42 165 40 180 C38 195 44 205 52 205 H98 C106 205 112 195 110 180 C108 165 102 150 102 135 C102 115 110 95 112 65 Z" />
          {/* Piernas */}
          <path d="M52 205 L54 260 C54 285 52 320 52 355 L50 375 C49 381 55 385 58 385 C61 385 62 380 62 375 L64 350 C65 315 67 285 73 235" />
          <path d="M98 205 L96 260 C96 285 98 320 98 355 L100 375 C101 381 95 385 92 385 C89 385 88 380 88 375 L86 350 C85 315 83 285 77 235" />
        </g>
      );
    }

    // Default: Hombre o No Especificar
    return (
      <g stroke="#94a3b8" strokeWidth="2" fill={fillColor} strokeLinecap="round" strokeLinejoin="round">
        {/* Cabeza */}
        <circle cx="75" cy="30" r="13" />
        {/* Cuello */}
        <path d="M70 43 v6 h10 v-6 Z" />
        {/* Hombros más anchos y Brazos */}
        <path d="M70 45 C55 45 35 48 32 65 L22 120 C20 130 18 180 16 195 L12 210 C10 216 14 220 16 220 C18 220 20 214 22 205 L26 180" />
        <path d="M80 45 C95 45 115 48 118 65 L128 120 C130 130 132 180 134 195 L138 210 C140 216 136 220 134 220 C132 220 130 214 128 205 L124 180" />
        {/* Tronco Masculino */}
        <path d="M32 65 C34 95 40 120 40 145 C40 165 44 180 48 195 C50 200 54 202 58 202 H92 C96 202 100 200 102 195 C106 180 110 165 110 145 C110 120 116 95 118 65 Z" />
        {/* Piernas */}
        <path d="M48 202 L52 260 C52 285 50 320 50 355 L48 375 C47 381 53 385 56 385 C59 385 60 380 60 375 L62 350 C63 315 65 285 72 230" />
        <path d="M102 202 L98 260 C98 285 100 320 100 355 L102 375 C103 381 97 385 94 385 C91 385 90 380 90 375 L88 350 C87 315 85 285 78 230" />
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center bg-white rounded-2xl border border-border p-4 shadow-sm select-none">
      {/* Selector de Vista (Frente / Espalda) */}
      <div className="flex bg-muted rounded-xl p-1 w-full max-w-[200px] mb-4 shrink-0">
        <button
          type="button"
          onClick={() => setView("frente")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
            view === "frente"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Frente
        </button>
        <button
          type="button"
          onClick={() => setView("espalda")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
            view === "espalda"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Espalda
        </button>
      </div>

      {/* Silueta e Interactividad */}
      <div className="relative w-[180px] h-[410px] flex items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100 p-2">
        <svg
          viewBox="0 0 150 410"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {renderSilueta()}

          {/* Hotspots interactivos */}
          {currentViewParts.map(([partId, details]) => {
            const isSelected = selectedParts.includes(partId);
            
            // Si está en modo lectura, solo renderizar los puntos activos
            if (readOnly && !isSelected) return null;

            return (
              <g
                key={partId}
                className={readOnly ? "" : "cursor-pointer group"}
                onClick={() => handlePartClick(partId)}
              >
                {/* Círculo invisible más grande para facilitar el clic en móviles */}
                {!readOnly && (
                  <circle
                    cx={details.x}
                    cy={details.y}
                    r="12"
                    fill="transparent"
                  />
                )}
                {/* Círculo visual indicador */}
                <circle
                  cx={details.x}
                  cy={details.y}
                  r={isSelected ? "6" : "4.5"}
                  className={`transition-all duration-150 ${
                    isSelected
                      ? "fill-red-600 stroke-red-100 stroke-2 animate-pulse"
                      : "fill-slate-300 group-hover:fill-slate-400 group-hover:r-6 stroke-white stroke-2"
                  }`}
                />
                {/* Tooltip flotante en hover */}
                {!readOnly && (
                  <title>{details.label}</title>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Leyenda de partes seleccionadas */}
      {selectedParts.length > 0 && (
        <div className="mt-3 w-full text-center">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Zonas con dolor / lesión:</p>
          <div className="flex flex-wrap justify-center gap-1 mt-1.5">
            {selectedParts.map(p => {
              const label = BODY_PARTS_DETAILS[p]?.label || p;
              return (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200"
                >
                  {label}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handlePartClick(p)}
                      className="hover:text-red-900 font-extrabold ml-0.5"
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
