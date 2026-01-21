import { useEffect, useState, useRef } from "react";

interface SootSprite {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  rotation: number;
}

interface CursorSparklesProps {
  enabled?: boolean;
}

export function CursorSparkles({ enabled = true }: CursorSparklesProps) {
  const [sprites, setSprites] = useState<SootSprite[]>([]);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const idRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setSprites([]);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Create soot sprites when moving
      if (distance > 20) {
        setSprites(prev => [...prev.slice(-8), {
          id: idRef.current++,
          x: e.clientX + (Math.random() - 0.5) * 40,
          y: e.clientY + (Math.random() - 0.5) * 40,
          size: Math.random() * 4 + 8,
          opacity: 0.55,
          rotation: Math.random() * 360,
        }]);
        lastPosRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [enabled]);

  // Fade out and float up
  useEffect(() => {
    const interval = setInterval(() => {
      setSprites(prev =>
        prev
          .map(s => ({
            ...s,
            opacity: s.opacity - 0.025,
            y: s.y - 0.8,
            rotation: s.rotation + 2
          }))
          .filter(s => s.opacity > 0)
      );
    }, 40);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {sprites.map(sprite => (
        <div
          key={sprite.id}
          className="absolute"
          style={{
            left: sprite.x,
            top: sprite.y,
            width: sprite.size,
            height: sprite.size,
            opacity: sprite.opacity,
            transform: `translate(-50%, -50%) rotate(${sprite.rotation}deg)`,
            filter: `drop-shadow(0 0 ${sprite.size * 0.4}px rgba(120, 120, 120, 0.5))`,
          }}
        >
          {/* Spiky fuzzy body */}
          <div
            className="absolute rounded-full bg-slate-900"
            style={{
              inset: '15%',
              boxShadow: `
                0 -${sprite.size * 0.35}px 0 -${sprite.size * 0.12}px #1a1a1a,
                0 ${sprite.size * 0.35}px 0 -${sprite.size * 0.12}px #1a1a1a,
                ${sprite.size * 0.35}px 0 0 -${sprite.size * 0.12}px #1a1a1a,
                -${sprite.size * 0.35}px 0 0 -${sprite.size * 0.12}px #1a1a1a,
                ${sprite.size * 0.25}px -${sprite.size * 0.25}px 0 -${sprite.size * 0.12}px #1a1a1a,
                -${sprite.size * 0.25}px -${sprite.size * 0.25}px 0 -${sprite.size * 0.12}px #1a1a1a,
                ${sprite.size * 0.25}px ${sprite.size * 0.25}px 0 -${sprite.size * 0.12}px #1a1a1a,
                -${sprite.size * 0.25}px ${sprite.size * 0.25}px 0 -${sprite.size * 0.12}px #1a1a1a,
                ${sprite.size * 0.32}px -${sprite.size * 0.15}px 0 -${sprite.size * 0.13}px #1a1a1a,
                -${sprite.size * 0.32}px -${sprite.size * 0.15}px 0 -${sprite.size * 0.13}px #1a1a1a,
                ${sprite.size * 0.32}px ${sprite.size * 0.15}px 0 -${sprite.size * 0.13}px #1a1a1a,
                -${sprite.size * 0.32}px ${sprite.size * 0.15}px 0 -${sprite.size * 0.13}px #1a1a1a
              `
            }}
          />
          {/* Left eye */}
          <div
            className="absolute rounded-full bg-white"
            style={{
              width: sprite.size * 0.38,
              height: sprite.size * 0.38,
              left: '10%',
              top: '25%',
            }}
          >
            <div
              className="absolute rounded-full bg-slate-900"
              style={{
                width: '20%',
                height: '20%',
                left: '40%',
                top: '40%',
              }}
            />
          </div>
          {/* Right eye */}
          <div
            className="absolute rounded-full bg-white"
            style={{
              width: sprite.size * 0.38,
              height: sprite.size * 0.38,
              right: '10%',
              top: '25%',
            }}
          >
            <div
              className="absolute rounded-full bg-slate-900"
              style={{
                width: '20%',
                height: '20%',
                left: '40%',
                top: '40%',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
