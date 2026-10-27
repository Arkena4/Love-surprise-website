import { useEffect, useRef, useState } from 'react';
import { Music, Music2, Volume2, VolumeX } from 'lucide-react';

interface Props {
  url: string;
  accentClass?: string;
}

export function MusicPlayer({ url, accentClass = 'text-pink-600' }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  if (!url) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 shadow-lg backdrop-blur">
      <audio ref={audioRef} src={url} loop preload="none" />
      <button
        onClick={() => setPlaying((current) => !current)}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:scale-110 ${accentClass}`}
        aria-label={playing ? 'Pause music' : 'Play music'}
      >
        {playing ? <Music2 size={18} /> : <Music size={18} />}
      </button>
      <button
        onClick={() => setMuted((current) => !current)}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:scale-110 ${accentClass}`}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  );
}
