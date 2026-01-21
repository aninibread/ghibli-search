import { useState, useEffect, useCallback } from "react";
import type { GhibliImage } from "../lib/types";
import { getOriginalImageUrl } from "../lib/image-urls";

interface ImageGridProps {
  images: GhibliImage[];
  isLoading: boolean;
  onImageClick: (image: GhibliImage) => void;
}

export function ImageGrid({ images, isLoading, onImageClick }: ImageGridProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // Reset loaded state when images change
  useEffect(() => {
    setLoadedImages(new Set());
    setFailedImages(new Set());
  }, [images]);

  // Handle image load error - fall back to original URL
  const handleImageError = useCallback((filename: string) => {
    setFailedImages(prev => new Set(prev).add(filename));
  }, []);

  // Handle successful image load
  const handleImageLoad = useCallback((filename: string) => {
    setLoadedImages(prev => new Set(prev).add(filename));
  }, []);

  // Staggered fade-in animation for images
  useEffect(() => {
    if (images.length === 0) {
      setVisibleCount(0);
      return;
    }

    // Reset and start animation
    setVisibleCount(0);

    const isMobile = window.innerWidth < 640;

    const startTimer = setTimeout(() => {
      setVisibleCount(isMobile ? 1 : 3); // Show first image on mobile, first row on desktop

      const interval = setInterval(() => {
        setVisibleCount((prev) => {
          if (prev >= images.length) {
            clearInterval(interval);
            return images.length;
          }
          return prev + (isMobile ? 1 : 3); // One at a time on mobile, one row on desktop
        });
      }, isMobile ? 90 : 150);

      return () => clearInterval(interval);
    }, 1000); // Wait for search bar to settle

    return () => clearTimeout(startTimer);
  }, [images]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-video rounded-xl animate-[color-wave_2s_ease-in-out_infinite]"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <style>{`
          @keyframes color-wave {
            0%, 100% {
              background-color: #f1f5f9;
              transform: translateY(0);
            }
            50% {
              background-color: #cbd5e1;
              transform: translateY(-3px);
            }
          }
        `}</style>
      </div>
    );
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 pb-24 sm:py-4 sm:pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image, index) => (
          <button
            key={image.filename}
            onClick={() => onImageClick(image)}
            className={`group relative aspect-video overflow-hidden rounded-xl bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all duration-1000 sm:duration-700 ease-out ${
              index < visibleCount ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 sm:translate-y-4"
            }`}
          >
            <img
              src={failedImages.has(image.filename) ? getOriginalImageUrl(image.filename) : image.thumbnailUrl}
              alt={image.description}
              loading="lazy"
              onError={() => handleImageError(image.filename)}
              onLoad={() => handleImageLoad(image.filename)}
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
                loadedImages.has(image.filename) ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 text-white transform translate-y-0 sm:translate-y-full sm:group-hover:translate-y-0 transition-transform duration-300">
              <p className="text-xs sm:text-sm font-medium truncate">{image.description}</p>
              <p className="text-[10px] sm:text-xs text-white/80 truncate">
                {image.movieName} ({image.year})
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
