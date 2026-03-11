import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://langgancheck.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${appUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
