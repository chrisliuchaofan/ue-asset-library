'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';

type AnimateBy = 'words' | 'letters';
type Direction = 'top' | 'bottom';
type AnimationSnapshot = Record<string, string | number>;

interface BlurTextProps {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: AnimateBy;
  direction?: Direction;
  threshold?: number;
  rootMargin?: string;
  animationFrom?: AnimationSnapshot;
  animationTo?: AnimationSnapshot[];
  easing?: (t: number) => number;
  onAnimationComplete?: () => void;
  stepDuration?: number;
  initialDelay?: number;
  loop?: number;
}

const buildKeyframes = (
  from: AnimationSnapshot,
  steps: AnimationSnapshot[]
): Record<string, Array<string | number>> => {
  const keys = new Set<string>([...Object.keys(from), ...steps.flatMap(step => Object.keys(step))]);
  const keyframes: Record<string, Array<string | number>> = {};

  for (const key of keys) {
    keyframes[key] = [from[key], ...steps.map(step => step[key])];
  }

  return keyframes;
};

export function BlurText({
  text = '',
  delay = 200,
  className = '',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  easing = (t: number) => t,
  stepDuration = 0.35,
  animationFrom,
  animationTo,
  onAnimationComplete,
  initialDelay = 0,
  loop = 1,
}: BlurTextProps) {
  const rootRef = useRef<HTMLParagraphElement>(null);
  const [inView, setInView] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [completionFired, setCompletionFired] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const elements = useMemo(() => {
    return animateBy === 'words' ? text.split(' ') : text.split('');
  }, [text, animateBy]);

  const defaultFrom = useMemo<AnimationSnapshot>(() => {
    return direction === 'top'
      ? { filter: 'blur(10px)', opacity: 0, y: -50 }
      : { filter: 'blur(10px)', opacity: 0, y: 50 };
  }, [direction]);

  const defaultTo = useMemo<AnimationSnapshot[]>(() => {
    return [
      {
        filter: 'blur(5px)',
        opacity: 0.5,
        y: direction === 'top' ? 5 : -5,
      },
      {
        filter: 'blur(0px)',
        opacity: 1,
        y: 0,
      },
    ];
  }, [direction]);

  const fromSnapshot = useMemo(() => animationFrom ?? defaultFrom, [animationFrom, defaultFrom]);
  const toSnapshots = useMemo(() => animationTo ?? defaultTo, [animationTo, defaultTo]);

  const stepCount = useMemo(() => toSnapshots.length + 1, [toSnapshots.length]);
  const totalDuration = useMemo(() => stepDuration * (stepCount - 1), [stepDuration, stepCount]);
  const times = useMemo(
    () =>
      Array.from({ length: stepCount }, (_, i) =>
        stepCount === 1 ? 0 : i / (stepCount - 1)
      ),
    [stepCount]
  );

  const getAnimateKeyframes = useCallback(() => {
    return buildKeyframes(fromSnapshot, toSnapshots);
  }, [fromSnapshot, toSnapshots]);

  const getTransition = useCallback(
    (index: number) => {
      return {
        duration: totalDuration,
        times: times,
        delay: (index * delay) / 1000,
        ease: easing,
      };
    },
    [totalDuration, times, delay, easing]
  );

  const handleAnimationComplete = useCallback(
    (index: number) => {
      if (index === elements.length - 1) {
        const currentLoop = loopCount;
        if (currentLoop < loop - 1) {
          // 继续循环：重置到初始状态，然后重新开始
          setShouldAnimate(false);
          setLoopCount((prev) => prev + 1);
          // 延迟后重新开始动画
          setTimeout(() => {
            setAnimationKey((prev) => prev + 1);
            setTimeout(() => {
              setShouldAnimate(true);
            }, 50);
          }, 500); // 循环之间的间隔
        } else {
          // 所有循环完成
          if (!completionFired && onAnimationComplete) {
            setCompletionFired(true);
            onAnimationComplete();
          }
        }
      }
    },
    [elements.length, completionFired, onAnimationComplete, loop, loopCount]
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          // 延迟后开始动画
          setTimeout(() => {
            setShouldAnimate(true);
          }, initialDelay);
          observerRef.current?.unobserve(root);
        }
      },
      {
        threshold: threshold,
        rootMargin: rootMargin,
      }
    );

    observerRef.current.observe(root);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin, initialDelay]);

  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
    setCompletionFired(false);
    setLoopCount(0);
    setShouldAnimate(false);
  }, [delay, stepDuration, animateBy, direction, loop]);

  return (
    <p
      ref={rootRef}
      className={`blur-text ${className} flex flex-wrap`}
    >
      {elements.map((segment, index) => (
        <motion.span
          key={`${animationKey}-${index}`}
          initial={fromSnapshot}
          animate={shouldAnimate ? getAnimateKeyframes() : fromSnapshot}
          transition={getTransition(index)}
          style={{
            display: 'inline-block',
            willChange: 'transform, filter, opacity',
          }}
          onAnimationComplete={() => {
            handleAnimationComplete(index);
          }}
        >
          {segment === ' ' ? '\u00A0' : segment}
          {animateBy === 'words' && index < elements.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </p>
  );
}

