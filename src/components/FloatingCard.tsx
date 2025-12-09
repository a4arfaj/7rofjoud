import { useEffect, useRef, useState } from 'react';

type FloatingCardProps = {
  visible: boolean;
  label: string;
  onStartRedPhase: () => void;
};

type Position = { x: number; bottom: number };

const STORAGE_KEY = 'cardPosition';

function FloatingCard({ visible, label, onStartRedPhase }: FloatingCardProps) {
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });
  const longPressTimerRef = useRef<number | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const cardElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        setPosition(pos);
      } catch {
        /* ignore parse errors */
      }
    }
  }, []);

  useEffect(() => {
    if (position) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    }
  }, [position]);

  const startDragTimer = (e: React.PointerEvent) => {
    const startX = e.clientX;
    const startY = e.clientY;
    dragStartPosRef.current = { x: startX, y: startY };

    longPressTimerRef.current = window.setTimeout(() => {
      setIsDragging(true);
      if (cardElementRef.current) {
        cardElementRef.current.setPointerCapture(e.pointerId);
      }
    }, 2000);
  };

  const clearDragTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    startDragTimer(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartPosRef.current) return;

    e.preventDefault();
    const deltaX = e.clientX - dragStartPosRef.current.x;
    const deltaY = dragStartPosRef.current.y - e.clientY;

    const currentX = position?.x ?? windowSize.width / 2;
    const currentBottom = position?.bottom ?? 20;

    const newX = currentX + deltaX;
    const newBottom = currentBottom + deltaY;

    const constrainedX = Math.max(50, Math.min(windowSize.width - 50, newX));
    const constrainedBottom = Math.max(20, Math.min(windowSize.height - 20, newBottom));

    setPosition({ x: constrainedX, bottom: constrainedBottom });
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    clearDragTimer();
    if (isDragging) {
      setIsDragging(false);
      if (cardElementRef.current) {
        cardElementRef.current.releasePointerCapture(e.pointerId);
      }
      dragStartPosRef.current = null;
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={cardElementRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`relative px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-lg bg-green-500 text-white mx-auto my-4 max-w-sm w-full ${
        isDragging ? 'cursor-move opacity-80' : 'transition-all'
      }`}
      dir="rtl"
      style={{
        maxWidth: 'min(420px, calc(100vw - 16px))',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {isDragging && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white bg-black/50 px-2 py-1 rounded">
          حرك البطاقة
        </div>
      )}
      <div className="text-center">
        <div className="text-xl sm:text-2xl font-bold animate-pulse">{label || '---'}</div>
        <div className="text-xs sm:text-sm mb-2">ضغط الزر!</div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartRedPhase();
          }}
          className="mt-2 bg-white text-green-600 px-4 py-2 rounded-full text-xs sm:text-sm font-bold hover:bg-gray-100 active:scale-95 transition-transform"
        >
          استأنف جولة
        </button>
      </div>
    </div>
  );
}

export default FloatingCard;

