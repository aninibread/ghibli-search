import { useEffect, useCallback, useState } from "react";
import type { GhibliImage } from "../lib/types";
import { getGhibliUrl } from "../lib/movie-slugs";
import { getOriginalImageUrl } from "../lib/image-urls";

interface LightboxProps {
  image: GhibliImage | null;
  onClose: () => void;
}

export function Lightbox({ image, onClose }: LightboxProps) {
  const [isFullImageLoaded, setIsFullImageLoaded] = useState(false);
  const [isThumbnailLoaded, setIsThumbnailLoaded] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [fullImageFailed, setFullImageFailed] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Reset loading state when image changes
  useEffect(() => {
    setIsFullImageLoaded(false);
    setIsThumbnailLoaded(false);
    setThumbnailFailed(false);
    setFullImageFailed(false);
  }, [image?.filename]);

  useEffect(() => {
    if (image) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [image, handleKeyDown]);

  if (!image) return null;

  const ghibliUrl = getGhibliUrl(image.movieSlug);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors"
          aria-label="Close"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Image - clickable to go to Studio Ghibli */}
        <a
          href={ghibliUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative aspect-video block cursor-pointer group rounded-2xl overflow-hidden bg-slate-200"
        >
          {/* Thumbnail as placeholder (blurred) - shows while full image loads */}
          <img
            src={thumbnailFailed ? getOriginalImageUrl(image.filename) : image.thumbnailUrl}
            alt=""
            aria-hidden="true"
            onError={() => setThumbnailFailed(true)}
            onLoad={() => setIsThumbnailLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isFullImageLoaded ? 'opacity-0' : isThumbnailLoaded ? 'opacity-100 blur-sm scale-105' : 'opacity-0'
            }`}
          />
          
          {/* Full-size image */}
          <img
            src={fullImageFailed ? getOriginalImageUrl(image.filename) : image.imageUrl}
            alt={image.description}
            onLoad={() => setIsFullImageLoaded(true)}
            onError={() => setFullImageFailed(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isFullImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          
          {/* Loading indicator */}
          {!isFullImageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
            </div>
          )}
          
          {/* Overlay info - hidden on mobile, hover on desktop */}
          <div className="absolute bottom-0 left-0 right-0 pt-16 pb-6 px-6 bg-gradient-to-t from-white/50 via-white/25 to-transparent backdrop-blur-[2px] hidden sm:block sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
            <h2 className="text-2xl font-serif text-slate-800 mb-1">
              {image.description}
            </h2>
            <p className="text-base text-slate-600">
              {image.movieName} ({image.year})
            </p>
          </div>
        </a>
      </div>
    </div>
  );
}
