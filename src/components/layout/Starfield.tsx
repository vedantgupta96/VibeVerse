"use client";

import { useEffect, useRef } from "react";

const STAR_COUNT = 120;

type Star = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  driftX: number;
  driftY: number;
};

function makeStars(width: number, height: number): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 0.8 + 0.4,
    opacity: Math.random() * 0.04 + 0.04, // 4–8%
    driftX: (Math.random() - 0.5) * 0.05,
    driftY: (Math.random() - 0.5) * 0.05,
  }));
}

/**
 * Fixed full-viewport particle layer behind the app shell.
 * Drifts slowly; renders a single static frame under prefers-reduced-motion.
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: Star[] = [];
    let frame = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = makeStars(window.innerWidth, window.innerHeight);
    };

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const star of stars) {
        star.x = (star.x + star.driftX + window.innerWidth) % window.innerWidth;
        star.y =
          (star.y + star.driftY + window.innerHeight) % window.innerHeight;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(242, 239, 255, ${star.opacity})`;
        ctx.fill();
      }
    };

    const loop = () => {
      draw();
      frame = requestAnimationFrame(loop);
    };

    resize();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) {
      draw();
    } else {
      frame = requestAnimationFrame(loop);
    }

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
