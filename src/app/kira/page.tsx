import type { Metadata } from "next";
import { Suspense } from "react";
import { KiraCalculator } from "@/components/kira/calculator";

export const metadata: Metadata = {
  title: "Berapa Aku Habis? — Subscription Calculator | LangganCheck",
  description:
    "Kira berapa kau habis untuk subscriptions setiap bulan. Netflix, Spotify, ChatGPT, Maxis — tap to add, see your total. No sign-up needed.",
  openGraph: {
    title: "Berapa Aku Habis? — Subscription Calculator",
    description:
      "Tap your subscriptions. See how much you actually spend per month & year. Share with friends!",
    type: "website",
  },
};

export default function KiraPage() {
  return (
    <Suspense>
      <KiraCalculator />
    </Suspense>
  );
}
