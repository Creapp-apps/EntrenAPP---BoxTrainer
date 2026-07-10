"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BlurIntProps {
  word: string;
  className?: string;
  variant?: {
    hidden: { filter: string; opacity: number };
    visible: { filter: string; opacity: number };
  };
  duration?: number;
  animate?: boolean;
}

const BlurIn = ({ word, className, variant, duration = 1, animate }: BlurIntProps) => {
  const defaultVariants = {
    hidden: { filter: "blur(10px)", opacity: 0 },
    visible: { filter: "blur(0px)", opacity: 1 },
  };
  const combinedVariants = variant || defaultVariants;

  return (
    <motion.span
      initial="hidden"
      animate={animate !== undefined ? (animate ? "visible" : "hidden") : "visible"}
      transition={{ duration }}
      variants={combinedVariants}
      className={cn(
        "inline-block",
        className
      )}
    >
      {word}
    </motion.span>
  );
};

export { BlurIn };
