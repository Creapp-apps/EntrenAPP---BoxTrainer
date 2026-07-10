"use client";

import { useEffect, useState } from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState(0);
  const [animationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    // Reset key on mount to force animation re-triggering on navigation
    setKey((prev) => prev + 1);
    setAnimationFinished(false);
  }, []);

  return (
    <div
      key={key}
      className={animationFinished ? "" : "page-transition"}
      onAnimationEnd={() => setAnimationFinished(true)}
    >
      {children}
    </div>
  );
}

