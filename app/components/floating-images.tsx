import { useEffect, useState, useRef, useCallback } from "react";
import type { GhibliImage } from "../lib/types";
import { getOriginalImageUrl } from "../lib/image-urls";

interface FloatingImagesProps {
  images: GhibliImage[];
  isExiting?: boolean;
}

interface FloatingImage {
  image: GhibliImage;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  rotation: number;
  rotationSpeed: number;
}

export function FloatingImages({ images, isExiting = false }: FloatingImagesProps) {
  const [floatingImages, setFloatingImages] = useState<FloatingImage[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [exitingCount, setExitingCount] = useState(0);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  // Handle image load error - fall back to original URL
  const handleImageError = useCallback((filename: string) => {
    setFailedImages(prev => new Set(prev).add(filename));
  }, []);

  // Handle successful image load
  const handleImageLoad = useCallback((filename: string) => {
    setLoadedImages(prev => new Set(prev).add(filename));
  }, []);

  // Track window size changes (only on initial load, ignore mobile pull gestures)
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateSize(); // Set initial size

    let resizeTimeout: ReturnType<typeof setTimeout>;
    let lastWidth = window.innerWidth;

    const handleResize = () => {
      // Only update if width actually changed (ignore height changes from mobile pull gestures)
      if (Math.abs(window.innerWidth - lastWidth) > 50) {
        lastWidth = window.innerWidth;
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateSize, 300);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Initialize floating images with random positions and sizes (no overlapping)
  useEffect(() => {
    if (images.length === 0 || windowSize.width === 0) return;

    // Responsive sizes - smaller on mobile
    const isMobile = window.innerWidth < 640;
    const isTablet = window.innerWidth < 1024;

    const sizes = isMobile
      ? [
          { width: 110, height: 69 },
          { width: 125, height: 78 },
          { width: 118, height: 74 },
          { width: 130, height: 81 },
          { width: 120, height: 75 },
        ]
      : isTablet
      ? [
          { width: 180, height: 113 },
          { width: 200, height: 125 },
          { width: 190, height: 119 },
          { width: 210, height: 131 },
          { width: 195, height: 122 },
        ]
      : [
          { width: 240, height: 150 },
          { width: 260, height: 165 },
          { width: 280, height: 175 },
          { width: 300, height: 190 },
          { width: 320, height: 200 },
        ];

    // Check if two images would overlap (including edges)
    const wouldOverlap = (
      x1: number, y1: number, w1: number, h1: number,
      x2: number, y2: number, w2: number, h2: number
    ) => {
      const padding = isMobile ? 50 : 60; // Extra padding to prevent edge overlap
      // Check axis-aligned bounding box overlap
      const left1 = x1 - padding / 2;
      const right1 = x1 + w1 + padding / 2;
      const top1 = y1 - padding / 2;
      const bottom1 = y1 + h1 + padding / 2;
      const left2 = x2 - padding / 2;
      const right2 = x2 + w2 + padding / 2;
      const top2 = y2 - padding / 2;
      const bottom2 = y2 + h2 + padding / 2;
      return !(right1 < left2 || left1 > right2 || bottom1 < top2 || top1 > bottom2);
    };

    const newFloatingImages: FloatingImage[] = [];

    // Pre-defined positions around edges - avoid center where header/search is
    // Keep at least 5% from edges
    // On mobile, only show images above the header (which is at ~45vh)
    const positions = isMobile
      ? [
          { zone: 'left-top', xRange: [2, 10], yRange: [2, 10] },
          { zone: 'right-top', xRange: [58, 68], yRange: [2, 10] },
          { zone: 'left-mid', xRange: [2, 10], yRange: [28, 38] },
          { zone: 'right-mid', xRange: [58, 68], yRange: [28, 38] },
          { zone: 'center', xRange: [30, 45], yRange: [15, 22] },
        ]
      : [
          { zone: 'left-bottom', xRange: [5, 18], yRange: [58, 75] },
          { zone: 'right-bottom', xRange: [65, 78], yRange: [58, 75] },
          { zone: 'left-top', xRange: [5, 18], yRange: [5, 18] },
          { zone: 'right-top', xRange: [65, 78], yRange: [5, 18] },
          { zone: 'bottom-center-left', xRange: [22, 35], yRange: [68, 78] },
          { zone: 'bottom-center-right', xRange: [50, 63], yRange: [68, 78] },
          { zone: 'left-mid', xRange: [5, 15], yRange: [35, 52] },
          { zone: 'right-mid', xRange: [68, 78], yRange: [35, 52] },
        ];

    // Show fewer images on mobile
    const maxImages = isMobile ? 5 : isTablet ? 6 : 7;

    images.slice(0, maxImages).forEach((image, i) => {
      const size = sizes[i % sizes.length];
      const pos = positions[i % positions.length];

      // Account for image size to keep fully on screen
      const maxXPercent = Math.max(0, 100 - (size.width / window.innerWidth) * 100);
      const maxYPercent = Math.max(0, 100 - (size.height / window.innerHeight) * 100);

      let x = 0, y = 0;
      let attempts = 0;
      const maxAttempts = 100;

      // Try to find a non-overlapping position
      do {
        x = Math.min(pos.xRange[0] + Math.random() * (pos.xRange[1] - pos.xRange[0]), maxXPercent);
        y = Math.min(pos.yRange[0] + Math.random() * (pos.yRange[1] - pos.yRange[0]), maxYPercent);
        attempts++;

        // Check against all placed images
        const hasOverlap = newFloatingImages.some(existing => {
          const ex = (existing.x / 100) * window.innerWidth;
          const ey = (existing.y / 100) * window.innerHeight;
          const nx = (x / 100) * window.innerWidth;
          const ny = (y / 100) * window.innerHeight;
          return wouldOverlap(nx, ny, size.width, size.height, ex, ey, existing.width, existing.height);
        });

        if (!hasOverlap) break;
      } while (attempts < maxAttempts);

      newFloatingImages.push({
        image,
        x,
        y,
        vx: (Math.random() - 0.5) * 0.001,
        vy: (Math.random() - 0.5) * 0.0008,
        width: size.width,
        height: size.height,
        rotation: 0,
        rotationSpeed: 0,
      });
    });

    setFloatingImages(newFloatingImages);
    setVisibleCount(0); // Reset visibility for new layout
  }, [images, windowSize]);

  // Fade in images one by one, very gradually (starts after suggestions appear)
  useEffect(() => {
    if (floatingImages.length === 0) return;

    // Start showing after suggestions have popped in (~1500ms)
    const startTimer = setTimeout(() => {
      setVisibleCount(1);

      const interval = setInterval(() => {
        setVisibleCount((prev) => {
          if (prev >= floatingImages.length) {
            clearInterval(interval);
            return floatingImages.length;
          }
          return prev + 1;
        });
      }, 600); // Slower interval between each image

      return () => clearInterval(interval);
    }, 1500);

    return () => clearTimeout(startTimer);
  }, [floatingImages.length]);

  // Fade out images one by one when exiting
  useEffect(() => {
    if (!isExiting) {
      setExitingCount(0);
      return;
    }

    const interval = setInterval(() => {
      setExitingCount((prev) => {
        if (prev >= floatingImages.length) {
          clearInterval(interval);
          return floatingImages.length;
        }
        return prev + 1;
      });
    }, 100); // Fast fade out

    return () => clearInterval(interval);
  }, [isExiting, floatingImages.length]);

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Animation loop for floating and mouse interaction
  const animate = useCallback(() => {
    setFloatingImages((prev) => {
      const container = containerRef.current;
      if (!container) return prev;

      const rect = container.getBoundingClientRect();

      // First pass: calculate new velocities with collisions
      const updated = prev.map((img, index) => {
        const imgCenterX = (img.x / 100) * rect.width + img.width / 2;
        const imgCenterY = (img.y / 100) * rect.height + img.height / 2;

        // Calculate distance from mouse
        const dx = mouseRef.current.x - imgCenterX;
        const dy = mouseRef.current.y - imgCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let newVx = img.vx;
        let newVy = img.vy;

        // Push away from mouse if close (smooth but responsive)
        const pushRadius = 220;
        if (distance < pushRadius && distance > 0) {
          // Quadratic falloff for smooth but noticeable interaction
          const normalizedDist = distance / pushRadius;
          const easing = Math.pow(1 - normalizedDist, 2); // Quadratic ease
          const force = easing * 0.015;
          newVx -= (dx / distance) * force;
          newVy -= (dy / distance) * force;
        }

        // Collision with other images - prevent edge overlap
        prev.forEach((other, otherIndex) => {
          if (index === otherIndex) return;

          const padding = 60; // Gap between images
          const imgLeft = (img.x / 100) * rect.width;
          const imgRight = imgLeft + img.width;
          const imgTop = (img.y / 100) * rect.height;
          const imgBottom = imgTop + img.height;

          const otherLeft = (other.x / 100) * rect.width;
          const otherRight = otherLeft + other.width;
          const otherTop = (other.y / 100) * rect.height;
          const otherBottom = otherTop + other.height;

          // Check for overlap with padding
          const overlapX = Math.min(imgRight + padding, otherRight + padding) - Math.max(imgLeft - padding, otherLeft - padding);
          const overlapY = Math.min(imgBottom + padding, otherBottom + padding) - Math.max(imgTop - padding, otherTop - padding);

          if (overlapX > 0 && overlapY > 0) {
            // Push apart based on centers - extremely gentle
            const imgCenterXPos = imgLeft + img.width / 2;
            const imgCenterYPos = imgTop + img.height / 2;
            const otherCenterX = otherLeft + other.width / 2;
            const otherCenterY = otherTop + other.height / 2;

            const dx = imgCenterXPos - otherCenterX;
            const dy = imgCenterYPos - otherCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            // Extremely gradual push force
            const force = Math.min(overlapX, overlapY) * 0.0003;
            newVx += (dx / dist) * force / rect.width * 100;
            newVy += (dy / dist) * force / rect.height * 100;
          }
        });

        // Keep away from center (header and search area)
        const centerX = rect.width / 2;
        const centerY = rect.height * 0.35;
        const dxCenter = imgCenterX - centerX;
        const dyCenter = imgCenterY - centerY;

        // Elliptical safe zone around header
        const safeRadiusX = rect.width * 0.32;
        const safeRadiusY = rect.height * 0.38;
        const normalizedDist = Math.sqrt(
          (dxCenter * dxCenter) / (safeRadiusX * safeRadiusX) +
          (dyCenter * dyCenter) / (safeRadiusY * safeRadiusY)
        );

        if (normalizedDist < 1 && normalizedDist > 0) {
          const force = (1 - normalizedDist) * 0.008;
          const pushX = dxCenter / safeRadiusX;
          const pushY = dyCenter / safeRadiusY;
          const pushMag = Math.sqrt(pushX * pushX + pushY * pushY);
          if (pushMag > 0) {
            newVx += (pushX / pushMag) * force;
            newVy += (pushY / pushMag) * force;
          }
        }

        // Apply gentle drift (cloud-like movement) - stronger on mobile since no mouse interaction
        const isMobileDrift = window.innerWidth < 640;
        const driftStrength = isMobileDrift ? 0.0012 : 0.0003;
        newVx += (Math.random() - 0.5) * driftStrength;
        newVy += (Math.random() - 0.5) * driftStrength * 0.8;

        // Ensure minimum velocity so images always float gently
        const minVelocity = 0.002;
        const currentSpeed = Math.sqrt(newVx * newVx + newVy * newVy);
        if (currentSpeed < minVelocity) {
          // Add a gentle push in a random direction
          const angle = Math.random() * Math.PI * 2;
          newVx += Math.cos(angle) * minVelocity;
          newVy += Math.sin(angle) * minVelocity;
        }

        // Very strong damping (dreamy, slow resistance)
        newVx *= 0.995;
        newVy *= 0.995;

        // Limit velocity (very slow, dreamy movement)
        const maxVel = 0.015;
        newVx = Math.max(-maxVel, Math.min(maxVel, newVx));
        newVy = Math.max(-maxVel, Math.min(maxVel, newVy));

        // Update position
        let newX = img.x + newVx;
        let newY = img.y + newVy;

        // Calculate boundaries based on image size with edge margin
        const edgeMargin = 5; // Keep 5% away from edges
        const imgWidthPercent = (img.width / rect.width) * 100;
        const imgHeightPercent = (img.height / rect.height) * 100;
        const isMobileView = window.innerWidth < 640;
        const minX = edgeMargin;
        const maxX = Math.max(edgeMargin, 100 - imgWidthPercent - edgeMargin);
        const minY = edgeMargin;
        // On mobile, restrict images to top 40% of screen (above header at 45vh)
        const maxY = isMobileView
          ? Math.max(edgeMargin, 40 - imgHeightPercent)
          : Math.max(edgeMargin, 100 - imgHeightPercent - edgeMargin);

        // Soft boundaries - bounce back gently
        if (newX < minX) {
          newX = minX;
          newVx = Math.abs(newVx) * 0.5;
        }
        if (newX > maxX) {
          newX = maxX;
          newVx = -Math.abs(newVx) * 0.5;
        }
        if (newY < minY) {
          newY = minY;
          newVy = Math.abs(newVy) * 0.5;
        }
        if (newY > maxY) {
          newY = maxY;
          newVy = -Math.abs(newVy) * 0.5;
        }

        // Update rotation
        let newRotation = img.rotation + img.rotationSpeed;
        if (Math.abs(newRotation) > 8) {
          newRotation = img.rotation;
        }

        return {
          ...img,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
          rotation: newRotation,
        };
      });

      return updated;
    });

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // Start animation loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  if (images.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
    >
      {floatingImages.map((floatImg, index) => {
          const isVisible = index < visibleCount;
          const hasExited = isExiting && index < exitingCount;

          return (
          <div
            key={floatImg.image.filename}
            className={`absolute transition-opacity ease-in-out ${
              hasExited ? "opacity-0 duration-500" : isVisible ? "opacity-[0.55] duration-[1500ms]" : "opacity-0 duration-[1500ms]"
            }`}
            style={{
              left: `${floatImg.x}%`,
              top: `${floatImg.y}%`,
              width: floatImg.width,
              height: floatImg.height,
            }}
          >
            <img
              src={failedImages.has(floatImg.image.filename) ? getOriginalImageUrl(floatImg.image.filename) : floatImg.image.thumbnailUrl}
              alt={floatImg.image.description}
              className={`w-full h-full object-cover rounded-xl shadow-xl transition-opacity duration-500 ${
                loadedImages.has(floatImg.image.filename) ? 'opacity-100' : 'opacity-0'
              }`}
              onError={() => handleImageError(floatImg.image.filename)}
              onLoad={() => handleImageLoad(floatImg.image.filename)}
              draggable={false}
            />
          </div>
        );
        })}
    </div>
  );
}
