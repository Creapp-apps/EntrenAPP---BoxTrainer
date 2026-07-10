"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

const transition = {
  type: "spring",
  mass: 0.4,
  damping: 12,
  stiffness: 95,
  restDelta: 0.001,
  restSpeed: 0.001,
};

export const MenuItem = ({
  setActive,
  active,
  item,
  label,
  emoji,
  glowColor = "from-primary/20 to-orange-500/20",
  children,
}: {
  setActive: (item: string | null) => void;
  active: string | null;
  item: string;
  label: string;
  emoji: string;
  glowColor?: string;
  children?: React.ReactNode;
}) => {
  const isSelected = active === item;

  return (
    <div
      onMouseEnter={() => setActive(item)}
      onClick={(e) => {
        e.stopPropagation();
        setActive(isSelected ? null : item);
      }}
      className="relative shrink-0"
    >
      <motion.div
        transition={{ duration: 0.2 }}
        className={cn(
          "flex items-center gap-2 px-5 py-3 rounded-full font-black text-sm transition-all duration-300 cursor-pointer border select-none",
          isSelected
            ? "bg-white text-black border-white shadow-xl shadow-black/20"
            : "bg-white/[0.03] hover:bg-white/[0.06] text-white/50 hover:text-white border-white/[0.06] hover:border-white/[0.12]"
        )}
      >
        <span className="text-base">{emoji}</span>
        <span>{label}</span>
      </motion.div>

      {/* Dropdown Container */}
      {active !== null && children && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={transition}
          className="absolute top-[calc(100%_+_1rem)] left-1/2 transform -translate-x-1/2 pt-2 z-50 pointer-events-auto"
        >
          {isSelected && (
            <div className="relative">
              {/* Glowing Background Glow */}
              <div className={cn("absolute -inset-1 rounded-3xl blur-xl opacity-30 bg-gradient-to-br transition-all duration-500", glowColor)} />
              
              <motion.div
                transition={transition}
                layoutId="active" // layoutId ensures smooth morph animation
                className="relative bg-black/80 backdrop-blur-xl rounded-[28px] overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/80"
              >
                <motion.div
                  layout // layout ensures smooth dimension changes
                  className="w-max max-w-[90vw] sm:max-w-md md:max-w-lg h-full p-6 md:p-8"
                >
                  {children}
                </motion.div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export const Menu = ({
  setActive,
  children,
  className,
  closeOnMouseLeave = true,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
  className?: string;
  closeOnMouseLeave?: boolean;
}) => {
  return (
    <nav
      onMouseLeave={() => {
        if (closeOnMouseLeave) setActive(null);
      }}
      className={cn(
        "relative rounded-full flex items-center justify-start sm:justify-center gap-2.5 px-4 py-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none",
        className
      )}
    >
      {children}
    </nav>
  );
};

export const HoveredLink = ({ children, ...rest }: any) => {
  return (
    <Link
      {...rest}
      className="text-neutral-400 hover:text-white transition-colors duration-200"
    >
      {children}
    </Link>
  );
};
