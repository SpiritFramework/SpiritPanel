/**
 * Performance monitoring utilities
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

const metrics: PerformanceMetric[] = [];

/** Record a performance metric */
export function recordMetric(name: string, duration: number): void {
  metrics.push({
    name,
    duration,
    timestamp: performance.now(),
  });

  // Log in development
  if (!import.meta.env.PROD) {
    console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
  }

  // Send to analytics in production
  if (import.meta.env.PROD && duration > 500) {
    sendMetricToAnalytics(name, duration);
  }
}

/** Measure execution time of a function */
export async function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    recordMetric(name, performance.now() - start);
  }
}

/** Measure execution time synchronously */
export function measureSync<T>(name: string, fn: () => T): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    recordMetric(name, performance.now() - start);
  }
}

/** Report Web Vitals (LCP, FID, CLS) */
export function initWebVitals(): void {
  // Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          recordMetric('LCP', entry.startTime);
        });
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch {
      // Observer not supported
    }

    // First Input Delay
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (entry.processingDuration) {
            recordMetric('FID', entry.processingDuration);
          }
        });
      });
      observer.observe({ entryTypes: ['first-input'] });
    } catch {
      // Observer not supported
    }

    // Cumulative Layout Shift
    try {
      const observer = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry) => {
          clsValue += (entry as any).value;
        });
        recordMetric('CLS', clsValue);
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch {
      // Observer not supported
    }
  }
}

/** Get all recorded metrics */
export function getMetrics(): PerformanceMetric[] {
  return [...metrics];
}

/** Clear metrics */
export function clearMetrics(): void {
  metrics.length = 0;
}

/** Send metric to analytics service */
function sendMetricToAnalytics(name: string, duration: number): void {
  // This can be integrated with a real analytics service
  // For now, this is a placeholder
  try {
    navigator.sendBeacon?.('/api/analytics', JSON.stringify({ name, duration }));
  } catch {
    // Silently fail
  }
}

/** Check if resource is cached */
export function isResourceCached(url: string): boolean {
  if (!('performance' in window)) return false;
  const resource = performance.getEntriesByName(url)[0];
  return resource ? (resource as any).transferSize === 0 : false;
}

/** Prefetch a resource for better performance */
export function prefetchResource(url: string, as: 'script' | 'style' | 'font' | 'image' = 'script'): void {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  link.as = as;
  document.head.appendChild(link);
}

/** Preload a critical resource */
export function preloadResource(url: string, as: 'script' | 'style' | 'font' | 'image' = 'script'): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = as;
  document.head.appendChild(link);
}
