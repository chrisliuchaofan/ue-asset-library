'use client';

import { useEffect, useRef } from 'react';

interface GalaxyProps {
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
  targetFPS?: number; // 目标帧率，用于性能优化（默认60，可设置为30等）
}

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;
uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform bool uTransparent;

varying vec2 vUv;

#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlowIntensity;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uGlowIntensity;
  m *= smoothstep(1.0, 0.2, d);
  return m;
}

vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0);
  vec2 gv = fract(uv) - 0.5; 
  vec2 id = floor(uv);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + vec2(float(x), float(y));
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;
      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float grn = min(red, blu) * seed;
      vec3 base = vec3(red, grn, blu);
      
      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
      hue = fract(hue + uHueShift / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));
      vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;
      float star = Star(gv - offset - pad, flareSize);
      vec3 color = base;
      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      star *= twinkle;
      
      col += star * size * color;
    }
  }
  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution.xy;
  vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;
  vec2 mouseNorm = uMouse - vec2(0.5);
  
  if (uAutoCenterRepulsion > 0.0) {
    vec2 centerUV = vec2(0.0, 0.0);
    float centerDist = length(uv - centerUV);
    vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
    uv += repulsion * 0.05;
  } else if (uMouseRepulsion) {
    vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
    float mouseDist = length(uv - mousePosUV);
    if (mouseDist > 0.001 && uMouseActiveFactor > 0.01) {
      vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
      uv += repulsion * 0.1 * uMouseActiveFactor; // 增强效果
    }
  } else {
    if (uMouseActiveFactor > 0.01) {
      vec2 mouseOffset = mouseNorm * 0.2 * uMouseActiveFactor; // 增强效果
      uv += mouseOffset;
    }
  }

  float autoRotAngle = uTime * uRotationSpeed;
  mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
  uv = autoRot * uv;
  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

  vec3 col = vec3(0.0);
  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    col += StarLayer(uv * scale + i * 453.32) * fade;
  }

  if (uTransparent) {
    float alpha = length(col);
    alpha = smoothstep(0.0, 0.3, alpha);
    alpha = min(alpha, 1.0);
    gl_FragColor = vec4(col, alpha);
  } else {
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

export function GalaxyBackground({
  focal = [0.5, 0.5],
  rotation = [1.0, 0.0],
  starSpeed = 0.5,
  density = 1,
  hueShift = 140,
  disableAnimation = false,
  speed = 1.0,
  mouseInteraction = true,
  glowIntensity = 0.3,
  saturation = 0.0,
  mouseRepulsion = true,
  twinkleIntensity = 0.3,
  rotationSpeed = 0.1,
  repulsionStrength = 2,
  autoCenterRepulsion = 0,
  transparent = true,
  className = '',
  targetFPS = 60,
}: GalaxyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetMousePosRef = useRef({ x: 0.5, y: 0.5 });
  const smoothMousePosRef = useRef({ x: 0.5, y: 0.5 });
  const targetMouseActiveRef = useRef(0.0);
  const smoothMouseActiveRef = useRef(0.0);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const container = containerRef.current;
    if (!container) return;

    let isRunning = true;

    import('ogl').then((ogl) => {
      const { Renderer, Program, Mesh, Color, Triangle } = ogl;

      const renderer = new Renderer({
        alpha: transparent,
        premultipliedAlpha: false,
      });

      const gl = renderer.gl;

      if (transparent) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
      } else {
        gl.clearColor(0, 0, 0, 1);
      }

      let program: any;

      // 先添加 canvas 到 DOM
      const canvas = gl.canvas as HTMLCanvasElement;
      if (canvas instanceof HTMLCanvasElement) {
        container.appendChild(canvas);
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = mouseInteraction ? 'auto' : 'none';
      }

      function resize() {
        if (!isRunning || !container) return;
        const scale = 1;
        const width = container.offsetWidth || window.innerWidth;
        const height = container.offsetHeight || window.innerHeight;
        renderer.setSize(width * scale, height * scale);
        if (program) {
          program.uniforms.uResolution.value = new Color(
            gl.canvas.width,
            gl.canvas.height,
            gl.canvas.width / gl.canvas.height
          );
        }
      }

      window.addEventListener('resize', resize, false);
      // 延迟 resize 确保容器有尺寸
      setTimeout(() => {
        resize();
      }, 0);

      const geometry = new Triangle(gl);

      program = new Program(gl, {
        vertex: vertexShader,
        fragment: fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uResolution: {
            value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height),
          },
          uFocal: { value: new Float32Array(focal) },
          uRotation: { value: new Float32Array(rotation) },
          uStarSpeed: { value: starSpeed },
          uDensity: { value: density },
          uHueShift: { value: hueShift },
          uSpeed: { value: speed },
          uMouse: {
            value: new Float32Array([smoothMousePosRef.current.x, smoothMousePosRef.current.y]),
          },
          uGlowIntensity: { value: glowIntensity },
          uSaturation: { value: saturation },
          uMouseRepulsion: { value: mouseRepulsion },
          uTwinkleIntensity: { value: twinkleIntensity },
          uRotationSpeed: { value: rotationSpeed },
          uRepulsionStrength: { value: repulsionStrength },
          uMouseActiveFactor: { value: 0.0 },
          uAutoCenterRepulsion: { value: autoCenterRepulsion },
          uTransparent: { value: transparent },
        },
      });

      const mesh = new Mesh(gl, { geometry, program });

      let animateId: number;
      let lastFrameTime = 0;
      const frameInterval = 1000 / targetFPS; // 计算每帧间隔（毫秒）

      function update(t: number) {
        if (!isRunning) return;
        animateId = requestAnimationFrame(update);

        // 帧率控制：如果目标帧率低于60fps，跳过部分帧
        const elapsed = t - lastFrameTime;
        if (elapsed < frameInterval) {
          return;
        }
        lastFrameTime = t - (elapsed % frameInterval);

        if (!disableAnimation) {
          program.uniforms.uTime.value = t * 0.001;
          program.uniforms.uStarSpeed.value = (t * 0.001 * starSpeed) / 10.0;
        }

        const lerpFactor = 0.05;
        smoothMousePosRef.current.x += (targetMousePosRef.current.x - smoothMousePosRef.current.x) * lerpFactor;
        smoothMousePosRef.current.y += (targetMousePosRef.current.y - smoothMousePosRef.current.y) * lerpFactor;
        smoothMouseActiveRef.current += (targetMouseActiveRef.current - smoothMouseActiveRef.current) * lerpFactor;

        program.uniforms.uMouse.value[0] = smoothMousePosRef.current.x;
        program.uniforms.uMouse.value[1] = smoothMousePosRef.current.y;
        program.uniforms.uMouseActiveFactor.value = smoothMouseActiveRef.current;

        renderer.render({ scene: mesh });
      }

      animateId = requestAnimationFrame(update);

      // 性能优化：节流鼠标事件（100ms）
      let lastMouseUpdate = 0;
      const mouseThrottleInterval = 100;

      function handleMouseMove(e: MouseEvent) {
        if (!container || !isRunning) return;
        const now = performance.now();
        if (now - lastMouseUpdate < mouseThrottleInterval) {
          return;
        }
        lastMouseUpdate = now;
        
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1.0 - (e.clientY - rect.top) / rect.height;
        targetMousePosRef.current = { x, y };
        targetMouseActiveRef.current = 1.0;
      }

      function handleMouseLeave() {
        if (!isRunning) return;
        targetMouseActiveRef.current = 0.0;
      }

      // 在 canvas 和 container 上都绑定事件，确保能捕获
      if (mouseInteraction) {
        if (canvas) {
          canvas.addEventListener('mousemove', handleMouseMove);
          canvas.addEventListener('mouseleave', handleMouseLeave);
        }
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);
      }

      cleanupRef.current = () => {
        isRunning = false;
        cancelAnimationFrame(animateId);
        window.removeEventListener('resize', resize);
        if (mouseInteraction) {
          if (canvas) {
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
          }
          container.removeEventListener('mousemove', handleMouseMove);
          container.removeEventListener('mouseleave', handleMouseLeave);
        }
        if (canvas && container.contains(canvas)) {
          container.removeChild(canvas);
        }
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      };
    }).catch((error) => {
      console.error('Failed to load ogl:', error);
    });

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [
    focal,
    rotation,
    starSpeed,
    density,
    hueShift,
    disableAnimation,
    speed,
    mouseInteraction,
    glowIntensity,
    saturation,
    mouseRepulsion,
    twinkleIntensity,
    rotationSpeed,
    repulsionStrength,
    autoCenterRepulsion,
    transparent,
    targetFPS,
  ]);

  return (
    <div 
      ref={containerRef} 
      className={`absolute inset-0 w-full h-full ${className}`} 
      style={{ background: '#000' }} 
    />
  );
}
