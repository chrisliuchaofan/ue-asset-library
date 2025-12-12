import React from 'react';

const ThinkingAnimation: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in">
      <div className="relative w-96 h-96 flex items-center justify-center">
        {/* Radiant Core - Brighter and spreading */}
        <div className="absolute w-12 h-12 bg-white rounded-full blur-[20px] animate-pulse"></div>
        <div className="absolute w-32 h-32 bg-indigo-300 rounded-full blur-[60px] opacity-60 animate-pulse"></div>
        <div className="absolute w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-30 animate-pulse delay-75"></div>

        {/* Outward Ripples */}
        <div className="absolute border border-white/40 w-24 h-24 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
        <div className="absolute border border-indigo-400/30 w-48 h-48 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] delay-300"></div>
        <div className="absolute border border-purple-400/20 w-72 h-72 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] delay-700"></div>
        
        {/* Rotating Light Beams */}
        <div className="absolute w-full h-full animate-[spin_10s_linear_infinite]">
             <div className="absolute top-1/2 left-1/2 w-[120%] h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-1/2 blur-sm rotate-45"></div>
             <div className="absolute top-1/2 left-1/2 w-[120%] h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-1/2 blur-sm -rotate-45"></div>
        </div>

        {/* Orbiting Bright Stars */}
        <div className="absolute w-48 h-48 animate-[spin_4s_linear_infinite]">
             <div className="absolute top-0 left-1/2 w-3 h-3 bg-white rounded-full blur-[2px] shadow-[0_0_15px_#ffffff]"></div>
        </div>
        <div className="absolute w-32 h-32 animate-[spin_3s_linear_infinite_reverse]">
             <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-indigo-200 rounded-full blur-[1px] shadow-[0_0_10px_#c7d2fe]"></div>
        </div>
      </div>
      
      <div className="mt-12 text-center space-y-3 z-10">
        <h3 className="text-big font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-100 brand-font tracking-widest uppercase animate-pulse drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
          造梦中
        </h3>
        <p className="text-small text-indigo-200/70 font-mono tracking-widest">DREAMING IN PROGRESS</p>
      </div>
    </div>
  );
};

export default ThinkingAnimation;