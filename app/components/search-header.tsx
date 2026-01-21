import { useState, useEffect, useRef, type FormEvent, type DragEvent } from "react";
import { MobileImageSearchProgress, ImageSearchQueryDisplay, type ImageSearchState } from "./image-search-progress";

interface SearchHeaderProps {
  onSearch: (query: string, preserveImageSearch?: boolean) => void;
  onReset: () => void;
  isLoading: boolean;
  hasResults: boolean;
  isExiting?: boolean;
  initialQuery?: string | null;
  skipTransition?: boolean;
  onImageSearch?: (file: File) => void;
  imageSearchState?: ImageSearchState;
  onClearImageSearch?: () => void;
  onRetryImageSearch?: () => void;
}

const suggestions = [
  "flying through clouds",
  "seaside town",
  "cooking delicious food",
  "夜空の星",
  "夜行列車",
  "bataille de sorciers",
];

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function SearchHeader({
  onSearch,
  onReset,
  isLoading,
  hasResults,
  isExiting = false,
  initialQuery,
  skipTransition = false,
  onImageSearch,
  imageSearchState,
  onClearImageSearch,
  onRetryImageSearch,
}: SearchHeaderProps) {
  const [query, setQuery] = useState(initialQuery || "countryside wildflowers");
  const [isVisible, setIsVisible] = useState(skipTransition);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Determine if we're in an active image search (processing, not idle or done)
  const isImageSearchInProgress = imageSearchState && 
    imageSearchState.step !== 'idle' && 
    imageSearchState.step !== 'done' &&
    imageSearchState.step !== 'error';
  const isImageSearchComplete = imageSearchState?.step === 'done' && imageSearchState?.searchQuery;

  // Update query when initialQuery changes (from URL)
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);
  const [visibleSuggestions, setVisibleSuggestions] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll suggestions on mobile
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || hasResults) return;

    // Only auto-scroll on mobile
    const isMobile = window.innerWidth < 640;
    if (!isMobile) return;

    // Start at position 0
    container.scrollLeft = 0;

    let scrollPos = 0;
    let isPaused = false;
    let resumeTimeout: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;

    const scroll = () => {
      if (!container || isPaused) return;

      // Calculate halfway point (where duplicated content starts)
      const halfwayPoint = container.scrollWidth / 2;

      scrollPos += 1;

      // When reaching halfway (end of first set), seamlessly reset to start
      if (scrollPos >= halfwayPoint) {
        scrollPos = 0;
      }

      container.scrollLeft = scrollPos;
    };

    const handleTouchStart = () => {
      isPaused = true;
      clearTimeout(resumeTimeout);
    };

    const handleTouchEnd = () => {
      // Resume auto-scroll after 3 seconds of no interaction
      resumeTimeout = setTimeout(() => {
        scrollPos = container.scrollLeft;
        isPaused = false;
      }, 3000);
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);

    // Delay before starting auto-scroll so user can see first suggestion
    const startDelay = setTimeout(() => {
      intervalId = setInterval(scroll, 30);
    }, 3000);

    return () => {
      clearTimeout(startDelay);
      if (intervalId) clearInterval(intervalId);
      clearTimeout(resumeTimeout);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [hasResults, visibleSuggestions]);

  // Fade in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Show suggestions one by one (reset when going back to home)
  useEffect(() => {
    if (hasResults) {
      setVisibleSuggestions(0); // Reset when showing results
      return;
    }

    if (!isVisible) return;

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setVisibleSuggestions((prev) => {
          if (prev >= suggestions.length) {
            clearInterval(interval);
            return suggestions.length;
          }
          return prev + 1;
        });
      }, 150);

      return () => clearInterval(interval);
    }, 500); // Start after header fades in

    return () => clearTimeout(timer);
  }, [isVisible, hasResults]);

  const handleReset = () => {
    setQuery("countryside wildflowers");
    onReset();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isImageSearchInProgress) return;
    
    // If image search is complete, re-search with the image query (preserve state)
    if (isImageSearchComplete && imageSearchState?.searchQuery) {
      onSearch(imageSearchState.searchQuery, true);
      return;
    }
    
    // Otherwise do normal text search
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
  };

  const handleFileSelect = (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      alert("Please upload a JPEG, PNG, or WebP image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB");
      return;
    }
    onImageSearch?.(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearImage = () => {
    setQuery("");
    onClearImageSearch?.();
  };

  return (
    <header
      className={`${skipTransition ? "" : "sm:transition-all sm:duration-[2000ms] ease-in-out transition-[opacity,bottom] duration-700"} ${
        hasResults
          ? "fixed bottom-8 left-0 right-0 sm:relative sm:bottom-auto sm:pt-6 sm:pb-6 z-40"
          : "fixed bottom-24 left-0 right-0 sm:relative sm:bottom-auto sm:pt-24 md:pt-32 sm:pb-12 md:pb-16 z-40"
      } ${isVisible || skipTransition ? "opacity-100" : "opacity-0"}`}
    >
      {hasResults && (
        <div className="fixed top-3 left-3 sm:top-4 sm:left-4 z-40">
          <button
            onClick={handleReset}
            className="text-base sm:text-lg font-serif text-slate-600 hover:text-slate-800 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full transition-colors"
          >
            Ghibli Search
          </button>
        </div>
      )}
      <div className="max-w-2xl mx-auto px-4">
        <div className={`transition-all duration-700 ease-in-out overflow-hidden ${
          hasResults || isExiting ? "opacity-0 max-h-0 mb-0" : "opacity-100 max-h-40 mb-8"
        }`}>
          <h1 className="text-3xl sm:text-3xl md:text-4xl lg:text-5xl font-serif text-center text-slate-800 leading-tight">
            What strange dreams
            <br />
            <em className="text-slate-600">live in your heart?</em>
          </h1>
        </div>



        <div className="flex flex-col-reverse sm:flex-col gap-6 sm:gap-0">
          <form
            onSubmit={handleSubmit}
            className="relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
              aria-label="Upload image to search"
            />

            {/* Drag overlay */}
            {isDragOver && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-full border-2 border-dashed border-slate-400 bg-slate-100/90 backdrop-blur-sm">
                <span className="text-sm text-slate-600 font-medium">Drop image to search</span>
              </div>
            )}

            <div className="relative flex items-center gap-2 min-w-0">
              {/* Image upload button */}
              <button
                type="button"
                onClick={handleImageButtonClick}
                disabled={isLoading || isImageSearchInProgress}
                className="flex-shrink-0 p-2.5 sm:p-3 text-slate-400 hover:text-slate-600 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full transition-colors disabled:opacity-50"
                aria-label="Search by image"
                title="Search by image"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <circle cx="12" cy="13" r="3" strokeWidth={2} />
                </svg>
              </button>

              {/* Search input / Image search query display */}
              <div className="relative flex-1 min-w-0">
                {isImageSearchComplete ? (
                  // Image search complete - show the rewritten search query
                  <ImageSearchQueryDisplay
                    searchQuery={imageSearchState.searchQuery!}
                    onClear={handleClearImage}
                  />
                ) : isImageSearchInProgress ? (
                  // Image search in progress - show filename
                  <div className="w-full px-4 py-2.5 sm:px-6 sm:py-3 pr-20 text-base rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm flex items-center gap-2 overflow-hidden min-w-0">
                    <svg className="w-4 h-4 animate-spin text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-slate-600 truncate text-sm min-w-0" title={imageSearchState.filename || ''}>
                      {imageSearchState.filename}
                    </span>
                  </div>
                ) : (
                  // Text search mode - show input
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for your dreams..."
                    className="w-full px-4 py-2.5 sm:px-6 sm:py-3 pr-12 text-base rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:border-slate-300 transition-colors placeholder:text-slate-400"
                  />
                )}

                {/* Clear button (for image search) */}
                {(isImageSearchInProgress || isImageSearchComplete) && (
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Clear image search"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}

                {/* Search/Loading button */}
                <button
                  type="submit"
                  disabled={isLoading || isImageSearchInProgress || (!isImageSearchComplete && !query.trim())}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors"
                  aria-label="Search"
                >
                  {isLoading ? (
                    <svg
                      className="w-6 h-6 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>


          </form>

          {/* Mobile: Image search progress - appears above search bar due to flex-col-reverse */}
          {hasResults && imageSearchState && imageSearchState.step !== 'idle' && (
            <div className="sm:hidden">
              <MobileImageSearchProgress 
                state={imageSearchState} 
                onRetry={onRetryImageSearch} 
              />
            </div>
          )}

          <div className={`transition-all duration-700 ease-in-out overflow-hidden ${
            hasResults || isExiting ? "opacity-0 max-h-0" : "opacity-100 max-h-20 sm:mt-6"
          }`}>
            <div ref={scrollRef} className="flex overflow-x-auto sm:overflow-visible sm:flex-wrap sm:justify-center gap-2 pb-2 sm:pb-0 scrollbar-hide mx-4 sm:mx-0">
              <span className={`hidden sm:inline text-sm text-slate-500 mr-2 transition-opacity duration-300 ${
                visibleSuggestions > 0 && !isExiting ? "opacity-100" : "opacity-0"
              }`}>Try:</span>
              {/* First set of suggestions */}
              {suggestions.map((suggestion, index) => {
                const reverseIndex = suggestions.length - 1 - index;
                const isVisibleNow = isExiting
                  ? false
                  : index < visibleSuggestions;

                return (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`px-3 py-1.5 sm:px-3 sm:py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-all duration-500 ease-out whitespace-nowrap flex-shrink-0 ${
                      isVisibleNow ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
                    }`}
                    style={{
                      transitionDelay: isExiting ? `${reverseIndex * 80}ms` : '0ms'
                    }}
                  >
                    {suggestion}
                  </button>
                );
              })}
              {/* Duplicate suggestions for seamless infinite scroll on mobile */}
              {suggestions.map((suggestion, index) => {
                const isVisibleNow = !isExiting && index < visibleSuggestions;

                return (
                  <button
                    key={`dup-${suggestion}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`sm:hidden px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-all duration-500 ease-out whitespace-nowrap flex-shrink-0 ${
                      isVisibleNow ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
                    }`}
                  >
                    {suggestion}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
