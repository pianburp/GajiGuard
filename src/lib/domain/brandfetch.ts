import type { Category, ItemType } from "@/lib/domain/types";

export type RecognizedSubscription = {
  name: string;
  domain: string;
};

const SUBSCRIPTION_CATEGORY_BY_DOMAIN: Record<string, Category> = {
  "netflix.com": "entertainment",
  "disneyplus.com": "entertainment",
  "viu.com": "entertainment",
  "primevideo.com": "entertainment",
  "astroawani.com": "entertainment",
  "unifi.com.my": "utilities",
  "spotify.com": "entertainment",
  "apple.com": "entertainment",
  "youtube.com": "entertainment",
  "joox.com": "entertainment",
  "icloud.com": "utilities",
  "google.com": "utilities",
  "chatgpt.com": "education",
  "claude.ai": "education",
  "canva.com": "education",
  "notion.so": "utilities",
  "microsoft.com": "utilities",
  "adobe.com": "education",
  "atome.my": "shopping",
  "grab.com": "transport",
  "shopee.com.my": "shopping",
  "shopee.com": "shopping",
  "myboost.com.my": "shopping",
  "maxis.com.my": "utilities",
  "celcomdigi.com": "utilities",
  "u.com.my": "utilities",
  "time.com.my": "utilities",
};

export const RECOGNIZED_SUBSCRIPTIONS: RecognizedSubscription[] = [
  // Streaming
  { name: "Netflix", domain: "netflix.com" },
  { name: "Disney+", domain: "disneyplus.com" },
  { name: "Viu", domain: "viu.com" },
  { name: "Prime Video", domain: "primevideo.com" },
  { name: "Astro", domain: "astroawani.com" }, 
  { name: "Unifi TV", domain: "unifi.com.my" }, 

  // Music
  { name: "Spotify", domain: "spotify.com" },
  { name: "Apple Music", domain: "apple.com" },        
  { name: "YouTube Music", domain: "youtube.com" },  
  { name: "JOOX", domain: "joox.com" },               

  // Cloud / storage
  { name: "iCloud+", domain: "icloud.com" },            
  { name: "Google One", domain: "google.com" },       

  // AI
  { name: "ChatGPT Plus", domain: "chatgpt.com" },    
  { name: "Gemini Advanced", domain: "google.com" },    
  { name: "Claude Pro", domain: "claude.ai" }, 

  // Productivity / design
  { name: "Canva Pro", domain: "canva.com" }, 
  { name: "Notion", domain: "notion.so" },
  { name: "Microsoft 365", domain: "microsoft.com" },  
  { name: "Adobe Creative Cloud", domain: "adobe.com" },

  // BNPL
  { name: "Atome", domain: "atome.my" },               
  { name: "Grab PayLater", domain: "grab.com" },
  { name: "SPayLater", domain: "shopee.com.my" },
  { name: "Boost PayFlex", domain: "myboost.com.my" },

  // Telco
  { name: "Maxis", domain: "maxis.com.my" },
  { name: "CelcomDigi", domain: "celcomdigi.com" },
  { name: "U Mobile", domain: "u.com.my" },
  { name: "TIME", domain: "time.com.my" },
];

export const BNPL_SUBSCRIPTIONS: RecognizedSubscription[] = [
  { name: "Atome", domain: "atome.my" },
  { name: "Grab PayLater", domain: "grab.com" },
  { name: "SPayLater", domain: "shopee.com" },
  { name: "Boost PayFlex", domain: "myboost.com.my" },
];

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeForSearch(value: string): string {
  return normalizeName(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function isSubsequence(query: string, candidate: string): boolean {
  if (!query) return false;
  let pointer = 0;
  for (const character of candidate) {
    if (character === query[pointer]) pointer += 1;
    if (pointer === query.length) return true;
  }
  return false;
}

function levenshteinDistance(a: string, b: string): number {
  if (!a) return b.length;
  if (!b) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0),
  );

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const substitutionCost = a[row - 1] === b[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + substitutionCost,
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}

function getMatchScore(query: string, subscription: RecognizedSubscription): number {
  if (!query) return 0;

  const normalizedQuery = normalizeForSearch(query);
  const name = normalizeForSearch(subscription.name);
  const domain = normalizeForSearch(subscription.domain.replace(/\.[a-z]+$/i, ""));
  const candidates = [name, domain];

  let bestScore = 0;
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate === normalizedQuery) {
      bestScore = Math.max(bestScore, 1000);
      continue;
    }
    if (candidate.startsWith(normalizedQuery)) {
      bestScore = Math.max(bestScore, 850 - (candidate.length - normalizedQuery.length));
    }

    const containsIndex = candidate.indexOf(normalizedQuery);
    if (containsIndex >= 0) {
      bestScore = Math.max(bestScore, 700 - containsIndex * 5);
    }

    const tokenStartsWith = candidate
      .split(" ")
      .some((token) => token.startsWith(normalizedQuery));
    if (tokenStartsWith) {
      bestScore = Math.max(bestScore, 600);
    }

    if (isSubsequence(normalizedQuery, candidate.replace(/\s+/g, ""))) {
      bestScore = Math.max(bestScore, 420);
    }

    if (normalizedQuery.length >= 4) {
      const distance = levenshteinDistance(normalizedQuery, candidate);
      const ratio = distance / Math.max(normalizedQuery.length, candidate.length);
      if (ratio <= 0.45) {
        bestScore = Math.max(bestScore, Math.round((1 - ratio) * 520));
      }
    }
  }

  return bestScore;
}

export function getBrandfetchIconUrl(domain: string): string {
  return `https://cdn.brandfetch.io/${domain}/icon`;
}

export function searchRecognizedSubscriptions(
  query: string,
  limit = 8,
): RecognizedSubscription[] {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return RECOGNIZED_SUBSCRIPTIONS.slice(0, limit);

  return RECOGNIZED_SUBSCRIPTIONS.map((subscription) => ({
    subscription,
    score: getMatchScore(normalizedQuery, subscription),
  }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.subscription.name.localeCompare(b.subscription.name),
    )
    .slice(0, limit)
    .map((entry) => entry.subscription);
}

export function findRecognizedSubscriptionByName(
  name: string,
): RecognizedSubscription | null {
  const [best] = searchRecognizedSubscriptions(name, 1);
  if (!best) return null;
  const score = getMatchScore(name, best);
  return score >= 500 ? best : null;
}

export function findBnplSubscriptionByName(
  name: string,
): RecognizedSubscription | null {
  const [best] = searchBnplSubscriptions(name, 1);
  if (!best) return null;
  const score = getMatchScore(name, best);
  return score >= 500 ? best : null;
}

export function suggestCategoryForItem(
  name: string,
  type: ItemType,
): Category {
  if (!name.trim()) return "other";

  const matched =
    type === "bnpl"
      ? findBnplSubscriptionByName(name)
      : findRecognizedSubscriptionByName(name);

  if (!matched) return "other";
  return SUBSCRIPTION_CATEGORY_BY_DOMAIN[matched.domain] ?? "other";
}

export function searchBnplSubscriptions(
  query: string,
  limit = 4,
): RecognizedSubscription[] {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return BNPL_SUBSCRIPTIONS.slice(0, limit);

  return BNPL_SUBSCRIPTIONS.map((subscription) => ({
    subscription,
    score: getMatchScore(normalizedQuery, subscription),
  }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.subscription.name.localeCompare(b.subscription.name),
    )
    .slice(0, limit)
    .map((entry) => entry.subscription);
}

