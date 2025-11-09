'use client';

import { useEffect, useRef } from 'react';

interface ParticlesProps {
  particleCount?: number;
  particleSpread?: number;
  speed?: number;
  particleColors?: string[];
  moveParticlesOnHover?: boolean;
  particleHoverFactor?: number;
  alphaParticles?: boolean;
  particleBaseSize?: number;
  sizeRandomness?: number;
  cameraDistance?: number;
  disableRotation?: boolean;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  random: number[];
}

export function ParticlesBackground({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors = ['#ffffff'],
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = true,
  particleBaseSize = 4,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  className = '',
}: ParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let isRunning = true;

    // 设置画布大小
    const resizeCanvas = () => {
      if (!container || !canvas || !isRunning) return;
      const rect = container.getBoundingClientRect();
      const width = Math.max(rect.width || window.innerWidth, 300);
      const height = Math.max(rect.height || window.innerHeight, 300);
      canvas.width = width;
      canvas.height = height;
    };

    // 初始化粒子
    const initParticles = () => {
      particlesRef.current = [];
      const palette = particleColors.length > 0 ? particleColors : ['#ffffff'];
      
      for (let i = 0; i < particleCount; i++) {
        // 在单位球体内均匀分布
        let x: number, y: number, z: number, len: number;
        do {
          x = Math.random() * 2 - 1;
          y = Math.random() * 2 - 1;
          z = Math.random() * 2 - 1;
          len = x * x + y * y + z * z;
        } while (len > 1 || len === 0);
        
        const r = Math.cbrt(Math.random()); // 均匀分布
        x *= r;
        y *= r;
        z *= r;

        const size = Math.max(1, particleBaseSize * (1 + (Math.random() - 0.5) * sizeRandomness));
        const color = palette[Math.floor(Math.random() * palette.length)];

        particlesRef.current.push({
          x: x * particleSpread,
          y: y * particleSpread,
          z: z * particleSpread,
          size,
          color,
          random: [Math.random(), Math.random(), Math.random(), Math.random()],
        });
      }
    };

    // 鼠标移动处理
    const handleMouseMove = (e: MouseEvent) => {
      if (!container || !isRunning) return;
      const rect = container.getBoundingClientRect();
      mouseRef.current = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      };
    };

    // 初始化
    resizeCanvas();
    initParticles();
    
    const resizeHandler = () => {
      if (isRunning) resizeCanvas();
    };
    window.addEventListener('resize', resizeHandler);
    
    if (moveParticlesOnHover) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    // 动画循环
    const animate = (currentTime: number) => {
      if (!isRunning || !canvas || !ctx) return;
      
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (timeRef.current === 0) {
        timeRef.current = currentTime;
      }
      const delta = currentTime - timeRef.current;
      timeRef.current = currentTime;
      const elapsed = currentTime * speed * 0.001;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const fov = cameraDistance;

      // 更新旋转
      if (!disableRotation) {
        rotationRef.current.x = Math.sin(elapsed * 0.2) * 0.1;
        rotationRef.current.y = Math.cos(elapsed * 0.5) * 0.15;
        rotationRef.current.y += elapsed * 0.01 * speed;
      }

      // 鼠标交互偏移
      let offsetX = 0;
      let offsetY = 0;
      if (moveParticlesOnHover) {
        offsetX = -mouseRef.current.x * particleHoverFactor;
        offsetY = -mouseRef.current.y * particleHoverFactor;
      }

      // 更新和绘制粒子
      particlesRef.current.forEach((particle) => {
        // 应用鼠标偏移
        let x = particle.x + offsetX;
        let y = particle.y + offsetY;
        let z = particle.z;

        // 应用旋转
        const cosY = Math.cos(rotationRef.current.y);
        const sinY = Math.sin(rotationRef.current.y);
        let x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        const cosX = Math.cos(rotationRef.current.x);
        const sinX = Math.sin(rotationRef.current.x);
        let y1 = y * cosX - z1 * sinX;
        let z2 = y * sinX + z1 * cosX;

        // 添加动画效果（类似原版）
        const t = elapsed;
        x1 += Math.sin(t * particle.random[2] + 6.28 * particle.random[3]) * (0.1 + particle.random[0] * 1.4);
        y1 += Math.sin(t * particle.random[1] + 6.28 * particle.random[0]) * (0.1 + particle.random[3] * 1.4);
        z2 += Math.sin(t * particle.random[3] + 6.28 * particle.random[1]) * (0.1 + particle.random[2] * 1.4);

        // 3D 投影
        const scale = fov / (fov + z2);
        const screenX = centerX + x1 * scale;
        const screenY = centerY + y1 * scale;
        const screenSize = particle.size * scale;

        // 绘制粒子
        if (screenSize > 0.5 && screenX >= -100 && screenX <= canvas.width + 100 && screenY >= -100 && screenY <= canvas.height + 100) {
          ctx.save();
          
          // 根据距离调整透明度
          const distanceAlpha = Math.max(0.4, Math.min(1, (fov + z2) / (fov + particleSpread * 2)));
          ctx.globalAlpha = alphaParticles ? distanceAlpha * 0.9 : distanceAlpha;
          
          // 解析颜色
          let r = 255, g = 255, b = 255;
          if (particle.color.startsWith('#')) {
            const hex = particle.color.replace('#', '');
            if (hex.length === 6) {
              r = parseInt(hex.substring(0, 2), 16);
              g = parseInt(hex.substring(2, 4), 16);
              b = parseInt(hex.substring(4, 6), 16);
            }
          } else if (particle.color.startsWith('rgba')) {
            const match = particle.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
              r = parseInt(match[1]);
              g = parseInt(match[2]);
              b = parseInt(match[3]);
            }
          }
          
          // 添加颜色动画
          const colorOffset = Math.sin(t + particle.random[1] * 6.28) * 0.15;
          const finalR = Math.min(255, Math.max(0, r + colorOffset * 255));
          const finalG = Math.min(255, Math.max(0, g + colorOffset * 255));
          const finalB = Math.min(255, Math.max(0, b + colorOffset * 255));
          
          ctx.beginPath();
          const radius = Math.max(1, screenSize / 2);
          
          // 绘制圆形粒子
          if (alphaParticles) {
            // 软边缘
            const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
            const baseColor = `rgba(${finalR}, ${finalG}, ${finalB}, ${ctx.globalAlpha})`;
            gradient.addColorStop(0, baseColor);
            gradient.addColorStop(0.6, baseColor.replace(/[\d.]+\)$/, '0.6)'));
            gradient.addColorStop(1, baseColor.replace(/[\d.]+\)$/, '0)'));
            ctx.fillStyle = gradient;
          } else {
            ctx.fillStyle = `rgb(${finalR}, ${finalG}, ${finalB})`;
          }
          
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    };

    // 启动动画（延迟一点确保 DOM 已渲染）
    const startAnimation = () => {
      if (isRunning) {
        timeRef.current = 0;
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    // 延迟启动，确保容器有尺寸
    const initTimeout = setTimeout(startAnimation, 100);

    return () => {
      isRunning = false;
      clearTimeout(initTimeout);
      window.removeEventListener('resize', resizeHandler);
      if (moveParticlesOnHover) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    particleCount,
    particleSpread,
    speed,
    particleColors,
    moveParticlesOnHover,
    particleHoverFactor,
    alphaParticles,
    particleBaseSize,
    sizeRandomness,
    cameraDistance,
    disableRotation,
  ]);

  return (
    <div ref={containerRef} className={`absolute inset-0 w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none', display: 'block' }}
      />
    </div>
  );
}
