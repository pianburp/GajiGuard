export type RecognizedSubscription = {
  name: string;
  domain: string;
};

export const RECOGNIZED_SUBSCRIPTIONS: RecognizedSubscription[] = [
  { name: "Netflix", domain: "netflix.com" },
  { name: "Spotify", domain: "spotify.com" },
  { name: "YouTube Premium", domain: "youtube.com" },
  { name: "Disney+", domain: "disneyplus.com" },
  { name: "Amazon Prime", domain: "primevideo.com" },
  { name: "Apple Music", domain: "music.apple.com" },
  { name: "iCloud+", domain: "icloud.com" },
  { name: "Microsoft 365", domain: "microsoft.com" },
  { name: "Canva Pro", domain: "canva.com" },
  { name: "Notion", domain: "notion.so" },
  { name: "ChatGPT Plus", domain: "openai.com" },
  { name: "Adobe Creative Cloud", domain: "adobe.com" },
  { name: "CapCut Pro", domain: "capcut.com" },
  { name: "Duolingo", domain: "duolingo.com" },
  { name: "Dropbox", domain: "dropbox.com" },
];

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export function getBrandfetchIconUrl(domain: string): string {
  return `https://cdn.brandfetch.io/${domain}/icon`;
}

export function findRecognizedSubscriptionByName(
  name: string,
): RecognizedSubscription | null {
  const normalized = normalizeName(name);
  return (
    RECOGNIZED_SUBSCRIPTIONS.find(
      (candidate) => normalizeName(candidate.name) === normalized,
    ) ?? null
  );
}
