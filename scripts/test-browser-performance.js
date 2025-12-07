/**
 * 浏览器端性能测试脚本
 * 
 * 使用方法：
 * 1. 在浏览器控制台中运行此脚本
 * 2. 或者保存为书签工具
 * 
 * 测试页面加载性能、渲染性能等
 */

(function() {
  console.log('🚀 开始浏览器性能测试...\n');

  // 性能指标收集
  const metrics = {
    pageLoad: null,
    domContentLoaded: null,
    firstPaint: null,
    firstContentfulPaint: null,
    largestContentfulPaint: null,
    apiResponseTimes: [],
  };

  // 监听性能指标
  if ('PerformanceObserver' in window) {
    // First Contentful Paint
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            metrics.firstContentfulPaint = Math.round(entry.startTime);
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('无法监听 Paint 指标:', e);
    }

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        metrics.largestContentfulPaint = Math.round(lastEntry.renderTime || lastEntry.loadTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('无法监听 LCP 指标:', e);
    }
  }

  // 页面加载完成后的指标
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData) {
        metrics.pageLoad = Math.round(perfData.loadEventEnd - perfData.fetchStart);
        metrics.domContentLoaded = Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart);
      }

      // First Paint (fallback)
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach(entry => {
        if (entry.name === 'first-paint') {
          metrics.firstPaint = Math.round(entry.startTime);
        }
      });

      // 输出结果
      console.log('\n' + '='.repeat(60));
      console.log('📊 浏览器性能测试结果:');
      console.log('='.repeat(60));
      console.log(`页面加载时间: ${metrics.pageLoad || 'N/A'}ms`);
      console.log(`DOM内容加载: ${metrics.domContentLoaded || 'N/A'}ms`);
      console.log(`首次绘制: ${metrics.firstPaint || 'N/A'}ms`);
      console.log(`首次内容绘制: ${metrics.firstContentfulPaint || 'N/A'}ms`);
      console.log(`最大内容绘制: ${metrics.largestContentfulPaint || 'N/A'}ms`);
      
      // 性能评级
      if (metrics.pageLoad) {
        if (metrics.pageLoad < 1000) {
          console.log('\n✅ 页面加载性能优秀！');
        } else if (metrics.pageLoad < 2000) {
          console.log('\n✅ 页面加载性能良好！');
        } else if (metrics.pageLoad < 3000) {
          console.log('\n⚠️  页面加载性能一般，建议优化');
        } else {
          console.log('\n❌ 页面加载性能较差，需要优化');
        }
      }

      // API响应时间统计
      if (metrics.apiResponseTimes.length > 0) {
        const avgApiTime = metrics.apiResponseTimes.reduce((a, b) => a + b, 0) / metrics.apiResponseTimes.length;
        console.log(`\nAPI平均响应时间: ${Math.round(avgApiTime)}ms`);
      }

      console.log('='.repeat(60));
    }, 1000);
  });

  // 拦截 fetch 请求，记录API响应时间
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const startTime = performance.now();
    return originalFetch.apply(this, args).then(response => {
      const duration = performance.now() - startTime;
      if (args[0] && typeof args[0] === 'string' && args[0].includes('/api/')) {
        metrics.apiResponseTimes.push(duration);
        console.log(`API请求: ${args[0].substring(0, 50)}... ${Math.round(duration)}ms`);
      }
      return response;
    });
  };

  console.log('✅ 性能监控已启动，请浏览页面...');
  console.log('   测试将在页面加载完成后自动输出结果\n');
})();

















