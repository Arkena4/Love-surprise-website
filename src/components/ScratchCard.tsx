import { useEffect, useRef, useState } from 'react';
import { Gift } from 'lucide-react';

interface Props {
  reveal: string;
  color: string;
  accentDark: string;
}

export function ScratchCard({ reveal, color, accentDark }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const drawing = useRef(false);
  const wipedRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
      const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      grad.addColorStop(0, color);
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '600 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scratch to reveal your surprise', rect.width / 2, rect.height / 2);
    };

    setup();
  }, [color]);

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const wipe = (x: number, y: number) => {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    wipedRef.current += 1;
    if (wipedRef.current > 40 && !revealed) {
      setRevealed(true);
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    }
  };

  return (
    <div className="relative mx-auto h-40 w-full max-w-md overflow-hidden rounded-2xl shadow-md">
      <div className="flex h-full w-full items-center justify-center p-4 text-center">
        {revealed ? (
          <p className="font-script text-xl leading-relaxed">{reveal}</p>
        ) : (
          <p className="font-serif-display text-lg opacity-70">A secret awaits…</p>
        )}
      </div>
      {!revealed && (
        <canvas
          ref={canvasRef}
          className="scratch-canvas absolute inset-0 h-full w-full cursor-pointer"
          onPointerDown={(e) => {
            drawing.current = true;
            const { x, y } = pos(e);
            wipe(x, y);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const { x, y } = pos(e);
            wipe(x, y);
          }}
          onPointerUp={() => (drawing.current = false)}
          onPointerLeave={() => (drawing.current = false)}
        />
      )}
      <div
        className={`pointer-events-none absolute -top-2 -right-2 rounded-full p-2 ${accentDark} text-white shadow`}
      >
        <Gift size={16} />
      </div>
    </div>
  );
}
