"use client";

import { useEffect, useRef } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
} from "d3-force";
import type { GalaxyEdgeDTO, GalaxyNodeDTO } from "@/lib/dto";
import {
  drawGalaxy,
  fitTransform,
  MAX_ZOOM,
  MIN_ZOOM,
  nodeRadius,
  staticLayout,
  type CanvasLink,
  type CanvasNode,
  type Transform,
} from "@/components/galaxy/canvasModel";

export function GalaxyCanvas({
  nodes: inputNodes,
  edges: inputEdges,
  selectedArtistId,
  onSelectArtist,
}: {
  nodes: GalaxyNodeDTO[];
  edges: GalaxyEdgeDTO[];
  selectedArtistId: string | null;
  onSelectArtist: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<CanvasNode[]>([]);
  const linksRef = useRef<CanvasLink[]>([]);
  const simulationRef = useRef<Simulation<CanvasNode, CanvasLink> | null>(null);
  const transformRef = useRef<Transform>({ x: 0, y: 0, k: 1 });
  const dimensionsRef = useRef({ width: 1, height: 1, dpr: 1 });
  const pointerRef = useRef({ active: false, moved: false, id: -1, startX: 0, startY: 0, originX: 0, originY: 0 });
  const hoveredRef = useRef<CanvasNode | null>(null);
  const imagesRef = useRef(new Map<string, HTMLImageElement>());
  const frameRef = useRef<number | null>(null);
  const drawRef = useRef<() => void>(() => undefined);
  const selectedRef = useRef(selectedArtistId);

  useEffect(() => {
    selectedRef.current = selectedArtistId;
    drawRef.current();
  }, [selectedArtistId]);

  useEffect(() => {
    const canvasCandidate = canvasRef.current;
    if (!canvasCandidate) return;
    const contextCandidate = canvasCandidate.getContext("2d");
    if (!contextCandidate) return;
    const canvas: HTMLCanvasElement = canvasCandidate;
    const context: CanvasRenderingContext2D = contextCandidate;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const imageCache = imagesRef.current;
    nodesRef.current = inputNodes.map((node) => ({ ...node }));
    linksRef.current = inputEdges.map((edge) => ({ ...edge }));

    function scheduleDraw() {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        draw();
      });
    }

    function draw() {
      const { width, height, dpr } = dimensionsRef.current;
      drawGalaxy({
        context,
        nodes: nodesRef.current,
        links: linksRef.current,
        images: imageCache,
        hovered: hoveredRef.current,
        selectedId: selectedRef.current,
        transform: transformRef.current,
        width,
        height,
        dpr,
      });
    }
    drawRef.current = scheduleDraw;

    function fitGraph() {
      const { width, height } = dimensionsRef.current;
      transformRef.current = fitTransform(nodesRef.current, width, height);
    }

    function updateLayout() {
      simulationRef.current?.stop();
      simulationRef.current = null;
      const { width, height } = dimensionsRef.current;
      staticLayout(nodesRef.current, width, height);
      fitGraph();
      if (media.matches) {
        scheduleDraw();
        return;
      }
      const linkForce = forceLink<CanvasNode, CanvasLink>(linksRef.current)
        .id((node) => node.id)
        .distance((link) => link.kind === "genre-artist" ? 90 : 135)
        .strength((link) => link.kind === "genre-artist" ? 0.7 : Math.min(0.22, (link.weight ?? 1) * 0.05));
      simulationRef.current = forceSimulation<CanvasNode>(nodesRef.current)
        .force("link", linkForce)
        .force("charge", forceManyBody().strength(-130).distanceMax(380))
        .force("center", forceCenter(width / 2, height / 2))
        .force("collide", forceCollide<CanvasNode>().radius((node) => nodeRadius(node) + 10).iterations(2))
        .alphaDecay(0.035)
        .velocityDecay(0.35)
        .on("tick", scheduleDraw)
        .on("end", scheduleDraw);
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      dimensionsRef.current = { width, height, dpr };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      updateLayout();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    for (const node of nodesRef.current) {
      if (node.kind !== "artist" || !node.imageUrl || imagesRef.current.has(node.imageUrl)) continue;
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = scheduleDraw;
      image.onerror = scheduleDraw;
      image.src = node.imageUrl;
      imagesRef.current.set(node.imageUrl, image);
    }

    function pointerPosition(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    function hitTest(screenX: number, screenY: number) {
      const transform = transformRef.current;
      const x = (screenX - transform.x) / transform.k;
      const y = (screenY - transform.y) / transform.k;
      let hit: CanvasNode | null = null;
      for (const node of nodesRef.current) {
        const distance = Math.hypot(x - (node.x ?? 0), y - (node.y ?? 0));
        if (distance <= nodeRadius(node) + 4 / transform.k) hit = node;
      }
      return hit;
    }
    function onPointerDown(event: PointerEvent) {
      const point = pointerPosition(event);
      const transform = transformRef.current;
      pointerRef.current = { active: true, moved: false, id: event.pointerId, startX: point.x, startY: point.y, originX: transform.x, originY: transform.y };
      canvas.setPointerCapture(event.pointerId);
    }
    function onPointerMove(event: PointerEvent) {
      const point = pointerPosition(event);
      const pointer = pointerRef.current;
      if (pointer.active && pointer.id === event.pointerId) {
        const dx = point.x - pointer.startX;
        const dy = point.y - pointer.startY;
        if (Math.hypot(dx, dy) > 4) pointer.moved = true;
        if (pointer.moved) {
          transformRef.current = { ...transformRef.current, x: pointer.originX + dx, y: pointer.originY + dy };
          canvas.style.cursor = "grabbing";
          scheduleDraw();
        }
        return;
      }
      hoveredRef.current = hitTest(point.x, point.y);
      canvas.style.cursor = hoveredRef.current?.kind === "artist" ? "pointer" : "grab";
      scheduleDraw();
    }
    function onPointerUp(event: PointerEvent) {
      const pointer = pointerRef.current;
      const point = pointerPosition(event);
      if (pointer.active && !pointer.moved) {
        const hit = hitTest(point.x, point.y);
        if (hit?.kind === "artist") onSelectArtist(hit.id);
      }
      pointerRef.current.active = false;
      canvas.style.cursor = "grab";
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    }
    function onPointerLeave() {
      if (!pointerRef.current.active) {
        hoveredRef.current = null;
        scheduleDraw();
      }
    }
    function onPointerCancel(event: PointerEvent) {
      pointerRef.current.active = false;
      pointerRef.current.moved = false;
      hoveredRef.current = null;
      canvas.style.cursor = "grab";
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      scheduleDraw();
    }
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const current = transformRef.current;
      const nextK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.k * Math.exp(-event.deltaY * 0.0015)));
      const graphX = (point.x - current.x) / current.k;
      const graphY = (point.y - current.y) / current.k;
      transformRef.current = { k: nextK, x: point.x - graphX * nextK, y: point.y - graphY * nextK };
      scheduleDraw();
    }
    function onMotionChange() {
      updateLayout();
    }
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    media.addEventListener("change", onMotionChange);

    return () => {
      simulationRef.current?.stop();
      resizeObserver.disconnect();
      media.removeEventListener("change", onMotionChange);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      for (const image of imageCache.values()) {
        image.onload = null;
        image.onerror = null;
      }
      imageCache.clear();
    };
  }, [inputEdges, inputNodes, onSelectArtist]);

  function zoom(factor: number) {
    const { width, height } = dimensionsRef.current;
    const current = transformRef.current;
    const nextK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.k * factor));
    transformRef.current = {
      k: nextK,
      x: width / 2 - ((width / 2 - current.x) / current.k) * nextK,
      y: height / 2 - ((height / 2 - current.y) / current.k) * nextK,
    };
    drawRef.current();
  }

  function reset() {
    const { width, height } = dimensionsRef.current;
    transformRef.current = fitTransform(nodesRef.current, width, height);
    drawRef.current();
  }

  return (
    <div className="relative h-[min(68dvh,720px)] min-h-[500px] w-full">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="block size-full touch-none cursor-grab"
      />
      <div className="absolute left-3 top-3 flex flex-col gap-2" aria-label="Galaxy zoom controls">
        <button type="button" onClick={() => zoom(1.25)} aria-label="Zoom in" className="glass flex size-11 items-center justify-center rounded-md text-star hover:bg-space-3"><Plus className="size-5" aria-hidden /></button>
        <button type="button" onClick={() => zoom(0.8)} aria-label="Zoom out" className="glass flex size-11 items-center justify-center rounded-md text-star hover:bg-space-3"><Minus className="size-5" aria-hidden /></button>
        <button type="button" onClick={reset} aria-label="Reset galaxy view" className="glass flex size-11 items-center justify-center rounded-md text-star hover:bg-space-3"><RotateCcw className="size-4" aria-hidden /></button>
      </div>
      <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-void/80 px-3 py-2 text-xs text-stardust">
        Drag to pan · scroll to zoom · select a planet to open it
      </p>
    </div>
  );
}
