// src/timeline/hooks/useResizableTimeline.ts
import { useEffect, useRef, useState } from "react";

export function useResizableTimeline(initialPct = 40) {
  const [showTimeline, setShowTimeline] = useState(true);
  const [timelineWidthPct, setTimelineWidthPct] = useState(initialPct);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const totalWidth = rect.width;
      const timelineWidth = totalWidth - x;
      let pct = (timelineWidth / totalWidth) * 100;
      pct = Math.max(20, Math.min(70, pct));
      setTimelineWidthPct(pct);
    };

    const handleUp = () => setIsResizing(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isResizing]);

  const chatWidthPct = showTimeline ? 100 - timelineWidthPct : 100;

  return {
    showTimeline,
    toggleTimeline: () => setShowTimeline((prev) => !prev),
    timelineWidthPct,
    chatWidthPct,
    containerRef,
    startResizing: () => setIsResizing(true),
  };
}
