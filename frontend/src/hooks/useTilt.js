import { useEffect, useRef } from "react";

const MAX_TILT_DEG = 6;

export function useTilt() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    function handleMove(e) {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const rotateY = x * MAX_TILT_DEG * 2;
      const rotateX = -y * MAX_TILT_DEG * 2;
      el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }

    function handleLeave() {
      el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
    }

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return ref;
}
