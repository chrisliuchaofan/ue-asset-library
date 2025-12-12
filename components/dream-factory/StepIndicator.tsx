import React from 'react';
import { AppStep } from '@/types/dream-factory/types';

interface StepIndicatorProps {
  currentStep: AppStep;
}

const steps = [
  { id: AppStep.IDEA_INPUT, label: '创意' },
  { id: AppStep.CONCEPT_SELECTION, label: '方案' },
  { id: AppStep.STORYBOARD_GENERATION, label: '分镜' },
  { id: AppStep.VISUALIZATION, label: '画面' },
  { id: AppStep.PRODUCTION, label: '视频' },
  { id: AppStep.POST_PRODUCTION, label: '成片' },
];

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  if (currentStep === AppStep.API_CHECK) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mb-6 relative z-10 px-4">
      <style>{`
        @keyframes gradient-flow {
          0% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-flow {
          background-size: 200% 200%;
          animation: gradient-flow 3s linear infinite;
        }
      `}</style>
      
      <div className="flex justify-between items-center relative">
        {/* Background Rail */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 rounded-full -z-20"></div>
        
        {/* Active Progress Line with Flowing Gradient */}
        <div 
          className="absolute top-1/2 left-0 h-1 rounded-full -z-10 transition-all duration-700 ease-out animate-gradient-flow shadow-[0_0_15px_rgba(79,70,229,0.6)]"
          style={{ 
            width: `${Math.min(100, ((currentStep - 1) / (steps.length - 1)) * 100)}%`,
            backgroundImage: 'linear-gradient(90deg, #4f46e5, #ec4899, #8b5cf6, #4f46e5)'
          }}
        ></div>

        {steps.map((step) => {
          const isActive = currentStep >= step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div key={step.id} className="flex flex-col items-center relative group">
              {/* Dot */}
              <div 
                className={`
                  w-5 h-5 md:w-8 md:h-8 rounded-full flex items-center justify-center text-small font-bold border-2 transition-all duration-500 z-10
                  ${isActive 
                    ? 'bg-black border-transparent text-white shadow-[0_0_15px_rgba(236,72,153,0.6)] scale-110' 
                    : 'bg-black border-slate-700 text-slate-600'}
                `}
                style={isActive ? {
                   backgroundImage: 'linear-gradient(135deg, #4f46e5, #ec4899)',
                   backgroundClip: 'padding-box',
                   borderColor: 'transparent'
                } : {}}
              >
                {isActive ? (
                    <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    step.id
                )}
              </div>

              {/* Label */}
              <span 
                className={`
                  absolute -bottom-6 text-small font-medium transition-all duration-500 whitespace-nowrap
                  ${isCurrent 
                    ? 'text-pink-400 transform translate-y-0 opacity-100' 
                    : isActive 
                      ? 'text-indigo-300 transform translate-y-0 opacity-80' 
                      : 'text-slate-600 transform translate-y-1 opacity-0 md:opacity-100'}
                `}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;