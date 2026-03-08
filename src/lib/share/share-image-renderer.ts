import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import QRCode from "qrcode";
import { formatRM } from "@/lib/utils/format";
import type { SummaryStats } from "@/lib/share/share-image-summary";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface StoryLayout {
  width: number;
  height: number;
  contentRect: Rect;
  radius: number;
}

interface FlowCursor {
  x: number;
  y: number;
  maxWidth: number;
}

interface TextDrawStyle {
  color: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
}

interface TypographyToken {
  size: number;
  weight: number;
  lineHeight: number;
}

interface StoryRendererState {
  ctx: CanvasRenderingContext2D;
  flow: FlowCursor;
  stats: SummaryStats;
  monthLabel: string;
  insightTokens: string[];
  illustrationUrl?: string;
}

interface InsightData {
  tokens: string[];
  illustrationUrl: string;
  illustrationSize?: {
    width: number;
    height: number;
    offsetY?: number;
  };
}

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
const FONT_STACK = "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";

const STORY_TOP_SAFE = 140;
const STORY_BOTTOM_SAFE = 180;
const STORY_SIDE_SAFE = 90;

const TYPE_SCALE = {
  displayXL: { size: 104, weight: 800, lineHeight: 112 },
  displayL: { size: 80, weight: 800, lineHeight: 88 },
  displayM: { size: 60, weight: 800, lineHeight: 68 },
  headingL: { size: 48, weight: 800, lineHeight: 56 },
  headingM: { size: 40, weight: 700, lineHeight: 48 },
  headingS: { size: 28, weight: 700, lineHeight: 32 },
  bodyL: { size: 28, weight: 600, lineHeight: 32 },
  bodyM: { size: 24, weight: 500, lineHeight: 32 },
  label: { size: 20, weight: 700, lineHeight: 28 },
  caption: { size: 22, weight: 400, lineHeight: 28 },
} satisfies Record<string, TypographyToken>;

const SPACING = {
  s8: 8,
  s16: 16,
  s24: 24,
  s32: 32,
  s48: 48,
  s64: 64,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampToByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashToSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function addGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number,
  amount = 0.026,
): void {
  const downscale = 2;
  const noiseWidth = Math.max(1, Math.floor(width / downscale));
  const noiseHeight = Math.max(1, Math.floor(height / downscale));
  const offscreen = createCanvas(noiseWidth, noiseHeight);
  const noiseCtx = offscreen.getContext("2d");

  const imageData = noiseCtx.createImageData(noiseWidth, noiseHeight);
  const pixels = imageData.data;
  const step = 2;

  for (let y = 0; y < noiseHeight; y += step) {
    for (let x = 0; x < noiseWidth; x += step) {
      const delta = (rng() - 0.5) * 255 * amount;
      for (let yy = 0; yy < step; yy += 1) {
        const py = y + yy;
        if (py >= noiseHeight) continue;
        for (let xx = 0; xx < step; xx += 1) {
          const px = x + xx;
          if (px >= noiseWidth) continue;
          const idx = (py * noiseWidth + px) * 4;
          pixels[idx] = clampToByte(126 + delta);
          pixels[idx + 1] = clampToByte(126 + delta);
          pixels[idx + 2] = clampToByte(126 + delta);
          pixels[idx + 3] = 255;
        }
      }
    }
  }

  noiseCtx.putImageData(imageData, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.drawImage(offscreen as unknown as CanvasImageSource, 0, 0, width, height);
  ctx.restore();
}

function hexToRgb(hexColor: string): { r: number; g: number; b: number } {
  const hex = hexColor.replace("#", "").trim();
  const normalized = hex.length === 3
    ? hex
      .split("")
      .map((part) => `${part}${part}`)
      .join("")
    : hex;
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function toRgba(hexColor: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hexColor);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clipOutsideRect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rect: Rect,
  radius: number,
): void {
  const r = Math.min(radius, rect.w / 2, rect.h / 2);
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.moveTo(rect.x + r, rect.y);
  ctx.arcTo(rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h, r);
  ctx.arcTo(rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h, r);
  ctx.arcTo(rect.x, rect.y + rect.h, rect.x, rect.y, r);
  ctx.arcTo(rect.x, rect.y, rect.x + rect.w, rect.y, r);
  ctx.closePath();
  ctx.clip("evenodd");
}

function drawBatikRibbon(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number,
  colors: [string, string],
): void {
  const startX = width * (-0.22 + rng() * 0.08);
  const startY = height * (0.18 + rng() * 0.18);
  const endX = width * (0.98 + rng() * 0.14);
  const endY = height * (0.52 + rng() * 0.24);
  const ctrl1X = width * (0.2 + rng() * 0.16);
  const ctrl1Y = height * (0.05 + rng() * 0.14);
  const ctrl2X = width * (0.6 + rng() * 0.15);
  const ctrl2Y = height * (0.66 + rng() * 0.14);
  const ribbonWidth = height * (0.11 + rng() * 0.06);

  ctx.save();
  const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
  gradient.addColorStop(0, toRgba(colors[0], 0.22));
  gradient.addColorStop(1, toRgba(colors[1], 0.24));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = gradient;
  ctx.lineWidth = ribbonWidth;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, endX, endY);
  ctx.stroke();

  const edge = ctx.createLinearGradient(startX, startY, endX, endY);
  edge.addColorStop(0, toRgba("#F2E9E4", 0.2));
  edge.addColorStop(1, toRgba("#FFD166", 0.16));
  ctx.strokeStyle = edge;
  ctx.lineWidth = ribbonWidth * 0.24;
  ctx.stroke();
  ctx.restore();
}

function drawSongketWeave(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number,
  corner: "top-left" | "bottom-right",
): void {
  const patchW = width * 0.32;
  const patchH = height * 0.26;
  const step = 18 + Math.floor(rng() * 5);
  const lineColorA = toRgba("#F2E9E4", 0.06);
  const lineColorB = toRgba("#6B4F3F", 0.08);

  ctx.save();
  ctx.beginPath();
  if (corner === "bottom-right") {
    ctx.moveTo(width, height - patchH);
    ctx.lineTo(width, height);
    ctx.lineTo(width - patchW, height);
  } else {
    ctx.moveTo(0, 0);
    ctx.lineTo(patchW, 0);
    ctx.lineTo(0, patchH);
  }
  ctx.closePath();
  ctx.clip();

  for (let i = -patchH; i < patchW + patchH; i += step) {
    const x0 = corner === "bottom-right" ? width - patchW + i : i;
    const y0 = corner === "bottom-right" ? height - patchH : 0;
    const x1 = corner === "bottom-right" ? width + i : patchW + i;
    const y1 = corner === "bottom-right" ? height : patchH;
    ctx.strokeStyle = (Math.floor(i / step) % 2 === 0) ? lineColorA : lineColorB;
    ctx.lineWidth = 1 + (rng() > 0.8 ? 0.5 : 0);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMutedArc(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number,
  color: string,
): void {
  const fromTopRight = rng() > 0.5;
  const cx = fromTopRight ? width * 0.94 : width * 0.06;
  const cy = fromTopRight ? height * 0.12 : height * 0.88;
  const radius = width * (0.22 + rng() * 0.1);
  const start = fromTopRight ? Math.PI * 0.9 : Math.PI * 0.05;
  const end = fromTopRight ? Math.PI * 1.52 : Math.PI * 0.62;
  const gradient = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  gradient.addColorStop(0, toRgba(color, 0.14));
  gradient.addColorStop(1, toRgba("#F2E9E4", 0.22));

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 7 + rng() * 5;
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.36;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, end);
  ctx.stroke();
  ctx.restore();
}

function drawCornerDots(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number,
): void {
  const corners = [
    { x: width * 0.08, y: height * 0.12, w: width * 0.14, h: height * 0.16 },
    { x: width * 0.8, y: height * 0.78, w: width * 0.14, h: height * 0.16 },
  ];
  corners.forEach((corner) => {
    const step = 22 + Math.floor(rng() * 4);
    for (let y = corner.y; y <= corner.y + corner.h; y += step) {
      for (let x = corner.x; x <= corner.x + corner.w; x += step) {
        ctx.fillStyle = toRgba("#F2E9E4", 0.02 + rng() * 0.01);
        ctx.beginPath();
        ctx.arc(x + rng() * 2, y + rng() * 2, 1.2 + rng() * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed: number,
  contentRect: Rect,
  themeIndex: number = 0,
): void {
  const rng = mulberry32(seed);

  const themes = [
    {
      base: ["#2B1B17", "#120B09"],
      accentPairs: [["#FF6B35", "#F7C59F"], ["#E24E1B", "#F7C59F"]] as [string, string][],
      arcColor: "#FF6B35",
    },
    {
      base: ["#142F20", "#09170D"],
      accentPairs: [["#2A9D8F", "#E9C46A"], ["#264653", "#F4A261"]] as [string, string][],
      arcColor: "#E9C46A",
    },
    {
      base: ["#3A1215", "#140506"],
      accentPairs: [["#E63946", "#F1FAEE"], ["#D62828", "#F77F00"]] as [string, string][],
      arcColor: "#E63946",
    },
    {
      base: ["#1D1128", "#0B0612"],
      accentPairs: [["#7B2CBF", "#E0AAFF"], ["#5A189A", "#FF9E00"]] as [string, string][],
      arcColor: "#C77DFF",
    },
  ];

  const theme = themes[themeIndex % themes.length];

  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, theme.base[0]);
  base.addColorStop(1, theme.base[1]);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const topShade = ctx.createLinearGradient(0, 0, width, 0);
  topShade.addColorStop(0, "rgba(255, 255, 255, 0.02)");
  topShade.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  clipOutsideRect(ctx, width, height, contentRect, 48);
  ctx.globalAlpha = 0.6;
  drawBatikRibbon(ctx, width, height, rng, theme.accentPairs[Math.floor(rng() * theme.accentPairs.length)]);
  drawSongketWeave(ctx, width, height, rng, rng() > 0.45 ? "bottom-right" : "top-left");
  drawMutedArc(ctx, width, height, rng, theme.arcColor);
  drawCornerDots(ctx, width, height, rng);
  ctx.restore();

  const contentDarkening = ctx.createLinearGradient(0, contentRect.y, 0, contentRect.y + contentRect.h);
  contentDarkening.addColorStop(0, "rgba(0,0,0,0.10)");
  contentDarkening.addColorStop(0.5, "rgba(0,0,0,0.13)");
  contentDarkening.addColorStop(1, "rgba(0,0,0,0.15)");
  ctx.save();
  roundRectPath(ctx, contentRect.x, contentRect.y, contentRect.w, contentRect.h, 46);
  ctx.fillStyle = contentDarkening;
  ctx.fill();
  ctx.restore();

  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.25,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.8,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  addGrain(ctx, width, height, rng, 0.018);
}

export function truncateToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "...";
  let next = text;
  while (next.length > 0 && ctx.measureText(`${next}${ellipsis}`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}${ellipsis}`;
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): { lines: string[]; truncated: boolean } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: [""], truncated: false };

  const lines: string[] = [];
  let current = "";
  let truncated = false;

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (!current) {
      current = truncateToWidth(ctx, word, maxWidth);
      truncated = current.endsWith("...");
    }
    lines.push(current);
    current = word;

    if (lines.length === maxLines) {
      lines[maxLines - 1] = truncateToWidth(ctx, lines[maxLines - 1], maxWidth);
      return { lines, truncated: true };
    }
  }

  if (current) {
    lines.push(current);
  }
  if (lines.length > maxLines) {
    truncated = true;
    lines.length = maxLines;
  }
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = truncateToWidth(ctx, lines[maxLines - 1], maxWidth);
    truncated = true;
  }
  return { lines, truncated };
}

function getStoryLayout(): StoryLayout {
  const contentRect: Rect = {
    x: STORY_SIDE_SAFE,
    y: STORY_TOP_SAFE,
    w: STORY_WIDTH - STORY_SIDE_SAFE * 2,
    h: STORY_HEIGHT - STORY_TOP_SAFE - STORY_BOTTOM_SAFE,
  };

  return {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    contentRect,
    radius: 46,
  };
}

function layoutTextFlow(contentRect: Rect, insetX = 28, insetTop = 30): FlowCursor {
  return {
    x: contentRect.x + insetX,
    y: contentRect.y + insetTop,
    maxWidth: contentRect.w - insetX * 2,
  };
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  style: TextDrawStyle,
  maxLines = 1,
): number {
  ctx.font = `${style.fontWeight} ${Math.round(style.fontSize)}px ${FONT_STACK}`;
  ctx.fillStyle = style.color;
  ctx.textAlign = "left";
  const wrapped = wrapText(ctx, text, maxWidth, maxLines);
  wrapped.lines.forEach((line) => {
    ctx.fillText(line, x, y + style.fontSize);
    y += style.lineHeight;
  });
  return y;
}

export function drawValue(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  style: TextDrawStyle,
): number {
  ctx.font = `${style.fontWeight} ${Math.round(style.fontSize)}px ${FONT_STACK}`;
  ctx.fillStyle = style.color;
  ctx.textAlign = "left";
  const fitted = truncateToWidth(ctx, text, maxWidth);
  ctx.fillText(fitted, x, y + style.fontSize);
  return y + style.lineHeight;
}

export function drawDivider(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
): number {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
  ctx.restore();
  return y + 16;
}

export function renderMainPanel(
  ctx: CanvasRenderingContext2D,
  panelRect: Rect,
  radius: number,
): void {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  roundRectPath(ctx, panelRect.x, panelRect.y, panelRect.w, panelRect.h, radius);
  ctx.fillStyle = "rgba(20, 10, 5, 0.64)";
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, panelRect.x, panelRect.y, panelRect.w, panelRect.h, radius);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, panelRect.x, panelRect.y, panelRect.w, panelRect.h, radius);
  ctx.clip();
  const topHighlight = ctx.createLinearGradient(0, panelRect.y, 0, panelRect.y + panelRect.h * 0.45);
  topHighlight.addColorStop(0, "rgba(255, 255, 255, 0.12)");
  topHighlight.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = topHighlight;
  ctx.fillRect(panelRect.x, panelRect.y, panelRect.w, panelRect.h * 0.45);
  ctx.restore();
}

export function renderHook(state: StoryRendererState, y: number): number {
  const { ctx, flow, stats } = state;
  let cursor = y;

  cursor = drawLabel(ctx, "I thought my subscriptions were cheap.", flow.x, cursor, flow.maxWidth, {
    color: "rgba(255,255,255,0.7)",
    fontSize: TYPE_SCALE.bodyL.size,
    fontWeight: TYPE_SCALE.bodyL.weight,
    lineHeight: TYPE_SCALE.bodyL.lineHeight,
  });
  cursor += SPACING.s8;

  cursor = drawValue(ctx, formatRM(stats.yearlyProjection), flow.x, cursor, flow.maxWidth, {
    color: "rgba(244, 197, 106, 1)",
    fontSize: TYPE_SCALE.displayXL.size,
    fontWeight: TYPE_SCALE.displayXL.weight,
    lineHeight: TYPE_SCALE.displayXL.lineHeight,
  });

  cursor -= SPACING.s8;
  cursor = drawLabel(ctx, "spent last year", flow.x, cursor, flow.maxWidth, {
    color: "rgba(244, 197, 106, 0.8)",
    fontSize: TYPE_SCALE.headingS.size,
    fontWeight: TYPE_SCALE.headingS.weight,
    lineHeight: TYPE_SCALE.headingS.lineHeight,
  });

  return cursor;
}

export function renderInsight(state: StoryRendererState, y: number): number {
  const { ctx, flow, insightTokens } = state;
  let cursor = y;

  cursor = drawLabel(ctx, insightTokens[0], flow.x, cursor, flow.maxWidth, {
    color: "rgba(255,255,255,1)",
    fontSize: TYPE_SCALE.displayM.size,
    fontWeight: TYPE_SCALE.displayM.weight,
    lineHeight: TYPE_SCALE.displayM.lineHeight,
  }, 2);

  if (insightTokens[1]) {
    cursor = drawLabel(ctx, insightTokens[1], flow.x, cursor, flow.maxWidth, {
      color: "rgba(255,255,255,0.7)",
      fontSize: TYPE_SCALE.bodyL.size,
      fontWeight: TYPE_SCALE.bodyL.weight,
      lineHeight: TYPE_SCALE.bodyL.lineHeight,
    });
  }

  return cursor;
}

export function renderTopList(state: StoryRendererState, y: number): number {
  const { ctx, flow, stats } = state;
  let cursor = y;

  cursor = drawDivider(ctx, flow.x, cursor, flow.maxWidth);
  cursor += SPACING.s16;
  cursor += SPACING.s16;

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `${TYPE_SCALE.headingS.weight} ${TYPE_SCALE.headingS.size}px ${FONT_STACK}`;
  ctx.fillText("My most expensive mistakes!", flow.x, cursor + TYPE_SCALE.headingS.size);

  cursor += TYPE_SCALE.headingS.lineHeight + SPACING.s24;

  const rowHeight = 44;
  const amountX = flow.x + flow.maxWidth;
  const maxNameWidth = flow.maxWidth - 200;
  const subscriptions = stats.topSubscriptions.slice(0, 4);

  if (subscriptions.length === 0) {
    drawLabel(ctx, "No subscription charges recorded this month.", flow.x, cursor, flow.maxWidth, {
      color: "rgba(255,255,255,0.62)",
      fontSize: TYPE_SCALE.bodyM.size,
      fontWeight: TYPE_SCALE.bodyM.weight,
      lineHeight: TYPE_SCALE.bodyM.lineHeight,
    }, 2);
    return cursor + 60;
  }

  subscriptions.forEach((subscription, index) => {
    const rowY = cursor + index * rowHeight;
    const amount = formatRM(subscription.amount * 12);

    ctx.textAlign = "left";
    ctx.font = `${TYPE_SCALE.bodyL.weight} ${TYPE_SCALE.bodyL.size}px ${FONT_STACK}`;
    const name = truncateToWidth(ctx, subscription.name, maxNameWidth);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(name, flow.x, rowY + TYPE_SCALE.bodyL.size);

    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.textAlign = "right";
    ctx.fillText(`${amount} / yr`, amountX, rowY + TYPE_SCALE.bodyL.size);
  });
  ctx.textAlign = "left";

  return cursor + subscriptions.length * rowHeight;
}

async function drawIllustration(
  ctx: CanvasRenderingContext2D,
  url: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<void> {
  try {
    const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    const imgBuffer = readFileSync(filePath);
    const img = await loadImage(imgBuffer);
    ctx.drawImage(img as unknown as CanvasImageSource, x, y, width, height);
  } catch (err) {
    console.warn("[share-image] illustration load failed:", url, err);
  }
}

async function drawQRCode(
  ctx: CanvasRenderingContext2D,
  url: string,
  x: number,
  y: number,
  size: number,
): Promise<void> {
  try {
    const buffer = await QRCode.toBuffer(url, {
      width: size,
      margin: 1,
      color: { dark: "#FFFFFF", light: "#00000000" },
      type: "png",
    });
    const img = await loadImage(buffer);
    ctx.drawImage(img as unknown as CanvasImageSource, x, y, size, size);
  } catch {
    // Keep rendering if QR creation fails.
  }
}

export async function renderFooter(state: StoryRendererState, y: number): Promise<number> {
  const { ctx, flow } = state;
  let cursor = y;

  const qrSize = 130;
  const qrX = flow.x + flow.maxWidth - qrSize + 10;
  const qrY = cursor;

  const textTotalHeight = TYPE_SCALE.bodyL.lineHeight + TYPE_SCALE.headingS.lineHeight;
  const textOffsetY = cursor + Math.max(0, (qrSize - textTotalHeight) / 2);

  cursor = drawLabel(ctx, "Check YOUR subscription damage", flow.x, textOffsetY, flow.maxWidth - qrSize - 16, {
    color: "rgba(255,255,255,0.9)",
    fontSize: TYPE_SCALE.bodyL.size,
    fontWeight: TYPE_SCALE.bodyL.weight,
    lineHeight: TYPE_SCALE.bodyL.lineHeight,
  }, 2);

  cursor += SPACING.s8;
  cursor = drawLabel(ctx, "langgancheck.my", flow.x, cursor, flow.maxWidth - qrSize, {
    color: "rgba(244, 197, 106, 0.9)",
    fontSize: Math.round(TYPE_SCALE.headingS.size * 0.9),
    fontWeight: TYPE_SCALE.headingS.weight,
    lineHeight: TYPE_SCALE.headingS.lineHeight,
  });

  await drawQRCode(ctx, "https://langgancheck.my", qrX, qrY, qrSize);

  return Math.max(cursor, qrY + qrSize);
}

export function renderCategoryBreakdown(state: StoryRendererState, y: number): number {
  const { ctx, flow, stats } = state;
  let cursor = y;

  if (stats.categoryBreakdown.length === 0) return cursor;

  cursor = drawLabel(ctx, "Subscriptions breakdown", flow.x, cursor, flow.maxWidth, {
    color: "rgba(255,255,255,0.7)",
    fontSize: TYPE_SCALE.bodyL.size,
    fontWeight: TYPE_SCALE.bodyL.weight,
    lineHeight: TYPE_SCALE.bodyL.lineHeight,
  });
  cursor += SPACING.s16;

  const maxBarWidth = flow.maxWidth * 0.55;
  const barHeight = 12;
  const rowSpacing = 32;

  stats.categoryBreakdown.forEach((entry, idx) => {
    const pct = Math.round(entry.percentage);
    const barW = Math.max(maxBarWidth * (pct / 100), 8);

    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, flow.x, cursor + (rowSpacing - barHeight) / 2, barW, barHeight, 6);
    ctx.fillStyle = idx === 0 ? "rgba(244, 197, 106, 0.9)" : "rgba(255,255,255,0.4)";
    ctx.fill();
    ctx.restore();

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = `${TYPE_SCALE.bodyM.weight} ${Math.round(TYPE_SCALE.bodyM.size)}px ${FONT_STACK}`;
    const labelX = flow.x + maxBarWidth + SPACING.s24;
    const name = entry.name === "other"
      ? "Productivity / AI tools"
      : `${entry.name.charAt(0).toUpperCase()}${entry.name.slice(1)}`;
    ctx.fillText(`${pct}% ${name}`, labelX, cursor + rowSpacing * 0.7);

    cursor += rowSpacing;
  });

  return cursor;
}

export function getLocalizedInsight(yearlyProjection: number): InsightData {
  const minWage = 4000;
  if (yearlyProjection >= minWage * 2) {
    const nasiLemak = Math.floor(yearlyProjection / 3);
    const years = (nasiLemak / 365).toFixed(1).replace(".0", "");
    return {
      tokens: [
        `That's ${nasiLemak.toLocaleString()} NASI LEMAK`,
        `Could've eaten nasi lemak every day for ${years} years.`,
      ],
      illustrationUrl: "/nasi-lemak.png",
      illustrationSize: {
        width: 470,
        height: 370,
        offsetY: 70,
      },
    };
  }
  if (yearlyProjection >= minWage) {
    const nasiKerabu = Math.floor(yearlyProjection / 6);
    const months = (nasiKerabu / 30).toFixed(1).replace(".0", "");
    return {
      tokens: [
        `That's ${nasiKerabu.toLocaleString()} NASI KERABU`,
        `Could've eaten nasi kerabu every day for ${months} months.`,
      ],
      illustrationUrl: "/nasi-kerabu.png",
      illustrationSize: {
        width: 430,
        height: 340,
        offsetY: 76,
      },
    };
  }
  if (yearlyProjection >= minWage / 2) {
    const ayamGoreng = Math.floor(yearlyProjection / 7);
    const weeks = (ayamGoreng / 7).toFixed(1).replace(".0", "");
    return {
      tokens: [
        `That's ${ayamGoreng.toLocaleString()} AYAM GORENG`,
        `Could've eaten ayam goreng every day for ${weeks} weeks.`,
      ],
      illustrationUrl: "/ayam-goreng.png",
      illustrationSize: {
        width: 390,
        height: 320,
        offsetY: 80,
      },
    };
  }
  if (yearlyProjection > 0) {
    const tehTarik = Math.floor(yearlyProjection / 2);
    const weeks = (tehTarik / 7).toFixed(1).replace(".0", "");
    return {
      tokens: [
        `That's ${tehTarik.toLocaleString()} TEH TARIK`,
        `Could've drank teh tarik every day for ${weeks} weeks.`,
      ],
      illustrationUrl: "/teh-tarik.png",
      illustrationSize: {
        width: 250,
        height: 280,
        offsetY: 86,
      },
    };
  }
  return {
    tokens: [
      "NO DAMAGE YET",
      "Add your subscriptions to see the damage.",
    ],
    illustrationUrl: "/nasi-lemak.png",
    illustrationSize: {
      width: 420,
      height: 330,
      offsetY: 74,
    },
  };
}

export async function renderStoryCard(
  monthLabel: string,
  stats: SummaryStats,
  themeIndex: number,
): Promise<Buffer> {
  const layout = getStoryLayout();
  const canvas = createCanvas(layout.width, layout.height);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

  const warmthBucket = clamp(Math.round((stats.monthlyTotal / 550) * 255), 0, 255);
  const seedInput = [
    monthLabel,
    "story",
    stats.monthlyTotal.toFixed(2),
    stats.yearlyProjection.toFixed(2),
    String(stats.activeItemCount),
  ].join("|");
  const baseSeed = hashToSeed(seedInput);
  const seed = (baseSeed & 0x00ffffff) | (warmthBucket << 24);
  renderBackground(ctx, layout.width, layout.height, seed, layout.contentRect, themeIndex);
  renderMainPanel(ctx, layout.contentRect, layout.radius);

  const flow = layoutTextFlow(layout.contentRect, 48, 48);
  const insight = getLocalizedInsight(stats.yearlyProjection);

  const rendererState: StoryRendererState = {
    ctx,
    flow,
    stats,
    monthLabel,
    insightTokens: insight.tokens,
    illustrationUrl: insight.illustrationUrl,
  };

  let y = flow.y;
  y = renderHook(rendererState, y);

  const defaultIllustration = { width: 450, height: 355, offsetY: 75 };
  const illustrationWidth = insight.illustrationSize?.width ?? defaultIllustration.width;
  const illustrationHeight = insight.illustrationSize?.height ?? defaultIllustration.height;
  const illustrationOffsetY = insight.illustrationSize?.offsetY ?? defaultIllustration.offsetY;
  const illustrationX = flow.x + (flow.maxWidth - illustrationWidth) / 2;
  const illustrationY = y + illustrationOffsetY;

  await drawIllustration(
    ctx,
    insight.illustrationUrl || "/nasi-lemak.png",
    illustrationX,
    illustrationY,
    illustrationWidth,
    illustrationHeight,
  );

  y += 450;
  y = renderInsight(rendererState, y);
  y += SPACING.s48;
  y = renderCategoryBreakdown(rendererState, y);
  y += SPACING.s48;
  y = renderTopList(rendererState, y);

  const footerHeight = Math.max(TYPE_SCALE.bodyL.lineHeight + TYPE_SCALE.headingS.lineHeight, 160);
  const footerBaseline = layout.contentRect.y + layout.contentRect.h - (footerHeight + SPACING.s32);
  const footerY = Math.max(y + SPACING.s48, footerBaseline);
  await renderFooter(rendererState, footerY);

  return canvas.toBuffer("image/png");
}
