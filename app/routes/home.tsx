import { useState, useCallback, useEffect, useRef } from "react";
import type { Route } from "./+types/home";
import { SearchHeader } from "../components/search-header";
import { ImageGrid } from "../components/image-grid";
import { Lightbox } from "../components/lightbox";
import { FloatingImages } from "../components/floating-images";
import { PoweredBy } from "../components/powered-by";
import { CursorSparkles } from "../components/cursor-sparkles";
import type { GhibliImage, SearchResponse } from "../lib/types";
import { ImageSearchProgress, type ImageSearchState } from "../components/image-search-progress";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Studio Ghibli Search" },
    {
      name: "description",
      content: "Discover beautiful moments from Studio Ghibli films",
    },
  ];
}

const initialImageSearchState: ImageSearchState = {
  step: 'idle',
  filename: null,
  description: null,
  searchQuery: null,
  error: null,
};

export default function Home() {
  // Check URL synchronously to initialize states correctly
  const urlHasQuery = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('query');

  const [results, setResults] = useState<GhibliImage[]>([]);
  const [isLoading, setIsLoading] = useState(urlHasQuery); // Start loading if URL has query

  const [hasSearched, setHasSearched] = useState(urlHasQuery);
  const [selectedImage, setSelectedImage] = useState<GhibliImage | null>(null);
  const [featuredImages, setFeaturedImages] = useState<GhibliImage[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [isExitingBackground, setIsExitingBackground] = useState(urlHasQuery);
  const [showSuggestionsExit, setShowSuggestionsExit] = useState(urlHasQuery);
  const [initialQuery, setInitialQuery] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('query');
    }
    return null;
  });
  const [skipTransition, setSkipTransition] = useState(urlHasQuery);
  const hasLoadedFromUrl = useRef(urlHasQuery);

  // Multi-step image search state
  const [imageSearch, setImageSearch] = useState<ImageSearchState>(initialImageSearchState);
  const currentFileRef = useRef<File | null>(null);

  const openImageFromUrl = async (filename: string) => {
    try {
      // Add .png extension back if not present
      const fullFilename = filename.endsWith('.png') ? filename : `${filename}.png`;
      // Fetch image details from API
      const response = await fetch(`/api/image?filename=${encodeURIComponent(fullFilename)}`);
      if (response.ok) {
        const image: GhibliImage = await response.json();
        setSelectedImage(image);
      }
    } catch (error) {
      console.error("Failed to load image from URL:", error);
    }
  };

  const performSearchFromUrl = async (query: string) => {
    // States are already initialized correctly, just fetch results
    setIsLoading(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data: SearchResponse = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Check URL for query and image on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get('query');
    const urlImage = params.get('image');

    const loadFromUrl = async () => {
      if (urlQuery) {
        await performSearchFromUrl(urlQuery);
        if (urlImage) {
          await openImageFromUrl(urlImage);
        }
      } else if (urlImage) {
        await openImageFromUrl(urlImage);
      }
    };

    if (urlQuery || urlImage) {
      loadFromUrl();
    }
  }, []);

  // Handle browser back/forward button for lightbox
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const imageFilename = params.get('image');
      if (imageFilename) {
        openImageFromUrl(imageFilename);
      } else {
        setSelectedImage(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch random images from R2 for the home page background
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await fetch('/api/random');
        const data: SearchResponse = await response.json();
        setFeaturedImages(data.results || []);
      } catch (error) {
        console.error("Failed to fetch featured images:", error);
      }
    };
    fetchFeatured();
  }, []);

  const handleSearch = useCallback(async (query: string, preserveImageSearch = false) => {
    setIsLoading(true);
    // Clear image search state unless we're re-searching with the same image query
    if (!preserveImageSearch) {
      setImageSearch(initialImageSearchState);
    }

    // Update URL with search query (use replaceState to get %20 instead of +)
    const newUrl = `${window.location.pathname}?query=${encodeURIComponent(query)}`;
    window.history.replaceState(null, '', newUrl);

    // Sequence: 1. Background fades → 2. Suggestions pop away → 3. Header moves
    setIsExitingBackground(true);

    // After background starts fading, trigger suggestions exit
    setTimeout(() => {
      setShowSuggestionsExit(true);
    }, 600);

    // After suggestions start exiting, move the header
    setTimeout(() => {
      setHasSearched(true);
    }, 1200);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data: SearchResponse = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImageClick = useCallback((image: GhibliImage) => {
    setSelectedImage(image);
    // Add image to URL (remove .png extension)
    const params = new URLSearchParams(window.location.search);
    const filenameWithoutExt = image.filename.replace(/\.png$/i, '');
    params.set('image', filenameWithoutExt);
    window.history.pushState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setSelectedImage(null);
    // Remove image from URL but keep query if present
    const params = new URLSearchParams(window.location.search);
    params.delete('image');
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.pushState(null, '', newUrl);
  }, []);

  const handleImageSearch = useCallback(async (file: File) => {
    currentFileRef.current = file;
    
    // Clear URL query param (can't represent image in URL)
    window.history.replaceState(null, '', window.location.pathname);

    // Start the multi-step process
    setImageSearch({
      step: 'analyzing',
      filename: file.name,
      description: null,
      searchQuery: null,
      error: null,
    });

    // Trigger exit animations
    setIsExitingBackground(true);
    setTimeout(() => setShowSuggestionsExit(true), 600);
    setTimeout(() => setHasSearched(true), 1200);

    try {
      // Step 1: Analyze image with toMarkdown
      const formData = new FormData();
      formData.append('image', file);

      const analyzeResponse = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json() as { error?: string; details?: string };
        console.error("Analyze error details:", errorData.details);
        throw new Error(errorData.error || 'Failed to analyze image');
      }

      const analyzeData = await analyzeResponse.json() as { description: string };

      // Update state with description, move to rewriting step
      setImageSearch(prev => ({
        ...prev,
        step: 'rewriting',
        description: analyzeData.description,
      }));

      // Step 2: Rewrite query
      const rewriteResponse = await fetch('/api/rewrite-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: analyzeData.description }),
      });

      let searchQuery: string;
      if (!rewriteResponse.ok) {
        // Fallback: use description as query if rewriting fails
        console.warn("Query rewriting failed, using description as fallback");
        searchQuery = analyzeData.description;
      } else {
        const rewriteData = await rewriteResponse.json() as { searchQuery: string };
        searchQuery = rewriteData.searchQuery;
      }

      // Update state with search query, move to searching step
      setImageSearch(prev => ({
        ...prev,
        step: 'searching',
        searchQuery,
      }));

      // Step 3: Search
      setIsLoading(true);
      
      // Update URL with the final search query
      const newUrl = `${window.location.pathname}?query=${encodeURIComponent(searchQuery)}`;
      window.history.replaceState(null, '', newUrl);
      
      const searchResponse = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const searchData: SearchResponse = await searchResponse.json();
      
      setResults(searchData.results || []);
      setImageSearch(prev => ({
        ...prev,
        step: 'done',
      }));

    } catch (error) {
      console.error("Image search failed:", error);
      setImageSearch(prev => ({
        ...prev,
        step: 'error',
        error: error instanceof Error ? error.message : 'Image search failed',
      }));
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRetryImageSearch = useCallback(() => {
    if (currentFileRef.current) {
      handleImageSearch(currentFileRef.current);
    }
  }, [handleImageSearch]);

  const handleClearImageSearch = useCallback(() => {
    setImageSearch(initialImageSearchState);
    currentFileRef.current = null;
  }, []);

  const handleReset = useCallback(() => {
    setResults([]);
    setHasSearched(false);
    setIsExitingBackground(false);
    setShowSuggestionsExit(false);
    setSkipTransition(false); // Re-enable animations for next search
    setResetKey(k => k + 1); // Force FloatingImages to remount and replay animation
    window.history.replaceState(null, '', window.location.pathname); // Clear URL query
    setInitialQuery(null);
    setImageSearch(initialImageSearchState); // Clear image search state
    currentFileRef.current = null;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-t from-blue-100/85 to-white sm:bg-none sm:bg-slate-50">
      {!hasSearched && <FloatingImages key={resetKey} images={featuredImages} isExiting={isExitingBackground} />}

      <SearchHeader
        onSearch={handleSearch}
        onReset={handleReset}
        isLoading={isLoading}
        hasResults={hasSearched}
        isExiting={showSuggestionsExit}
        initialQuery={initialQuery}
        skipTransition={skipTransition}
        onImageSearch={handleImageSearch}
        imageSearchState={imageSearch}
        onClearImageSearch={handleClearImageSearch}
        onRetryImageSearch={handleRetryImageSearch}
      />



      {/* Image search progress - above the grid, dropdown overlays results */}
      {hasSearched && imageSearch.step !== 'idle' && (
        <div className="relative z-30 max-w-2xl mx-auto px-6 pb-4 sm:pb-6">
          <ImageSearchProgress
            state={imageSearch}
            onRetry={handleRetryImageSearch}
          />
        </div>
      )}

      {hasSearched && (
        <ImageGrid
          images={results}
          isLoading={isLoading || (imageSearch.step !== 'idle' && imageSearch.step !== 'done' && imageSearch.step !== 'error')}
          onImageClick={handleImageClick}
        />
      )}

      {/* Only show "no results" when search is fully complete (not during image search progress) */}
      {hasSearched && !isLoading && results.length === 0 && 
       (imageSearch.step === 'idle' || imageSearch.step === 'done') && (
        <div className="flex flex-col items-center justify-center px-6 py-20 sm:py-32">
          <div className="text-6xl sm:text-8xl mb-6 opacity-40">🍃</div>
          <h2 className="text-xl sm:text-2xl font-serif text-slate-600 mb-2 text-center">
            No dreams found here...
          </h2>
          <p className="text-slate-400 text-sm sm:text-base text-center max-w-sm">
            The spirits couldn't find what you're looking for. Try searching for something else.
          </p>
        </div>
      )}

      <Lightbox image={selectedImage} onClose={handleCloseLightbox} />
      <PoweredBy />
      <CursorSparkles enabled={true} />
    </div>
  );
}
