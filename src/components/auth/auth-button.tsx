"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";

// Google “G” logo as inline SVG to avoid layout quirks from external images.
function GoogleIcon({ className, width = 16, height = 16 }: { className?: string; width?: number; height?: number; }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.659 32.657 29.252 36 24 36c-6.627 0-12-5.373-12-12
         s5.373-12 12-12c3.059 0 5.842 1.154 7.965 3.035l5.657-5.657C34.053 6.053 29.268 4 24 4
         12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20
         c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 12 24 12
         c3.059 0 5.842 1.154 7.965 3.035l5.657-5.657
         C34.053 6.053 29.268 4 24 4
         16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.202 0 9.937-1.997 13.541-5.251
         l-6.261-5.288C29.211 34.91 26.715 36 24 36
         c-5.231 0-9.621-3.356-11.263-7.995
         l-6.52 5.025C9.522 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303
         c-1.077 3.046-3.318 5.559-6.023 6.96
         l.004-.003 6.261 5.288C39.912 36.147 44 30.621 44 24
         c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

/**
 * Auto-shows the Google One Tap prompt on mount for unauthenticated visitors.
 * Works like Notion — the prompt appears without the user clicking anything.
 */
export function OneTapPrompt() {
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || typeof authClient.oneTap !== "function") return;

    authClient.oneTap({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  }, []);

  return null;
}

export function AuthButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    // signIn.social triggers a full-page redirect to Google — no need to await.
    // One Tap is handled separately by OneTapPrompt in the layout.
    authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  return (
    <Button
      size="sm"
      variant="default"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="gap-2 bg-neutral-900 text-white hover:bg-neutral-800"
      id="google-signin-button"
    >
      <GoogleIcon className="h-4 w-4" width={16} height={16} />
      {isLoading ? "Signing in…" : "Google je!"}
    </Button>
  );
}
