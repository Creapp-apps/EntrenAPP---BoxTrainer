"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InteractiveTravelCardProps {
  title: string;
  subtitle: string;
  imageUrl?: string;
  actionText: string;
  href: string;
  onActionClick: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export const InteractiveTravelCard = React.forwardRef<
  HTMLDivElement,
  InteractiveTravelCardProps
>(
  (
    { title, subtitle, imageUrl, actionText, href, onActionClick, className, icon },
    ref
  ) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 15, stiffness: 150 };
    const springX = useSpring(mouseX, springConfig);
    const springY = useSpring(mouseY, springConfig);

    const rotateX = useTransform(springY, [-0.5, 0.5], [15, -15]);
    const rotateY = useTransform(springX, [-0.5, 0.5], [-15, 15]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const { width, height, left, top } = rect;
      const mouseXVal = e.clientX - left;
      const mouseYVal = e.clientY - top;
      const xPct = mouseXVal / width - 0.5;
      const yPct = mouseYVal / height - 0.5;
      mouseX.set(xPct);
      mouseY.set(yPct);
    };

    const handleMouseLeave = () => {
      mouseX.set(0);
      mouseY.set(0);
    };

    const hasImage = !!imageUrl;

    return (
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={cn(
          "relative h-[22rem] md:h-[26rem] w-full max-w-sm rounded-2xl bg-transparent shadow-2xl border transition-colors duration-300",
          hasImage ? "border-white/10" : "border-white/5 bg-zinc-950/20 backdrop-blur-md hover:border-orange-500/20",
          className
        )}
      >
        <div
          style={{
            transform: "translateZ(50px)",
            transformStyle: "preserve-3d",
          }}
          className={cn(
            "absolute inset-3 grid h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] grid-rows-[1fr_auto] rounded-xl shadow-lg overflow-hidden",
            !hasImage && "bg-zinc-900/40 border border-white/5 p-1"
          )}
        >
          {/* Background image & gradient overlay OR dark gradient mesh */}
          {hasImage ? (
            <>
              <img
                src={imageUrl}
                alt={`${title}, ${subtitle}`}
                className="absolute inset-0 h-full w-full rounded-xl object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 h-full w-full rounded-xl bg-gradient-to-b from-black/40 via-black/20 to-black/85" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 h-full w-full rounded-xl bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black/95" />
              {/* Subtle top sheen line */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
            </>
          )}

          {/* Card Content (Header & Footer) */}
          <div className="relative flex flex-col justify-between rounded-xl p-4 md:p-5 text-white z-10">
            
            {/* Header section with text and link */}
            <div className="flex flex-col items-start justify-start h-full">
              <div className="flex items-center justify-between w-full mb-4">
                {/* Icon wrapper */}
                {icon ? (
                  <motion.div
                    style={{ transform: "translateZ(40px)" }}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-400"
                  >
                    {icon}
                  </motion.div>
                ) : (
                  <div className="w-10 h-10" />
                )}
                
                <motion.a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, rotate: "2.5deg" }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={`Learn more about ${title}`}
                  style={{ transform: "translateZ(60px)" }}
                  className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-white/5 backdrop-blur-sm border border-white/10 transition-colors hover:bg-white/10"
                >
                  <ArrowUpRight className="h-4 w-4 md:h-5 md:w-5 text-white/80" />
                </motion.a>
              </div>

              <div className="space-y-2">
                <motion.h2 
                  style={{ transform: "translateZ(55px)" }}
                  className="text-lg md:text-xl lg:text-2xl font-black tracking-tight uppercase text-white"
                >
                  {title}
                </motion.h2>
                <motion.p 
                  style={{ transform: "translateZ(45px)" }}
                  className={cn(
                    "text-xs md:text-sm leading-relaxed",
                    hasImage ? "font-medium text-orange-400 mt-1" : "font-light text-neutral-400"
                  )}
                >
                  {subtitle}
                </motion.p>
              </div>
            </div>

            {/* Footer Button */}
            <motion.button
              onClick={onActionClick}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ transform: "translateZ(45px)" }}
              className={cn(
                "w-full rounded-lg py-2.5 text-center text-xs md:text-sm font-bold text-white transition-all duration-300 mt-4",
                hasImage 
                  ? "bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                  : "bg-zinc-900 hover:bg-orange-600/20 border border-white/10 hover:border-orange-500/30 text-neutral-300 hover:text-white"
              )}
            >
              {actionText}
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }
);
InteractiveTravelCard.displayName = "InteractiveTravelCard";
