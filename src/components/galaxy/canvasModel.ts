import type { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";
import type { GalaxyEdgeDTO, GalaxyNodeDTO } from "@/lib/dto";

export type CanvasNode = GalaxyNodeDTO & SimulationNodeDatum;
export type CanvasLink = SimulationLinkDatum<CanvasNode> &
  Omit<GalaxyEdgeDTO, "source" | "target"> & {
    source: string | CanvasNode;
    target: string | CanvasNode;
  };
export type Transform = { x: number; y: number; k: number };

export const MIN_ZOOM = 0.45;
export const MAX_ZOOM = 3;

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function nodeRadius(node: GalaxyNodeDTO) {
  return node.kind === "genre"
    ? 18 + Math.min(22, Math.sqrt(node.weight) * 4)
    : 11 + Math.min(15, Math.sqrt(node.weight) * 4);
}

export function staticLayout(nodes: CanvasNode[], width: number, height: number) {
  const genres = nodes.filter((node) => node.kind === "genre");
  const artists = nodes.filter((node) => node.kind === "artist");
  const centerX = width / 2;
  const centerY = height / 2;
  const inner = Math.min(width, height) * 0.2;
  const outer = Math.min(width, height) * 0.38;
  genres.forEach((node, index) => {
    const angle = (index / Math.max(1, genres.length)) * Math.PI * 2 - Math.PI / 2;
    node.x = centerX + Math.cos(angle) * inner;
    node.y = centerY + Math.sin(angle) * inner;
  });
  artists.forEach((node, index) => {
    const jitter = ((hash(node.id) % 1000) / 1000 - 0.5) * 0.16;
    const angle = (index / Math.max(1, artists.length)) * Math.PI * 2 + jitter;
    const band = outer * (0.82 + ((hash(`${node.id}:r`) % 100) / 100) * 0.28);
    node.x = centerX + Math.cos(angle) * band;
    node.y = centerY + Math.sin(angle) * band;
  });
}

export function fitTransform(nodes: CanvasNode[], width: number, height: number): Transform {
  const positioned = nodes.filter((node) => Number.isFinite(node.x) && Number.isFinite(node.y));
  if (positioned.length === 0) return { x: 0, y: 0, k: 1 };
  const xs = positioned.map((node) => node.x!);
  const ys = positioned.map((node) => node.y!);
  const minX = Math.min(...xs) - 55;
  const maxX = Math.max(...xs) + 55;
  const minY = Math.min(...ys) - 55;
  const maxY = Math.max(...ys) + 55;
  const k = Math.max(
    MIN_ZOOM,
    Math.min(1.15, (width - 40) / Math.max(1, maxX - minX), (height - 40) / Math.max(1, maxY - minY)),
  );
  return {
    k,
    x: width / 2 - ((minX + maxX) / 2) * k,
    y: height / 2 - ((minY + maxY) / 2) * k,
  };
}

export function drawGalaxy({
  context,
  nodes,
  links,
  images,
  hovered,
  selectedId,
  transform,
  width,
  height,
  dpr,
}: {
  context: CanvasRenderingContext2D;
  nodes: CanvasNode[];
  links: CanvasLink[];
  images: Map<string, HTMLImageElement>;
  hovered: CanvasNode | null;
  selectedId: string | null;
  transform: Transform;
  width: number;
  height: number;
  dpr: number;
}) {
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#0d0b14";
  context.fillRect(0, 0, width, height);
  context.save();
  context.translate(transform.x, transform.y);
  context.scale(transform.k, transform.k);

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  for (const link of links) {
    const source =
      typeof link.source === "string" ? nodeById.get(link.source) : link.source;
    const target =
      typeof link.target === "string" ? nodeById.get(link.target) : link.target;
    if (source?.x === undefined || source.y === undefined || target?.x === undefined || target.y === undefined) continue;
    context.beginPath();
    context.moveTo(source.x, source.y);
    context.lineTo(target.x, target.y);
    context.lineWidth = (link.kind === "genre-artist" ? 0.8 : 0.45) / transform.k;
    context.strokeStyle = link.kind === "genre-artist" ? "rgba(169,159,196,0.18)" : "rgba(34,211,238,0.08)";
    context.stroke();
  }

  for (const node of nodes) {
    const x = node.x ?? width / 2;
    const y = node.y ?? height / 2;
    const radius = nodeRadius(node);
    if (node.kind === "genre") {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.lineWidth = 1.5 / transform.k;
      context.strokeStyle = "rgba(139,92,246,0.58)";
      context.stroke();
      context.beginPath();
      context.arc(x, y, Math.max(3, radius * 0.16), 0, Math.PI * 2);
      context.fillStyle = "rgba(139,92,246,0.65)";
      context.fill();
      context.font = `${Math.max(10, 11 / transform.k)}px var(--font-space-grotesk), sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "top";
      context.fillStyle = "rgba(242,239,255,0.82)";
      context.fillText(node.label, x, y + radius + 7 / transform.k);
      continue;
    }

    context.save();
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.clip();
    const image = node.imageUrl ? images.get(node.imageUrl) : undefined;
    if (image?.complete && image.naturalWidth > 0) {
      context.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
    } else {
      const hue = 185 + (hash(node.id) % 95);
      context.fillStyle = `hsl(${hue} 48% 34%)`;
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      context.fillStyle = "rgba(242,239,255,0.92)";
      context.font = `600 ${Math.max(11, radius * 0.78)}px var(--font-space-grotesk), sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(node.label.slice(0, 1).toUpperCase(), x, y + 1);
    }
    context.restore();
    context.beginPath();
    context.arc(x, y, radius + (selectedId === node.id ? 3 : 0), 0, Math.PI * 2);
    context.lineWidth = (selectedId === node.id ? 2.5 : 1) / transform.k;
    context.strokeStyle = selectedId === node.id ? "#22d3ee" : "rgba(242,239,255,0.38)";
    context.stroke();
  }

  if (hovered?.x !== undefined && hovered.y !== undefined) {
    context.font = `500 ${13 / transform.k}px var(--font-space-grotesk), sans-serif`;
    const padding = 8 / transform.k;
    const textWidth = context.measureText(hovered.label).width;
    const boxHeight = 28 / transform.k;
    const boxX = hovered.x - textWidth / 2 - padding;
    const boxY = hovered.y - nodeRadius(hovered) - boxHeight - 8 / transform.k;
    context.fillStyle = "rgba(7,6,11,0.94)";
    context.fillRect(boxX, boxY, textWidth + padding * 2, boxHeight);
    context.fillStyle = "#f2efff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(hovered.label, hovered.x, boxY + boxHeight / 2);
  }
  context.restore();
}
