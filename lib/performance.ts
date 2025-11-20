/**
 * 性能监控工具
 * 用于收集和上报性能指标
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private enabled: boolean;

  constructor() {
    // 生产环境默认启用，开发环境可选
    this.enabled =
      typeof window !== 'undefined' &&
      (process.env.NODE_ENV === 'production' ||
        process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE === 'true');
  }

  /**
   * 记录性能指标
   */
  record(name: string, value: number, unit: string = 'ms') {
    if (!this.enabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // 在开发环境输出到控制台
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${value}${unit}`);
    }

    // 如果指标数量超过 100，自动上报并清空
    if (this.metrics.length > 100) {
      this.flush();
    }
  }

  /**
   * 测量函数执行时间
   */
  measure<T>(name: string, fn: () => T): T {
    if (!this.enabled) {
      return fn();
    }

    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.record(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.record(`${name}_error`, duration);
      throw error;
    }
  }

  /**
   * 异步测量函数执行时间
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.record(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.record(`${name}_error`, duration);
      throw error;
    }
  }

  /**
   * 记录 Web Vitals 指标
   */
  recordWebVital(metric: {
    name: string;
    value: number;
    id: string;
  }) {
    this.record(`web_vital_${metric.name}`, metric.value);
  }

  /**
   * 上报性能指标到服务器
   */
  async flush() {
    if (!this.enabled || this.metrics.length === 0) return;

    const metrics = [...this.metrics];
    this.metrics = [];

    try {
      // 在生产环境中上报到监控服务
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'performance',
            metrics,
          }),
        });
      }
    } catch (error) {
      // 静默失败，不影响用户体验
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Performance] 上报失败:', error);
      }
    }
  }

  /**
   * 获取所有指标
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 清空指标
   */
  clear() {
    this.metrics = [];
  }
}

// 单例实例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能装饰器（用于函数）
 */
export function measurePerformance(name?: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    const methodName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = (function (this: any, ...args: any[]) {
      return performanceMonitor.measure(methodName, () =>
        originalMethod.apply(this, args)
      );
    }) as T;

    return descriptor;
  };
}

/**
 * 在浏览器环境中初始化性能监控
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // 监控页面加载性能
  if ('performance' in window && 'getEntriesByType' in performance) {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;

      if (navigation) {
        performanceMonitor.record(
          'page_load_dom_content_loaded',
          navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
        );
        performanceMonitor.record(
          'page_load_complete',
          navigation.loadEventEnd - navigation.fetchStart
        );
      }

      // 上报初始性能指标
      setTimeout(() => {
        performanceMonitor.flush();
      }, 5000);
    });
  }

  // 监控长任务（可能阻塞主线程的任务）
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            // 超过 50ms 的任务被认为是长任务
            performanceMonitor.record('long_task', entry.duration);
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // 浏览器不支持 longtask，忽略
    }
  }
}

