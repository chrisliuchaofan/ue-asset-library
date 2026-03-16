'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const GalaxyBackground = dynamic(
    () => import('@/components/galaxy-background').then((mod) => ({ default: mod.GalaxyBackground })),
    {
        ssr: false,
        loading: () => <div className="absolute inset-0 bg-black" />
    }
) as React.ComponentType<{
    focal?: [number, number];
    rotation?: [number, number];
    starSpeed?: number;
    density?: number;
    hueShift?: number;
    disableAnimation?: boolean;
    speed?: number;
    mouseInteraction?: boolean;
    glowIntensity?: number;
    saturation?: number;
    mouseRepulsion?: boolean;
    twinkleIntensity?: number;
    rotationSpeed?: number;
    repulsionStrength?: number;
    autoCenterRepulsion?: number;
    transparent?: boolean;
    className?: string;
    targetFPS?: number;
}>;

export function GalaxyWrapper() {
    return (
        <div className="fixed inset-0 z-0">
            <GalaxyBackground
                focal={[0.5, 0.5]}
                rotation={[1.0, 0.0]}
                starSpeed={0.3}
                density={0.8}
                hueShift={140}
                disableAnimation={false}
                speed={0.6}
                mouseInteraction={false}
                glowIntensity={0.2}
                saturation={0.0}
                mouseRepulsion={false}
                twinkleIntensity={0.2}
                rotationSpeed={0.05}
                repulsionStrength={0}
                autoCenterRepulsion={0}
                transparent={true}
                targetFPS={30}
            />
        </div>
    );
}
