"use client";

import { motion } from "framer-motion";
import { Dumbbell } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
  className?: string;
}

export default function LoadingScreen({ message = "Cargando entrenamientos...", className = "" }: LoadingScreenProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[50vh] p-8 text-center ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Outer glowing pulsing ring */}
        <motion.div
          className="absolute w-20 h-20 rounded-full border border-primary/20 bg-primary/5"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Medium dynamic spinning ring */}
        <motion.div
          className="absolute w-16 h-16 rounded-full border-2 border-t-primary border-r-primary/30 border-b-primary/10 border-l-primary/30"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Inner static/floating icon container */}
        <motion.div
          className="relative z-10 w-11 h-11 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-border flex items-center justify-center text-primary"
          animate={{
            y: [-3, 3, -3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Dumbbell className="w-5 h-5 animate-pulse" />
        </motion.div>
      </div>

      {/* Message with typewriter opacity effect */}
      <motion.p
        className="mt-6 text-sm font-medium text-foreground tracking-wide opacity-80"
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {message}
      </motion.p>
    </div>
  );
}
