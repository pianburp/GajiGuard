import { createAuthClient } from "better-auth/react";
import { oneTapClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    oneTapClient({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      cancelOnTapOutside: false,
      autoSelect: true,
      context: "signin",
      promptOptions: {
        // Use classic One Tap prompt mode to avoid FedCM-specific production issues.
        fedCM: false,
      },
    }),
  ],
});
