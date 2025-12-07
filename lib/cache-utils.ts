/**
 * 客户端缓存工具
 * 使用 localStorage 和内存缓存提升性能
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expires: number;
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 默认 5 分钟

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    // 先检查内存缓存
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && Date.now() < memoryEntry.expires) {
      return memoryEntry.data as T;
    }
    if (memoryEntry) {
      this.memoryCache.delete(key);
    }

    // 检查 localStorage
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);
      if (Date.now() < entry.expires) {
        // 同时更新内存缓存
        this.memoryCache.set(key, entry);
        return entry.data;
      }

      // 过期，删除
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      // 解析失败，删除无效数据
      localStorage.removeItem(`cache_${key}`);
    }

    return null;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + ttl,
    };

    // 更新内存缓存
    this.memoryCache.set(key, entry);

    // 更新 localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      } catch (error) {
        // localStorage 可能已满，只保留内存缓存
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Cache] localStorage 写入失败:', error);
        }
      }
    }
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`cache_${key}`);
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.memoryCache.clear();
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();

    // 清理内存缓存
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now >= entry.expires) {
        this.memoryCache.delete(key);
      }
    }

    // 清理 localStorage
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith('cache_')) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const entry: CacheEntry<any> = JSON.parse(stored);
              if (now >= entry.expires) {
                localStorage.removeItem(key);
              }
            }
          } catch {
            // 解析失败，删除
            localStorage.removeItem(key);
          }
        }
      });
    }
  }
}

// 单例实例
export const cacheManager = new CacheManager();

// 定期清理过期缓存（每 10 分钟）
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheManager.cleanup();
  }, 10 * 60 * 1000);
}

/**
 * 缓存装饰器（用于函数）
 */
export function cached<T extends (...args: any[]) => any>(
  ttl: number = 5 * 60 * 1000,
  keyGenerator?: (...args: Parameters<T>) => string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = function (this: any, ...args: Parameters<T>) {
      const key =
        keyGenerator?.(...args) ||
        `${target.constructor.name}.${propertyKey}.${JSON.stringify(args)}`;

      // 检查缓存
      const cached = cacheManager.get<ReturnType<T>>(key);
      if (cached !== null) {
        return cached;
      }

      // 执行原函数并缓存结果
      const result = originalMethod.apply(this, args);

      // 如果是 Promise，等待完成后缓存
      if (result instanceof Promise) {
        return result.then((value) => {
          cacheManager.set(key, value, ttl);
          return value;
        });
      }

      cacheManager.set(key, result, ttl);
      return result;
    } as any;

    return descriptor;
  };
}


