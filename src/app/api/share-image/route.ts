import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { rateLimit } from "@/lib/infra/rate-limit";
import { getOccurrencesForMonth } from "@/lib/domain/schedule";
import { getItemsByUserId } from "@/lib/services/item.service";
import { renderStoryCard } from "@/lib/share/share-image-renderer";
import { computeSummaryStats, toMonthLabel } from "@/lib/share/share-image-summary";

export const runtime = "nodejs";

function parseMonth(value: string | null): { year: number; monthIdx: number } {
  if (!value) {
    throw new Error("Missing month parameter. Expected YYYY-MM.");
  }

  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error("Invalid month format. Expected YYYY-MM.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid year in month parameter.");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid month in month parameter.");
  }

  return { year, monthIdx: month - 1 };
}

function parseTheme(value: string | null): number {
  const parsed = Number(value ?? "0");
  if (!Number.isFinite(parsed)) return 0;
  const normalized = Math.floor(parsed);
  if (normalized < 0) return 0;
  return normalized;
}

function errorStatus(error: unknown): number {
  if (!(error instanceof Error)) return 500;
  if (error.message === "Unauthorized") return 401;
  if (error.message.includes("Too many requests")) return 429;
  if (error.message.includes("month")) return 400;
  return 500;
}

export async function GET(req: NextRequest, _context: { params: Promise<Record<string, string>> }): Promise<Response> {
  try {
    const user = await requireAuth();
    rateLimit(`${user.id}:shareImage`, 5);

    const { searchParams } = req.nextUrl;
    const { year, monthIdx } = parseMonth(searchParams.get("month"));
    const theme = parseTheme(searchParams.get("theme"));

    const items = await getItemsByUserId(user.id);
    const occurrences = getOccurrencesForMonth(items, year, monthIdx);
    const stats = computeSummaryStats(items, occurrences);

    const monthDate = new Date(year, monthIdx, 1);
    const monthLabel = toMonthLabel(monthDate);
    const pngBuffer = await renderStoryCard(monthLabel, stats, theme);

    return new Response(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    const status = errorStatus(error);
    const message = status === 500
      ? "Failed to generate share image."
      : error instanceof Error
        ? error.message
        : "Request failed.";

    return Response.json({ error: message }, { status });
  }
}
