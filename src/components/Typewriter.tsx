import { useEffect, useRef, useState } from 'react';

interface Props {
  text: string;
  speed?: number;
  className?: string;
  onDone?: () => void;
  startDelay?: number;
}

export function Typewriter({ text, speed = 28, className = '', onDone, startDelay = 0 }: Props) {
  const [shown, setShown] = useState('');
  const [started, setStarted] = useState(false);
  const idx = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(t);
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;
    if (idx.current >= text.length) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
      return;
    }
    const t = setTimeout(() => {
      setShown(text.slice(0, idx.current + 1));
      idx.current += 1;
    }, speed);
    return () => clearTimeout(t);
  }, [shown, started, text, speed, onDone]);

  return (
    <span className={className}>
      {shown}
      <span className="animate-pulse">▍</span>
    </span>
  );
}
