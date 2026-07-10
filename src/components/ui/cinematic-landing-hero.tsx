// src/components/ui/cinematic-landing-hero.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { TextEffect } from "@/components/ui/text-effect";
import { Typewriter } from "@/components/ui/typewriter";
import { InteractiveTravelCard } from "@/components/ui/3d-card";
import { Monitor, Smartphone, Dumbbell, DollarSign, Users } from "lucide-react";
import WhisperText from "@/components/ui/whisper-text";
import TypingEffect from "@/components/ui/typing-effect";
import { AnimatedText } from "@/components/ui/animated-underline-text-one";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const INJECTED_STYLES = `
  .gsap-reveal { visibility: hidden; }

  /* Environment Overlays */
  .film-grain {
      position: absolute; inset: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 50; opacity: 0.04; mix-blend-mode: overlay;
      background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>');
  }

  .bg-grid-theme {
      background-size: 60px 60px;
      background-image: 
          linear-gradient(to right, rgba(249, 115, 22, 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(249, 115, 22, 0.05) 1px, transparent 1px);
      mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
      -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }

  /* -------------------------------------------------------------------
     PHYSICAL SKEUOMORPHIC MATERIALS (Orange/Dark Theme)
  ---------------------------------------------------------------------- */
  
  .text-3d-matte {
      color: #ffffff;
      text-shadow: 
          0 10px 30px rgba(249, 115, 22, 0.25), 
          0 2px 4px rgba(249, 115, 22, 0.15);
  }

  .text-orange-gradient {
      background: linear-gradient(180deg, #FFFFFF 0%, #F97316 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      transform: translateZ(0); /* Hardware acceleration */
      filter: 
          drop-shadow(0px 10px 20px rgba(249, 115, 22, 0.2)) 
          drop-shadow(0px 2px 4px rgba(249, 115, 22, 0.1));
  }

  .text-card-silver-matte {
      background: linear-gradient(180deg, #FFFFFF 0%, #EA580C 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      transform: translateZ(0);
      filter: 
          drop-shadow(0px 12px 24px rgba(0,0,0,0.8)) 
          drop-shadow(0px 4px 8px rgba(0,0,0,0.6));
  }

  /* Deep Physical Card with Dynamic Mouse Lighting (Carbon Theme) */
  .premium-depth-card {
      background: linear-gradient(145deg, #18181b 0%, #060608 100%);
      box-shadow: 
          0 40px 100px -20px rgba(0, 0, 0, 0.95),
          0 20px 40px -20px rgba(0, 0, 0, 0.9),
          inset 0 1px 2px rgba(255, 255, 255, 0.05),
          inset 0 -2px 4px rgba(0, 0, 0, 0.8);
      border: 1px solid rgba(249, 115, 22, 0.12);
      position: relative;
  }

  .card-sheen {
      position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 50;
      background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(249,115,22,0.05) 0%, transparent 40%);
      mix-blend-mode: screen; transition: opacity 0.3s ease;
  }

  /* Realistic iPhone Mockup Hardware */
  .iphone-bezel {
      background-color: #111;
      box-shadow: 
          inset 0 0 0 2px #3f3f46, 
          inset 0 0 0 7px #000, 
          0 40px 80px -15px rgba(0,0,0,0.9),
          0 15px 25px -5px rgba(0,0,0,0.7);
      transform-style: preserve-3d;
  }

  .hardware-btn {
      background: linear-gradient(90deg, #404040 0%, #171717 100%);
      box-shadow: 
          -2px 0 5px rgba(0,0,0,0.8),
          inset -1px 0 1px rgba(255,255,255,0.15),
          inset 1px 0 2px rgba(0,0,0,0.8);
      border-left: 1px solid rgba(255,255,255,0.05);
  }
  
  .screen-glare {
      background: linear-gradient(110deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 45%);
  }

  .widget-depth {
      background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 100%);
      box-shadow: 
          0 10px 20px rgba(0,0,0,0.35),
          inset 0 1px 1px rgba(255,255,255,0.03),
          inset 0 -1px 1px rgba(0,0,0,0.6);
      border: 1px solid rgba(255,255,255,0.02);
  }

  .floating-ui-badge {
      background: linear-gradient(135deg, rgba(24, 24, 27, 0.8) 0%, rgba(9, 9, 11, 0.6) 100%);
      backdrop-filter: blur(24px); 
      -webkit-backdrop-filter: blur(24px);
      box-shadow: 
          0 0 0 1px rgba(249, 115, 22, 0.15),
          0 25px 50px -12px rgba(0, 0, 0, 0.85),
          inset 0 1px 1px rgba(255,255,255,0.05),
          inset 0 -1px 1px rgba(0,0,0,0.5);
  }

  /* Physical Tactile Buttons */
  .btn-modern-light, .btn-modern-dark {
      transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  }
  .btn-modern-light {
      background: linear-gradient(180deg, #F97316 0%, #EA580C 100%);
      color: #FFFFFF;
      box-shadow: 0 0 0 1px rgba(249,115,22,0.2), 0 2px 4px rgba(0,0,0,0.2), 0 12px 24px -4px rgba(249,115,22,0.4), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -3px 6px rgba(0,0,0,0.15);
  }
  .btn-modern-light:hover {
      transform: translateY(-3px);
      box-shadow: 0 0 0 1px rgba(249,115,22,0.3), 0 6px 12px -2px rgba(249,115,22,0.3), 0 20px 32px -6px rgba(249,115,22,0.5), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -3px 6px rgba(0,0,0,0.15);
  }
  .btn-modern-light:active {
      transform: translateY(1px);
      background: linear-gradient(180deg, #EA580C 0%, #C2410C 100%);
      box-shadow: 0 0 0 1px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.2), inset 0 3px 6px rgba(0,0,0,0.2);
  }
  .btn-modern-dark {
      background: linear-gradient(180deg, #27272A 0%, #18181B 100%);
      color: #FFFFFF;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.6), 0 12px 24px -4px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -3px 6px rgba(0,0,0,0.8);
  }
  .btn-modern-dark:hover {
      transform: translateY(-3px);
      background: linear-gradient(180deg, #3F3F46 0%, #27272A 100%);
      box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 6px 12px -2px rgba(0,0,0,0.7), 0 20px 32px -6px rgba(0,0,0,1), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -3px 6px rgba(0,0,0,0.8);
  }
  .btn-modern-dark:active {
      transform: translateY(1px);
      background: #18181B;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.05), inset 0 3px 8px rgba(0,0,0,0.9);
  }

  .progress-ring {
      transform: rotate(-90deg);
      transform-origin: center;
      stroke-dasharray: 402;
      stroke-dashoffset: 402;
      stroke-linecap: round;
  }
`;

export interface CinematicHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  brandName?: string;
  tagline1?: string;
  tagline2?: string;
  cardHeading?: string;
  cardDescription?: React.ReactNode;
  metricValue?: number;
  metricLabel?: string;
  ctaHeading?: string;
  ctaDescription?: string;
}

export function CinematicHero({ 
  brandName = "EntrenAPP",
  tagline1 = "Entrená a otro nivel,",
  tagline2 = "gestioná sin límites.",
  cardHeading = "La evolución de tu Box.",
  cardDescription = <><span className="text-white font-semibold">EntrenAPP</span> conecta a coaches y atletas de halterofilia, CrossFit y entrenamiento de fuerza con planificación avanzada, seguimiento de PRs en tiempo real y métricas de rendimiento físico y financiero.</>,
  metricValue = 180,
  metricLabel = "kg Clean & Jerk",
  ctaHeading = "Llevá tu Box al siguiente nivel.",
  ctaDescription = "Unite a los centros de entrenamiento que ya digitalizaron su planificación, pagos y comunidad.",
  className, 
  ...props 
}: CinematicHeroProps) {
  
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);

  const [isIntroActive, setIsIntroActive] = useState(false);
  const [startTypewriter, setStartTypewriter] = useState(false);
  const [isOutroActive, setIsOutroActive] = useState(false);
  const [startOutroTyping, setStartOutroTyping] = useState(false);
  const [isCtaActive, setIsCtaActive] = useState(false);
  const [startCtaTyping, setStartCtaTyping] = useState(false);

  useEffect(() => {
    if (isIntroActive) {
      const timer = setTimeout(() => {
        setStartTypewriter(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setStartTypewriter(false);
    }
  }, [isIntroActive]);

  useEffect(() => {
    if (isOutroActive) {
      const timer = setTimeout(() => {
        setStartOutroTyping(true);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setStartOutroTyping(false);
    }
  }, [isOutroActive]);

  useEffect(() => {
    if (isCtaActive) {
      const timer = setTimeout(() => {
        setStartCtaTyping(true);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      setStartCtaTyping(false);
    }
  }, [isCtaActive]);

  // 1. High-Performance Mouse Interaction Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.scrollY > window.innerHeight * 2) return;

      cancelAnimationFrame(requestRef.current);
      
      requestRef.current = requestAnimationFrame(() => {
        if (mainCardRef.current && mockupRef.current) {
          const rect = mainCardRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          mainCardRef.current.style.setProperty("--mouse-x", `${mouseX}px`);
          mainCardRef.current.style.setProperty("--mouse-y", `${mouseY}px`);

          const xVal = (e.clientX / window.innerWidth - 0.5) * 2;
          const yVal = (e.clientY / window.innerHeight - 0.5) * 2;

          gsap.to(mockupRef.current, {
            rotationY: xVal * 12,
            rotationX: -yVal * 12,
            ease: "power3.out",
            duration: 1.2,
          });
        }
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  },[]);

  // 2. Cinematic Scroll Timeline
  useEffect(() => {
    // Force manual scroll restoration to prevent page jumps on load / refresh
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      window.scrollTo(0, 0);
      ScrollTrigger.clearScrollMemory();
    }

    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      gsap.set(".text-track", { autoAlpha: 0, y: 60, scale: 0.85, filter: "blur(20px)", rotationX: -20 });
      gsap.set(".text-days", { autoAlpha: 1, clipPath: "inset(0 100% 0 0)" });
      gsap.set(".main-card", { y: window.innerHeight + 200, autoAlpha: 1 });
      gsap.set([".card-left-text", ".card-right-text", ".mockup-scroll-wrapper", ".floating-badge", ".phone-widget", ".slide-outro-info"], { autoAlpha: 0 });
      gsap.set(".slide-intro-info", { autoAlpha: 0, y: 20 });
      gsap.set(".slide-intro-col", { autoAlpha: 0, y: 30, scale: 0.9 });
      gsap.set(".cta-wrapper", { autoAlpha: 0, scale: 0.8, filter: "blur(30px)" });

      const introTl = gsap.timeline({ delay: 0.3 });
      introTl
        .to(".text-track", { duration: 1.8, autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", rotationX: 0, ease: "expo.out" })
        .to(".text-days", { duration: 1.4, clipPath: "inset(0 0% 0 0)", ease: "power4.inOut" }, "-=1.0");

      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=3000",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          onUpdate: (self) => {
            // Trigger text animation when the modal settles in the center (progress >= 0.10)
            setIsIntroActive(self.progress >= 0.10 && self.progress <= 0.42);
            // Trigger slide 3 text animation when outro is visible (progress >= 0.63)
            setIsOutroActive(self.progress >= 0.63);
            // Trigger CTA text animation when final CTA elements fade in (progress >= 0.88)
            setIsCtaActive(self.progress >= 0.88);
          },
        },
      });

      scrollTl
        .to([".hero-text-wrapper", ".bg-grid-theme"], { scale: 1.15, filter: "blur(20px)", opacity: 0.2, ease: "power2.inOut", duration: 1.2 }, 0)
        .to(".main-card", { y: 0, ease: "power3.inOut", duration: 1.2 }, 0)
        .to(".main-card", { width: "100%", height: "100%", borderRadius: "0px", ease: "power3.inOut", duration: 1.0 })
        
        // --- SLIDE 1: INTRO INFO ---
        // Fade in text elements while the card settles in the center (from 0.3s to 1.1s)
        .to(".slide-intro-info", { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.8 }, 0.3)
        // Reveal & stagger cards as the modal expands to full screen (starting at 1.2s)
        .to(".slide-intro-col", { autoAlpha: 1, y: 0, scale: 1, stagger: 0.15, ease: "back.out(1.2)", duration: 0.8 }, 1.2)
        .to({}, { duration: 0.6 }) // Hold slide
        .to(".slide-intro-info", { autoAlpha: 0, y: -45, ease: "power3.in", duration: 0.5 })

        // --- SLIDE 2: THE MOBILE MOCKUP ---
        .fromTo(".mockup-scroll-wrapper",
          { y: 300, z: -500, rotationX: 50, rotationY: -30, autoAlpha: 0, scale: 0.6 },
          { y: 0, z: 0, rotationX: 0, rotationY: 0, autoAlpha: 1, scale: 1, ease: "expo.out", duration: 1.0 },
          "-=0.5"
        )
        .fromTo(".phone-widget", { y: 40, autoAlpha: 0, scale: 0.95 }, { y: 0, autoAlpha: 1, scale: 1, stagger: 0.15, ease: "back.out(1.2)", duration: 0.8 }, "-=0.8")
        .to(".progress-ring", { strokeDashoffset: 60, duration: 0.9, ease: "power3.inOut" }, "-=0.7")
        .to(".counter-val", { innerHTML: metricValue, snap: { innerHTML: 1 }, duration: 0.9, ease: "expo.out" }, "-=0.9")
        .fromTo(".floating-badge", { y: 100, autoAlpha: 0, scale: 0.7, rotationZ: -10 }, { y: 0, autoAlpha: 1, scale: 1, rotationZ: 0, ease: "back.out(1.5)", duration: 0.8, stagger: 0.15 }, "-=0.9")
        .fromTo(".card-left-text", { x: -50, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: "power4.out", duration: 0.8 }, "-=0.8")
        .fromTo(".card-right-text", { x: 50, autoAlpha: 0, scale: 0.8 }, { x: 0, autoAlpha: 1, scale: 1, ease: "expo.out", duration: 0.8 }, "<")
        .to({}, { duration: 0.4 }) // Hold mockup
        .to([".mockup-scroll-wrapper", ".floating-badge", ".card-left-text", ".card-right-text"], {
          scale: 0.9, y: -40, z: -200, autoAlpha: 0, ease: "power3.in", duration: 0.5, stagger: 0.04,
        })

        // --- SLIDE 3: OUTRO INFO ---
        .fromTo(".slide-outro-info", { autoAlpha: 0, y: 45 }, { autoAlpha: 1, y: 0, ease: "power3.out", duration: 0.7 }, "-=0.5")
        .fromTo(".slide-outro-col", { autoAlpha: 0, y: 25 }, { autoAlpha: 1, y: 0, stagger: 0.15, ease: "power3.out", duration: 0.6 }, "-=0.4")
        .to({}, { duration: 0.4 }) // Hold outro

        // --- PULLBACK & CTA ---
        .set(".hero-text-wrapper", { autoAlpha: 0 })
        .set(".cta-wrapper", { autoAlpha: 1 }) 
        .to(".slide-outro-info", { autoAlpha: 0, y: -45, ease: "power3.in", duration: 0.5 }, "pullback")
        // Responsive card pullback sizing and slide out simultaneously!
        .to(".main-card", { 
          width: isMobile ? "92vw" : "85vw", 
          height: isMobile ? "92vh" : "85vh", 
          borderRadius: isMobile ? "32px" : "40px", 
          y: -window.innerHeight - 300,
          ease: "expo.inOut", 
          duration: 0.8 
        }, "pullback") 
        .to(".cta-wrapper", { scale: 1, filter: "blur(0px)", ease: "expo.inOut", duration: 0.8 }, "pullback");

    }, containerRef);

    // Refresh ScrollTrigger once styles and layout are fully painted
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      ctx.revert();
      clearTimeout(refreshTimer);
    };
  }, [metricValue]); 

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-screen overflow-hidden flex items-center justify-center bg-background text-foreground font-sans antialiased", className)}
      style={{ perspective: "1500px" }}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="film-grain" aria-hidden="true" />
      <div className="bg-grid-theme absolute inset-0 z-0 pointer-events-none opacity-50" aria-hidden="true" />

      {/* BACKGROUND LAYER: Hero Texts */}
      <div className="hero-text-wrapper absolute z-10 flex flex-col items-center justify-center text-center w-full px-4 will-change-transform transform-style-3d">
        <h1 className="text-track gsap-reveal text-3d-matte text-5xl md:text-7xl lg:text-[6rem] font-bold tracking-tight mb-2 uppercase">
          {tagline1}
        </h1>
        <h1 className="text-days gsap-reveal text-orange-gradient text-5xl md:text-7xl lg:text-[6rem] font-extrabold tracking-tighter uppercase">
          {tagline2}
        </h1>
      </div>

      {/* BACKGROUND LAYER 2: Tactile CTA Buttons */}
      <div className="cta-wrapper absolute z-10 flex flex-col items-center justify-center text-center w-full px-4 gsap-reveal pointer-events-auto will-change-transform">
        <div className="mb-10 min-h-[3.5rem] md:min-h-[5.5rem] flex items-center justify-center">
          <AnimatedText
            text={ctaHeading}
            textClassName="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-orange-gradient uppercase select-none"
            underlineClassName="text-orange-500 absolute -bottom-5"
            trigger={startCtaTyping}
            underlineDuration={1.2}
            strokeWidth={4.5}
          />
        </div>
        <div className="text-muted-foreground text-lg md:text-xl mb-12 max-w-xl mx-auto font-light leading-relaxed min-h-[4rem] flex items-center justify-center">
          <TypingEffect
            texts={[ctaDescription]}
            className="text-muted-foreground text-lg md:text-xl font-light leading-relaxed select-none justify-center"
            typingSpeed={12}
            trigger={startCtaTyping}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-6">
          <a href="/auth/signup" aria-label="Crear cuenta gratis" className="btn-modern-light flex items-center justify-center gap-3 px-8 py-4 rounded-[1.25rem] group focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
            <div className="text-left">
              <div className="text-[10px] font-bold tracking-wider text-orange-100 uppercase mb-[-2px]">Comenzar ahora</div>
              <div className="text-xl font-bold leading-none tracking-tight">Crear Cuenta Gratis</div>
            </div>
          </a>
          <a href="/auth/login" aria-label="Iniciar Sesión" className="btn-modern-dark flex items-center justify-center gap-3 px-8 py-4 rounded-[1.25rem] group focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-background">
            <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            <div className="text-left">
              <div className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase mb-[-2px]">Ya tengo cuenta</div>
              <div className="text-xl font-bold leading-none tracking-tight">Iniciar Sesión</div>
            </div>
          </a>
        </div>
      </div>

      {/* FOREGROUND LAYER: The Physical Deep Carbon Card */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none" style={{ perspective: "1500px" }}>
        <div
          ref={mainCardRef}
          style={{ transform: "translateY(120vh)" }}
          className="main-card premium-depth-card relative overflow-hidden gsap-reveal flex items-center justify-center pointer-events-auto w-[92vw] md:w-[85vw] h-[92vh] md:h-[85vh] rounded-[32px] md:rounded-[40px]"
        >
          <div className="card-sheen" aria-hidden="true" />

          {/* Slide 1: Platform Introduction */}
          <div className="slide-intro-info gsap-reveal absolute inset-0 z-10 flex flex-col justify-center items-center px-4 md:px-8 lg:px-16 w-full h-full pointer-events-auto">
            <div className="max-w-5xl mx-auto flex flex-col items-center w-full">
              <span className="slide-intro-tag text-[9px] md:text-xs font-extrabold tracking-widest text-orange-500 uppercase bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full mb-2 md:mb-6">
                EntrenAPP para Boxes
              </span>
              <TextEffect
                per="word"
                as="h2"
                preset="blur"
                delay={0.2}
                trigger={isIntroActive}
                className="slide-intro-title text-xl md:text-4xl lg:text-5xl font-black uppercase tracking-tighter text-white mb-2 md:mb-6 text-center max-w-4xl leading-tight drop-shadow-md"
              >
                La plataforma definitiva para gestionar tu Box
              </TextEffect>
              <p className="slide-intro-desc text-muted-foreground text-[10px] md:text-sm lg:text-base font-light max-w-xl text-center mb-4 md:mb-10 leading-relaxed px-4 md:px-0 min-h-[3rem] md:min-h-[2.5rem]">
                <Typewriter
                  words={["Digitalizá tu centro de entrenamiento, automatizá tus ingresos y conectá a tu comunidad de atletas en un solo ecosistema premium."]}
                  speed={15}
                  delayBetweenWords={2000}
                  loop={false}
                  cursor={true}
                  cursorChar="|"
                  trigger={startTypewriter}
                />
              </p>
              
              <div className="flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-6 w-full px-2 md:px-0 max-w-5xl justify-items-center pointer-events-auto select-auto">
                {/* Column 1 */}
                <div style={{ perspective: "1000px" }} className="w-full flex justify-center">
                  <InteractiveTravelCard
                    title="Planificación WOD & Fuerza"
                    subtitle="Diseñá entrenamientos de CrossFit, halterofilia y fuerza. Publicá programaciones."
                    icon={<Dumbbell className="w-5 h-5 md:w-6 md:h-6" />}
                    actionText="Ver Planificación"
                    href="/entrenador/ejercicios"
                    onActionClick={() => {}}
                    className="slide-intro-col"
                  />
                </div>
                {/* Column 2 */}
                <div style={{ perspective: "1000px" }} className="w-full flex justify-center">
                  <InteractiveTravelCard
                    title="Control de Cobros"
                    subtitle="Automatizá el control de membresías, vencimiento de planes y cobros recurrentes."
                    icon={<DollarSign className="w-5 h-5 md:w-6 md:h-6" />}
                    actionText="Gestionar Cobros"
                    href="/entrenador/pagos"
                    onActionClick={() => {}}
                    className="slide-intro-col"
                  />
                </div>
                {/* Column 3 */}
                <div style={{ perspective: "1000px" }} className="w-full flex justify-center">
                  <InteractiveTravelCard
                    title="Comunidad y Récords (PRs)"
                    subtitle="Fidelizá a tus atletas con rachas, registro de marcas y tablas de posiciones."
                    icon={<Users className="w-5 h-5 md:w-6 md:h-6" />}
                    actionText="Ver Comunidad"
                    href="/entrenador/tu-box"
                    onActionClick={() => {}}
                    className="slide-intro-col"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Slide 3: Outro / Dual Platform Roles */}
          <div className="slide-outro-info gsap-reveal absolute inset-0 z-10 flex flex-col justify-center items-center px-4 md:px-8 lg:px-16 w-full h-full pointer-events-auto">
            <div className="max-w-5xl mx-auto flex flex-col items-center w-full">
              <span className="slide-outro-tag text-[9px] md:text-xs font-extrabold tracking-widest text-orange-500 uppercase bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full mb-2 md:mb-6">
                Dos Perfiles, Un Ecosistema
              </span>
              <h2 className="slide-outro-title mb-2 md:mb-6 text-center max-w-4xl drop-shadow-md">
                <WhisperText
                  text="Diseñado para Coach y Atleta"
                  className="font-black uppercase tracking-tighter text-white text-xl md:text-4xl lg:text-5xl justify-center"
                  delay={100}
                  duration={0.5}
                  x={-20}
                  y={0}
                  trigger={isOutroActive}
                />
              </h2>
              <div className="slide-outro-desc text-muted-foreground text-[10px] md:text-sm lg:text-base font-light max-w-xl text-center mb-4 md:mb-10 px-4 md:px-0 min-h-[3rem] md:min-h-[4rem] flex items-center justify-center">
                <TypingEffect
                  texts={["Una experiencia sincronizada en tiempo real para optimizar entrenamientos y potenciar los resultados de tu negocio."]}
                  className="text-muted-foreground text-[10px] md:text-sm lg:text-base font-light leading-relaxed select-none justify-center"
                  typingSpeed={20}
                  trigger={startOutroTyping}
                />
              </div>
              
              <div 
                className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full max-w-3xl px-2 md:px-0 justify-items-center pointer-events-auto"
                style={{ perspective: "1200px" }}
              >
                {/* Role 1: Coach */}
                 <InteractiveTravelCard
                  title="Dashboard del Entrenador"
                  subtitle="Control centralizado desde la web. Planificá clases semanales, gestioná alumnos y auditá cobros."
                  icon={<Monitor className="w-5 h-5 md:w-6 md:h-6" />}
                  actionText="Panel de Control Web"
                  href="/auth/signup"
                  onActionClick={() => {
                    window.location.href = "/auth/signup";
                  }}
                  className="slide-outro-col w-full md:w-80 h-[20rem] md:h-[24rem]"
                />

                {/* Role 2: Pupil */}
                <InteractiveTravelCard
                  title="Aplicación del Atleta"
                  subtitle="Toda la experiencia en el celular. Reservá turnos, registrá tu progreso y mirá el WOD de hoy."
                  icon={<Smartphone className="w-5 h-5 md:w-6 md:h-6" />}
                  actionText="App Móvil iOS y Android"
                  href="/auth/signup"
                  onActionClick={() => {
                    window.location.href = "/auth/signup";
                  }}
                  className="slide-outro-col w-full md:w-80 h-[20rem] md:h-[24rem]"
                />
              </div>
            </div>
          </div>

          {/* DYNAMIC RESPONSIVE GRID: Flex-col on mobile to force order, Grid on desktop */}
          <div className="relative w-full h-full max-w-7xl mx-auto px-4 lg:px-12 flex flex-col justify-evenly lg:grid lg:grid-cols-3 items-center lg:gap-8 z-10 py-6 lg:py-0 pointer-events-none">
            
            {/* 1. TOP (Mobile) / RIGHT (Desktop): BRAND NAME */}
            <div className="card-right-text gsap-reveal order-1 lg:order-3 flex justify-center lg:justify-end z-10 w-full">
              {/* Removed giant branding text to resolve visual superposition / background noise behind the phone mockup */}
            </div>

            {/* 2. MIDDLE (Mobile) / CENTER (Desktop): IPHONE MOCKUP */}
            <div className="mockup-scroll-wrapper order-2 lg:order-2 relative w-full h-[380px] lg:h-[600px] flex items-center justify-center z-30" style={{ perspective: "1000px" }}>
              
              {/* Inner wrapper for safe CSS scaling */}
              <div className="relative w-full h-full flex items-center justify-center transform scale-[0.65] md:scale-85 lg:scale-100">
                
                {/* The iPhone Bezel */}
                <div
                  ref={mockupRef}
                  className="relative w-[280px] h-[580px] rounded-[3rem] iphone-bezel flex flex-col will-change-transform transform-style-3d"
                >
                  {/* Physical Hardware Buttons */}
                  <div className="absolute top-[120px] -left-[3px] w-[3px] h-[25px] hardware-btn rounded-l-md z-0" aria-hidden="true" />
                  <div className="absolute top-[160px] -left-[3px] w-[3px] h-[45px] hardware-btn rounded-l-md z-0" aria-hidden="true" />
                  <div className="absolute top-[220px] -left-[3px] w-[3px] h-[45px] hardware-btn rounded-l-md z-0" aria-hidden="true" />
                  <div className="absolute top-[170px] -right-[3px] w-[3px] h-[70px] hardware-btn rounded-r-md z-0 scale-x-[-1]" aria-hidden="true" />

                  {/* Inner Screen Container */}
                  <div className="absolute inset-[7px] bg-[#050914] rounded-[2.5rem] overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,1)] text-white z-10">
                    <div className="absolute inset-0 screen-glare z-40 pointer-events-none" aria-hidden="true" />

                    {/* Dynamic Island Notch */}
                    <div className="absolute top-[5px] left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-black rounded-full z-50 flex items-center justify-end px-3 shadow-[inset_0_-1px_2px_rgba(255,255,255,0.1)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />
                    </div>

                    {/* App Interface */}
                    <div className="relative w-full h-full pt-12 px-5 pb-8 flex flex-col">
                      <div className="phone-widget flex justify-between items-center mb-8">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold mb-1">Hoy</span>
                          <span className="text-xl font-bold tracking-tight text-white drop-shadow-md">Entrenamiento</span>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-white/5 text-neutral-200 flex items-center justify-center font-bold text-sm border border-white/10 shadow-lg shadow-black/50">EA</div>
                      </div>

                      <div className="phone-widget relative w-44 h-44 mx-auto flex items-center justify-center mb-8 drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]">
                        <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
                          <circle cx="88" cy="88" r="64" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                          <circle className="progress-ring" cx="88" cy="88" r="64" fill="none" stroke="#ea580c" strokeWidth="12" />
                        </svg>
                        <div className="text-center z-10 flex flex-col items-center">
                          <span className="counter-val text-4xl font-extrabold tracking-tighter text-white">0</span>
                          <span className="text-[8px] text-orange-200/50 uppercase tracking-[0.1em] font-bold mt-0.5">{metricLabel}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="phone-widget widget-depth rounded-2xl p-3 flex items-center">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/5 flex items-center justify-center mr-3 border border-orange-400/20 shadow-inner">
                            <svg className="w-4 h-4 text-orange-400 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-xs font-bold leading-tight">WOD Completado</p>
                            <p className="text-neutral-400 text-[10px]">CrossFit • 08:30hs</p>
                          </div>
                        </div>
                        <div className="phone-widget widget-depth rounded-2xl p-3 flex items-center">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/5 flex items-center justify-center mr-3 border border-orange-400/20 shadow-inner">
                            <svg className="w-4 h-4 text-orange-400 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.75a1.125 1.125 0 01-1.125-1.125V11.25M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.75A1.125 1.125 0 0010.5 13.125V11.25m-3 7.5h9m-9 0h-3.375a1.125 1.125 0 01-1.125-1.125v-1.5a1.125 1.125 0 011.125-1.125H7.5m9 3.75H19.5a1.125 1.125 0 001.125-1.125v-1.5a1.125 1.125 0 00-1.125-1.125h-3m-9-3.75h9m-9 0a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5m-9 0V9A1.5 1.5 0 019 7.5h6A1.5 1.5 0 0116.5 9v1.5m-6-6h3a.75.75 0 01.75.75v.75h-4.5v-.75a.75.75 0 01.75-.75z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-xs font-bold leading-tight">Nuevo PR Registrado</p>
                            <p className="text-neutral-400 text-[10px]">Clean & Jerk • 120 kg (+5 kg)</p>
                          </div>
                        </div>
                      </div>

                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[120px] h-[4px] bg-white/20 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                    </div>
                  </div>
                </div>

                {/* Floating Glass Badges */}
                <div className="floating-badge absolute flex top-6 lg:top-12 left-[-15px] lg:left-[-80px] floating-ui-badge rounded-xl lg:rounded-2xl p-3 lg:p-4 items-center gap-3 lg:gap-4 z-30">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-b from-orange-500/20 to-orange-900/10 flex items-center justify-center border border-orange-400/30 shadow-inner">
                    <span className="text-base lg:text-xl drop-shadow-lg" aria-hidden="true">🔥</span>
                  </div>
                  <div>
                    <p className="text-white text-xs lg:text-sm font-bold tracking-tight">Racha Activa</p>
                    <p className="text-orange-200/50 text-[10px] lg:text-xs font-medium">5 semanas consistentes</p>
                  </div>
                </div>

                <div className="floating-badge absolute flex bottom-12 lg:bottom-20 right-[-15px] lg:right-[-80px] floating-ui-badge rounded-xl lg:rounded-2xl p-3 lg:p-4 items-center gap-3 lg:gap-4 z-30">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-b from-orange-500/20 to-orange-900/10 flex items-center justify-center border border-orange-400/30 shadow-inner">
                    <span className="text-base lg:text-lg drop-shadow-lg" aria-hidden="true">🏆</span>
                  </div>
                  <div>
                    <p className="text-white text-xs lg:text-sm font-bold tracking-tight">PR de Sentadilla</p>
                    <p className="text-orange-200/50 text-[10px] lg:text-xs font-medium">180 kg superados</p>
                  </div>
                </div>

              </div>
            </div>

            {/* 3. BOTTOM (Mobile) / LEFT (Desktop): FITNESS TEXT */}
            <div className="card-left-text gsap-reveal order-3 lg:order-1 flex flex-col justify-center text-center lg:text-left z-10 w-full lg:max-w-none px-4 lg:px-0">
              <h3 className="text-white text-2xl md:text-3xl lg:text-4xl font-bold mb-0 lg:mb-5 tracking-tight uppercase">
                {cardHeading}
              </h3>
              <p className="hidden md:block text-orange-100/70 text-sm md:text-base lg:text-lg font-normal leading-relaxed mx-auto lg:mx-0 max-w-sm lg:max-w-none">
                {cardDescription}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
