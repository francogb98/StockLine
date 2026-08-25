export interface ImageSearchResult {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  title: string;
  source: string;
}

export interface ImageSearchProvider {
  search(query: string, options?: { limit?: number }): Promise<ImageSearchResult[]>;
}
