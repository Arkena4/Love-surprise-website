import { useMemo } from 'react';

interface Props {
  color?: string;
  count?: number;
}

export function FloatingHearts({ color = '#f472b6', count = 14 }: Props) {
  const hearts = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 12 + Math.random() * 22,
        duration: 8 + Math.random() * 12,
        delay: Math.random() * 12,
        opacity: 0.3 + Math.random() * 0.4,
      })),
    [count]
  );

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
      {hearts.map((h) => (
        <svg
          key={h.id}
          viewBox="0 0 24 24"
          className="absolute bottom-[-40px]"
          style={{
            left: `${h.left}%`,
            width: h.size,
            height: h.size,
            opacity: h.opacity,
            animation: `floatUp ${h.duration}s linear ${h.delay}s infinite`,
          }}
        >
          <path
            fill={color}
            d="M12 21s-6.7-4.35-9.5-8.5C.5 9.5 2 5.5 5.5 5.5c2 0 3.5 1.5 4.5 3 1-1.5 2.5-3 4.5-3 3.5 0 5 4 3 7C19 16.65 12 21 12 21z"
          />
        </svg>
      ))}
    </div>
  );
}
