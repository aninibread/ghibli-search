import { useState, useEffect, useRef } from 'react';

export type ImageSearchStep = 'idle' | 'analyzing' | 'rewriting' | 'searching' | 'done' | 'error';

export interface ImageSearchState {
  step: ImageSearchStep;
  filename: string | null;
  description: string | null;
  searchQuery: string | null;
  error: string | null;
}

interface ImageSearchProgressProps {
  state: ImageSearchState;
  onRetry?: () => void;
}

export function ImageSearchProgress({ state, onRetry }: ImageSearchProgressProps) {
  const { step, description, searchQuery, error } = state;
  // If mounting with step already 'done', start at stage 4 (show dropdown immediately)
  const [collapseStage, setCollapseStage] = useState(() => step === 'done' ? 4 : 0);
  const prevStepRef = useRef(step);
  const hasMountedRef = useRef(false);

  // Reset collapse stage when starting a new search, animate collapse when done
  useEffect(() => {
    // Skip the collapse animation on first mount if already done (handled by initial state)
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      if (step === 'done') return;
    }

    if (step === 'analyzing') {
      // Reset when starting a new image search
      setCollapseStage(0);
    } else if (step === 'done' && prevStepRef.current !== 'done' && prevStepRef.current !== 'idle') {
      // Staggered collapse: step 3 -> step 2 -> step 1 -> show dropdown
      setCollapseStage(1);
      const timer1 = setTimeout(() => setCollapseStage(2), 150);
      const timer2 = setTimeout(() => setCollapseStage(3), 300);
      const timer3 = setTimeout(() => setCollapseStage(4), 500);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else if (step === 'idle') {
      setCollapseStage(0);
    }
    prevStepRef.current = step;
  }, [step]);

  // Don't render anything if idle
  if (step === 'idle') {
    return null;
  }

  // Collapsed summary when done (after all animations)
  if (step === 'done' && collapseStage === 4 && description) {
    return (
      <>
        {/* Desktop: text-based dropdown above results */}
        <div className="hidden sm:block relative text-sm text-slate-500 animate-in fade-in slide-in-from-top-2 duration-200">
          <details className="group">
            <summary className="cursor-pointer hover:text-slate-600 transition-colors list-none flex items-center gap-1">
              <svg 
                className="w-3 h-3 transition-transform group-open:rotate-90" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>How I found these</span>
            </summary>
            <div className="absolute left-0 mt-2 p-4 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-lg space-y-3 w-[42rem] max-h-[60vh] overflow-y-auto z-50">
              <div>
                <p className="text-xs text-slate-400 mb-1">What I saw:</p>
                <p className="text-slate-600 italic text-sm leading-relaxed">{description}</p>
              </div>
              {searchQuery && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">What I searched:</p>
                  <p className="text-slate-700 font-serif">{searchQuery}</p>
                </div>
              )}
            </div>
          </details>
        </div>

        {/* Mobile: floating button above search bar - account for search bar height (~4.5rem) + bottom-8 (2rem) + gap */}
        <div className="sm:hidden fixed bottom-[calc(7rem+env(safe-area-inset-bottom,0px))] left-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <details className="group">
            <summary className="cursor-pointer list-none flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-slate-500 hover:text-slate-600 px-3 py-2 rounded-full border border-slate-200 shadow-md text-sm">
              <svg 
                className="w-3 h-3 transition-transform group-open:rotate-90" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>How I found these</span>
            </summary>
            <div className="absolute left-0 bottom-full mb-2 p-4 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-lg space-y-3 w-[calc(100vw-2rem)] max-h-[50vh] overflow-y-auto">
              <div>
                <p className="text-xs text-slate-400 mb-1">What I saw:</p>
                <p className="text-slate-600 italic text-sm leading-relaxed">{description}</p>
              </div>
              {searchQuery && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">What I searched:</p>
                  <p className="text-slate-700 font-serif">{searchQuery}</p>
                </div>
              )}
            </div>
          </details>
        </div>
      </>
    );
  }

  // Helper for collapse animation classes
  const getCollapseClass = (stage: number) => {
    if (collapseStage >= stage) {
      return 'opacity-0 max-h-0 overflow-hidden transition-all duration-200 ease-out';
    }
    return 'opacity-100 max-h-40 transition-all duration-200 ease-out';
  };
  
  return (
    <>
      {/* Desktop: normal flow above results */}
      <div className="hidden sm:block space-y-3">
        {/* Step 1: Analyzing Image - collapses last (stage 3) */}
        <div className={getCollapseClass(3)}>
          <div className="space-y-1">
            <p className="text-sm text-slate-500">
              {step === 'analyzing' ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-1 h-1 bg-slate-400 rounded-full animate-pulse" />
                  Reading image...
                </span>
              ) : description ? (
                'What I see:'
              ) : null}
            </p>
            {description && (
              <p className="text-sm text-slate-600 italic leading-relaxed line-clamp-2" title={description}>
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Step 2: Rewriting Query - collapses second (stage 2) */}
        {(step === 'rewriting' || step === 'searching' || step === 'done' || searchQuery) && (
          <div className={getCollapseClass(2)}>
            <div className="space-y-1">
              <p className="text-sm text-slate-500">
                {step === 'rewriting' ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block w-1 h-1 bg-slate-400 rounded-full animate-pulse" />
                    Thinking...
                  </span>
                ) : searchQuery ? (
                  'Searching for:'
                ) : null}
              </p>
              {searchQuery && (
                <p className="text-base font-serif text-slate-700">
                  {searchQuery}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Searching - collapses first (stage 1) */}
        {(step === 'searching' || (step === 'done' && collapseStage < 1)) && (
          <div className={getCollapseClass(1)}>
            <p className="text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-1 h-1 bg-slate-400 rounded-full animate-pulse" />
                Finding similar moments...
              </span>
            </p>
          </div>
        )}

        {/* Error State */}
        {step === 'error' && error && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm text-slate-600 hover:text-slate-800 underline underline-offset-2 transition-colors"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile: fixed above search bar, stacking bottom to top - account for search bar height (~4.5rem) + bottom-8 (2rem) + gap */}
      <div className="sm:hidden fixed bottom-[calc(7rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-40 flex flex-col-reverse gap-2 items-start">
        {/* Step 3: Searching - at bottom (closest to search bar) */}
        {(step === 'searching' || (step === 'done' && collapseStage < 1)) && (
          <div className={`bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full border border-slate-200 shadow-sm ${getCollapseClass(1)}`}>
            <p className="text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" />
                Finding similar moments...
              </span>
            </p>
          </div>
        )}

        {/* Step 2: Rewriting Query */}
        {(step === 'rewriting' || step === 'searching' || step === 'done' || searchQuery) && (
          <div className={`bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full border border-slate-200 shadow-sm max-w-full ${getCollapseClass(2)}`}>
            <p className="text-sm text-slate-500 truncate">
              {step === 'rewriting' ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" />
                  Thinking...
                </span>
              ) : searchQuery ? (
                <span className="truncate">
                  <span className="text-slate-400">Search: </span>
                  <span className="font-medium text-slate-700">{searchQuery}</span>
                </span>
              ) : null}
            </p>
          </div>
        )}

        {/* Step 1: Analyzing Image - at top */}
        <div className={`bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full border border-slate-200 shadow-sm max-w-full ${getCollapseClass(3)}`}>
          <p className="text-sm text-slate-500 truncate">
            {step === 'analyzing' ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" />
                Reading image...
              </span>
            ) : description ? (
              <span className="truncate">
                <span className="text-slate-400">Saw: </span>
                <span className="italic text-slate-600">{description.slice(0, 50)}...</span>
              </span>
            ) : null}
          </p>
        </div>

        {/* Error State */}
        {step === 'error' && error && (
          <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <p className="text-sm text-slate-500">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm text-slate-600 hover:text-slate-800 underline underline-offset-2 transition-colors"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// Compact version shown after search is complete (in results view)
interface ImageSearchQueryDisplayProps {
  searchQuery: string;
  onClear: () => void;
}

export function ImageSearchQueryDisplay({ searchQuery }: ImageSearchQueryDisplayProps) {
  return (
    <div className="w-full px-4 py-2.5 sm:px-6 sm:py-3 pr-20 text-base rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm flex items-center gap-2 overflow-hidden min-w-0">
      {/* Image icon */}
      <svg
        className="w-4 h-4 text-slate-400 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8.5" cy="8.5" r="1.5" strokeWidth={2} />
        <path d="M21 15l-5-5L5 21" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-slate-700 truncate text-sm min-w-0" title={searchQuery}>
        {searchQuery}
      </span>
    </div>
  );
}
