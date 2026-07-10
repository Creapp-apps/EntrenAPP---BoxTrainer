"use client";

import { AnimatePresence, motion, Variants, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface FlipTextProps {
  word: string;
  duration?: number;
  delayMultiple?: number;
  framerProps?: Variants;
  className?: string;
  trigger?: boolean;
}

function FlipText({
  word,
  duration = 0.4,
  delayMultiple = 0.04,
  framerProps = {
    hidden: { rotateX: -90, opacity: 0 },
    visible: { rotateX: 0, opacity: 1 },
  },
  className,
  trigger,
}: FlipTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-10% 0px" });
  
  const active = trigger !== undefined ? trigger : isInView;
  const words = word.split(" ");

  return (
    <div ref={containerRef} className="flex flex-wrap justify-center gap-x-[0.27em] gap-y-2">
      <AnimatePresence mode="wait">
        {words.map((wordStr, wordIdx) => (
          <span key={wordIdx} className="flex whitespace-nowrap">
            {wordStr.split("").map((char, charIdx) => {
              // Calculate continuous delay based on absolute character position
              const absoluteIndex = words
                .slice(0, wordIdx)
                .reduce((sum, w) => sum + w.length, 0) + charIdx;
              
              return (
                <motion.span
                  key={charIdx}
                  initial="hidden"
                  animate={active ? "visible" : "hidden"}
                  exit="hidden"
                  variants={framerProps}
                  transition={{ duration, delay: absoluteIndex * delayMultiple }}
                  className={cn("origin-center inline-block select-none", className)}
                >
                  {char}
                </motion.span>
              );
            })}
          </span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export { FlipText };
