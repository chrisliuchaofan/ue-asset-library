import React, { useEffect, useRef, useState } from 'react';

const BackgroundMusic: React.FC<{ started: boolean }> = ({ started }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Use a royalty-free ambient track
  const MUSIC_URL = "https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3"; 

  useEffect(() => {
    if (started && !hasInteracted) {
      setHasInteracted(true);
      if (audioRef.current) {
        audioRef.current.volume = 0.3;
        audioRef.current.play().catch(e => console.log("Autoplay prevented:", e));
      }
    }
  }, [started, hasInteracted]);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <audio ref={audioRef} src={MUSIC_URL} loop />
      {hasInteracted && (
        <button 
          onClick={toggleMute}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
        >
          {muted ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
          ) : (
             <div className="flex gap-1 h-3 items-end">
               <div className="w-1 bg-indigo-400 animate-[pulse_1s_ease-in-out_infinite] h-full"></div>
               <div className="w-1 bg-indigo-400 animate-[pulse_1.2s_ease-in-out_infinite] h-2/3"></div>
               <div className="w-1 bg-indigo-400 animate-[pulse_0.8s_ease-in-out_infinite] h-full"></div>
             </div>
          )}
        </button>
      )}
    </div>
  );
};

export default BackgroundMusic;