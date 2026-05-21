"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function LiveClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) {
    return (
      <div className="flex items-center gap-2 bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full animate-pulse">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">--:--</span>
      </div>
    );
  }

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
      <Clock className="w-4 h-4" />
      <span className="text-sm font-bold tracking-wider">{hours}:{minutes}</span>
    </div>
  );
}
