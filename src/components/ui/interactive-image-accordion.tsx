"use client";

import React, { useState } from 'react';
import { 
  Calendar, CreditCard, Trophy, Sparkles, MessageCircle, 
  ArrowRight, Dumbbell, LucideIcon
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Data for the image accordion adapted for EntrenAPP ---
interface AccordionItemData {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  icon: LucideIcon;
  color: string;
  ctaUrl?: string;
}

const accordionItems: AccordionItemData[] = [
  {
    id: 1,
    title: 'Agenda y Reservas',
    subtitle: 'En tiempo real',
    description: 'Clases con límite de capacidad, cancelación automática y lista de espera por WhatsApp.',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=600&auto=format&fit=crop',
    icon: Calendar,
    color: 'indigo-500',
  },
  {
    id: 2,
    title: 'Cobros y Finanzas',
    subtitle: 'Control total',
    description: 'Planes modulares, vencimientos automáticos y reportes de MRR sin perseguir deudores.',
    imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600&auto=format&fit=crop',
    icon: CreditCard,
    color: 'emerald-500',
  },
  {
    id: 3,
    title: 'Planificación de Ciclos',
    subtitle: 'CrossFit y Fuerza',
    description: 'Diseñá programaciones con % de 1RM, complexes y benchmarks con asignación masiva.',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop',
    icon: Trophy,
    color: 'primary',
  },
  {
    id: 4,
    title: 'App Móvil de Atletas',
    subtitle: 'Progreso y WODs',
    description: 'WebApp veloz que instalan en 2 clics para registrar marcas, ver rutinas y tablas.',
    imageUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?q=80&w=600&auto=format&fit=crop',
    icon: Sparkles,
    color: 'violet-500',
  },
  {
    id: 5,
    title: 'Soporte por WhatsApp',
    subtitle: 'Atención 24/7',
    description: 'Sin bots. Canal directo con ingenieros y coaches para configurar tu Box en menos de 24h.',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop',
    icon: MessageCircle,
    color: 'green-500',
    ctaUrl: 'https://wa.me/541165234769',
  },
];

const getColorClasses = (color: string) => {
  switch (color) {
    case 'indigo-500':
      return {
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        text: 'text-indigo-400'
      };
    case 'emerald-500':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-400'
      };
    case 'violet-500':
      return {
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/20',
        text: 'text-violet-400'
      };
    case 'green-500':
      return {
        bg: 'bg-[#25d366]/10',
        border: 'border-[#25d366]/20',
        text: 'text-[#25d366]'
      };
    case 'primary':
    default:
      return {
        bg: 'bg-primary/10',
        border: 'border-primary/20',
        text: 'text-primary'
      };
  }
};

// --- Accordion Item Component ---
interface AccordionItemProps {
  item: AccordionItemData;
  isActive: boolean;
  onActivate: () => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ item, isActive, onActivate }) => {
  const Icon = item.icon;
  const colors = getColorClasses(item.color);

  return (
    <div
      onClick={onActivate}
      onMouseEnter={onActivate}
      className={cn(
        "relative h-[360px] md:h-[480px] rounded-3xl overflow-hidden cursor-pointer",
        "transition-all duration-700 ease-out border border-white/5",
        "shadow-2xl shadow-black/50 select-none",
        isActive 
          ? "w-[260px] sm:w-[320px] md:w-[420px] border-primary/30 ring-1 ring-primary/20" 
          : "w-[50px] sm:w-[60px] md:w-[70px] hover:border-white/20 hover:bg-white/[0.02]"
      )}
    >
      {/* Background Image */}
      <img
        src={item.imageUrl}
        alt={item.title}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out",
          isActive ? "scale-105" : "scale-100 filter grayscale opacity-45"
        )}
        onError={(e) => { 
          const target = e.target as HTMLImageElement;
          target.onerror = null; 
          target.src = 'https://placehold.co/400x480/060608/ffffff?text=EntrenAPP'; 
        }}
      />
      {/* Dynamic Overlay Gradient */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          isActive 
            ? "bg-gradient-to-t from-black via-black/60 to-black/30 opacity-95" 
            : "bg-black/85 opacity-100 hover:bg-black/75"
        )} 
      />

      {/* Inside Active Card content */}
      <div 
        className={cn(
          "absolute inset-0 flex flex-col justify-between p-4 md:p-6 transition-all duration-500",
          isActive ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        {/* Top Section */}
        <div className="flex justify-between items-start">
          <div className={cn(
            "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border",
            colors.bg,
            colors.border,
            colors.text
          )}>
            <Icon className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
            {item.subtitle}
          </span>
        </div>

        {/* Bottom Section */}
        <div className="space-y-2 md:space-y-3">
          <h4 className="text-xl md:text-2xl font-black text-white leading-tight tracking-tight">
            {item.title}
          </h4>
          <p className="text-white/60 text-xs md:text-sm leading-relaxed">
            {item.description}
          </p>
          {item.ctaUrl ? (
            <a
              href={item.ctaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-400 hover:text-emerald-300 pt-1 group/btn"
            >
              Consultar ahora
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </a>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-primary hover:text-primary-light pt-1">
              Ver más
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>

      {/* Inside Inactive Card title (Vertical) */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-end items-center pb-8 md:pb-12 transition-opacity duration-300 pointer-events-none",
          isActive ? "opacity-0" : "opacity-100"
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50">
            <Icon className="w-4 h-4" />
          </div>
          <span 
            className="text-white/40 text-xs sm:text-sm font-black whitespace-nowrap uppercase tracking-[0.25em]"
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)'
            }}
          >
            {item.title}
          </span>
        </div>
      </div>
    </div>
  );
};

import { useInView } from "framer-motion";
import { useRef } from "react";
import { VerticalCutReveal } from "./vertical-cut-reveal";
import TypingEffect from "./typing-effect";

// --- Main Section Component ---
export function LandingAccordionItem() {
  const [activeIndex, setActiveIndex] = useState(2); // Set Planificación de Ciclos as default active (index 2)
  const headingRef = useRef(null);
  const isHeadingInView = useInView(headingRef, { once: true, margin: "-10% 0px -10% 0px" });

  const handleItemActivate = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <section id="features" className="relative py-20 md:py-28 px-4 sm:px-6 md:px-8 z-10 overflow-hidden bg-[#060608] scroll-mt-20">
      
      {/* Background Gradients */}
      <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 xl:gap-16">
          
          {/* Left Side: Text Content */}
          <div className="w-full lg:w-5/12 text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60">
              <Dumbbell className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-wider">Todo lo que necesitás</span>
            </div>
            
            <h2 ref={headingRef} className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black text-white leading-[1.15] tracking-tighter flex flex-col items-center lg:items-start gap-1">
              <VerticalCutReveal
                splitBy="characters"
                staggerDuration={0.025}
                staggerFrom="first"
                animate={isHeadingInView}
                autoStart={false}
                transition={{ type: "spring", stiffness: 200, damping: 21 }}
                containerClassName="text-white justify-center lg:justify-start"
              >
                Gestioná tu
              </VerticalCutReveal>
              <div className="flex items-center justify-center lg:justify-start min-h-[1.2em]">
                <TypingEffect
                  texts={["Box", "Gimnasio", "Centro Funcional", "Musculación"]}
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black tracking-tighter text-orange-gradient"
                  typingSpeed={70}
                  rotationInterval={2200}
                  trigger={isHeadingInView}
                />
              </div>
              <VerticalCutReveal
                splitBy="characters"
                staggerDuration={0.02}
                staggerFrom="first"
                animate={isHeadingInView}
                autoStart={false}
                transition={{ type: "spring", stiffness: 200, damping: 21, delay: 0.2 }}
                containerClassName="text-white/40 justify-center lg:justify-start"
              >
                en un solo lugar
              </VerticalCutReveal>
            </h2>
            
            <p className="text-sm md:text-base text-white/50 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Automatizá los cobros, facilitá las reservas de tus alumnos y diseñá planificaciones complejas de fuerza y CrossFit. Todo desde una sola plataforma premium.
            </p>
            
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <a
                href="#pricing"
                className="w-full sm:w-auto inline-flex items-center justify-center bg-gradient-to-r from-primary to-orange-500 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300 text-sm"
              >
                Ver Planes y Precios
              </a>
              <a
                href="https://wa.me/541165234769"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black px-8 py-4 rounded-2xl hover:scale-[1.02] transition-all duration-300 text-sm"
              >
                Hablar con Soporte
              </a>
            </div>
          </div>

          {/* Right Side: Image Accordion */}
          <div className="w-full lg:w-7/12 flex justify-center">
            {/* Scroll wrapper to allow overflow scrolling on small devices if needed */}
            <div className="w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-4 px-2">
              <div className="flex flex-row items-center justify-start lg:justify-center gap-3 md:gap-4 min-w-[500px] sm:min-w-0 mx-auto">
                {accordionItems.map((item, index) => (
                  <AccordionItem
                    key={item.id}
                    item={item}
                    isActive={index === activeIndex}
                    onActivate={() => handleItemActivate(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
