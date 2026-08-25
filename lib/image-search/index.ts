import type { ImageSearchProvider } from "./types";
import { SerpApiImageSearchProvider } from "./serpapi-provider";

export type { ImageSearchProvider, ImageSearchResult } from "./types";

let cachedProvider: ImageSearchProvider | null = null;

export function getImageSearchProvider(): ImageSearchProvider {
  if (cachedProvider) return cachedProvider;

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Image search is not configured. Set SERPAPI_API_KEY environment variable.",
    );
  }

  cachedProvider = new SerpApiImageSearchProvider(apiKey);
  return cachedProvider;
}

export function isImageSearchConfigured(): boolean {
  return !!process.env.SERPAPI_API_KEY;
}
