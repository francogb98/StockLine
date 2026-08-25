import type { ImageSearchProvider, ImageSearchResult } from "./types";

const SERPAPI_BASE_URL = "https://serpapi.com/search.json";

export class SerpApiImageSearchProvider implements ImageSearchProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(
    query: string,
    options?: { limit?: number },
  ): Promise<ImageSearchResult[]> {
    const limit = options?.limit ?? 10;
    const params = new URLSearchParams({
      q: query,
      engine: "google_images",
      ijn: "0",
      api_key: this.apiKey,
    });

    const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("SEARCH_RATE_LIMIT");
      }
      throw new Error(`Image search failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.images_results || !Array.isArray(data.images_results)) {
      return [];
    }

    return data.images_results.slice(0, limit).map((img: any) => ({
      url: img.original || img.link || "",
      thumbnailUrl: img.thumbnail || "",
      width: img.original_width ?? 0,
      height: img.original_height ?? 0,
      title: img.title || "",
      source: img.source || "",
    }));
  }
}
