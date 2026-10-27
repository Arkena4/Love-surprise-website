import { useMemo } from 'react';

interface Props {
  color?: string;
  count?: number;
}

export function Sparkles({ color = '#fbbf24', count = 18 }: Props) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 6 + Math.random() * 10,
        duration: 2 + Math.random() * 3,
        delay: Math.random() * 3,
      })),
    [count]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {stars.map((s) => (
        <svg
          key={s.id}
          viewBox="0 0 24 24"
          className="absolute"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            color,
            animation: `sparkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        >
          <path
            fill="currentColor"
            d="M12 0l1.8 8.2L22 10l-8.2 1.8L12 20l-1.8-8.2L2 10l8.2-1.8z"
          />
        </svg>
      ))}
    </div>
  );
}
