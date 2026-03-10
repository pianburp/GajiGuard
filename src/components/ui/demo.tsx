"use client";

import { Component } from "@/components/ui/etheral-shadow";
import { AuthButton } from "@/components/auth/auth-button";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";

const DemoOne = () => {
  return (
    <main className="relative w-full overflow-hidden text-foreground selection:bg-primary/30">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Component
          color="rgba(128, 128, 128, 1)"
          animation={{ scale: 100, speed: 90 }}
          noise={{ opacity: 1, scale: 1.2 }}
          sizing="stretch"
          className="h-full w-full opacity-90"
        />
        {/* Subtle gradient overlay to smoothly transition to the background color at the bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/10 to-background/90" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full">
        {/* Hero Section */}
        <section className="relative flex min-h-screen w-full flex-col items-center justify-center px-6 pt-20 pb-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >

            <h1 className="max-w-4xl text-5xl font-bold tracking-light sm:text-6xl md:text-7xl lg:text-8xl">
              Track every <br className="hidden sm:block" /> subscription{" "}
              <span className="bg-clip-text bg-gradient-to-b from-foreground to-muted-foreground">
                before your wallet pokai lah
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg font-sm text-muted-foreground sm:text-xl leading-relaxed">
              A clean monthly view of what renews, what to cancel, and where your
              recurring spend is secretly growing. Senang je, no more headache.
            </p>
          </motion.div>

          {/* Animated scroll-down arrow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-12 cursor-pointer text-muted-foreground/50 hover:text-foreground transition-colors"
            onClick={() => {
              document
                .getElementById("cta-section")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            aria-label="Scroll down"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <ChevronDown className="h-8 w-8" />
            </motion.div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section
          id="cta-section"
          className="relative flex min-h-[50vh] w-full flex-1 items-center justify-center pt-24 pb-12"
        >
          {/* Subtle glow behind the CTA card */}
          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
            <div className="h-64 w-full rounded-full bg-foreground/5 blur-[120px]" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative z-10 w-full h-full"
          >
            <div className="group overflow-hidden bg-background/10 px-6 py-20 text-center shadow-none backdrop-blur-sm sm:px-16 sm:py-28 h-full flex flex-col justify-center">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Jom start with Google.
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
                Import your subscriptions and review your next renewal dates securely from your dashboard. Confirm safe one.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4">
                <div className="transform transition-transform hover:scale-105 active:scale-95">
                  <AuthButton />
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
};

export { DemoOne };
