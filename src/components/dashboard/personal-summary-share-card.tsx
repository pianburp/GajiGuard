"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Palette, Share2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { computeSummaryStats, toMonthLabel } from "@/lib/share/share-image-summary";
import type { Item, Occurrence } from "@/lib/domain/types";

interface PersonalSummaryShareCardProps {
  items: Item[];
  occurrences: Occurrence[];
  monthDate: Date;
  includeDonationCta?: boolean;
}

function toFileMonthLabel(monthDate: Date): string {
  const year = monthDate.getFullYear();
  const month = String(monthDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function PersonalSummaryShareCard({
  items,
  occurrences,
  monthDate,
  includeDonationCta: _includeDonationCta = true,
}: PersonalSummaryShareCardProps) {
  const monthLabel = useMemo(() => toMonthLabel(monthDate), [monthDate]);
  const fileMonthLabel = useMemo(() => toFileMonthLabel(monthDate), [monthDate]);
  const stats = useMemo(() => computeSummaryStats(items, occurrences), [items, occurrences]);

  const hasData = stats.monthlyTotal > 0 || stats.activeItemCount > 0;
  const [themeIndex, setThemeIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [canShareImage, setCanShareImage] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const imageUrl = `/api/share-image?month=${fileMonthLabel}&theme=${themeIndex}`;

  useEffect(() => {
    if (typeof navigator === "undefined" || typeof File === "undefined") {
      setCanShareImage(false);
      return;
    }
    if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") {
      setCanShareImage(false);
      return;
    }

    try {
      const probe = new File(["x"], "probe.png", { type: "image/png" });
      setCanShareImage(navigator.canShare({ files: [probe] }));
    } catch {
      setCanShareImage(false);
    }
  }, []);

  const fetchSummaryFile = useCallback(async () => {
    const response = await fetch(imageUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to generate image.");
    }

    const blob = await response.blob();
    return new File([blob], `langgancheck-summary-${fileMonthLabel}-story.png`, {
      type: "image/png",
    });
  }, [fileMonthLabel, imageUrl]);

  const onDownload = useCallback(async () => {
    if (!hasData) return;
    setActionError(null);
    setIsBusy(true);

    try {
      const file = await fetchSummaryFile();
      const objectUrl = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setActionError("Failed to generate PNG. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }, [fetchSummaryFile, hasData]);

  const onShare = useCallback(async () => {
    if (!hasData || !canShareImage || typeof navigator.share !== "function") return;
    setActionError(null);
    setIsBusy(true);

    try {
      const file = await fetchSummaryFile();
      await navigator.share({
        title: `LangganCheck Summary - ${monthLabel}`,
        text: `My ${monthLabel} subscription summary from LangganCheck.`,
        files: [file],
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError") {
        setActionError("Image sharing failed on this browser. Try Download PNG.");
      }
    } finally {
      setIsBusy(false);
    }
  }, [canShareImage, fetchSummaryFile, hasData, monthLabel]);

  return (
    <>
      <Card className="h-full border flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Personal Summary Share</CardTitle>
          <CardDescription className="text-xs">
            Preview your personalized share image for {monthLabel} before sharing or downloading.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setThemeIndex((prev) => (prev + 1) % 4);
              setIsPreviewOpen(true);
              setIsImageLoading(true);
            }}
            disabled={!hasData}
          >
            Preview Summary
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Summary Preview</DialogTitle>
            <DialogDescription>
              Review your share image first, then share it or download PNG.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/30 p-3">
            {isImageLoading && (
              <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
                Rendering preview...
              </div>
            )}
            <img
              key={imageUrl}
              src={imageUrl}
              alt={`Personal summary story preview for ${monthLabel}`}
              className={`mx-auto max-h-[60vh] w-auto rounded-md border bg-background object-contain ${isImageLoading ? "hidden" : ""}`}
              onLoad={() => setIsImageLoading(false)}
              onError={() => {
                setIsImageLoading(false);
                setActionError("Failed to render preview. Please try again.");
              }}
            />
          </div>

          <DialogFooter className="sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  setActionError(null);
                  setIsImageLoading(true);
                  setThemeIndex((prev) => (prev + 1) % 4);
                }}
                disabled={isBusy}
              >
                <Palette className="h-3.5 w-3.5" />
                Cycle Theme
              </Button>
              <Button
                size="sm"
                onClick={onShare}
                disabled={isBusy || isImageLoading || !canShareImage}
                className="gap-1.5"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share Image
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onDownload}
              disabled={isBusy || isImageLoading}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download PNG
            </Button>
          </DialogFooter>

          {!canShareImage && (
            <p className="text-[11px] text-muted-foreground">
              Native image sharing is not available in this browser. Use Download PNG.
            </p>
          )}
          {actionError && <p className="text-[11px] text-destructive">{actionError}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
