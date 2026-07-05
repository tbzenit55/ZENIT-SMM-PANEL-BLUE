import { Request, Response, NextFunction } from 'express';

// ==========================================
// 1. CLASS-BASED IN-MEMORY RATE LIMITER
// ==========================================
class InMemoryRateLimiter {
  private requests = new Map<string, number[]>();
  
  constructor(
    private windowMs: number = 60 * 1000, // 1 minute default
    private maxRequests: number = 100 // 100 requests per minute default
  ) {}

  public isLimitExceeded(ip: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(ip) || [];
    
    // Filter out timestamps outside the active time window
    const validTimestamps = timestamps.filter(t => now - t < this.windowMs);
    
    if (validTimestamps.length >= this.maxRequests) {
      this.requests.set(ip, validTimestamps);
      return true;
    }
    
    validTimestamps.push(now);
    this.requests.set(ip, validTimestamps);
    return false;
  }
}

// Create different limiters for public routes vs login/auth routes
const apiLimiter = new InMemoryRateLimiter(60 * 1000, 150); // 150 req/min for general API
const authLimiter = new InMemoryRateLimiter(60 * 1000, 30);  // 30 req/min for auth actions

export function rateLimit(type: 'api' | 'auth' = 'api') {
  const limiter = type === 'auth' ? authLimiter : apiLimiter;
  
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    
    if (limiter.isLimitExceeded(ip)) {
      return res.status(429).json({
        error: 'Too many requests from this IP, please try again after a minute.'
      });
    }
    next();
  };
}

// ==========================================
// 2. SECURE HEADERS (MANUAL HELMET)
// ==========================================
export function secureHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https://images.unsplash.com; " +
    "connect-src 'self' https://*.googleapis.com"
  );
  next();
}

// ==========================================
// 3. INPUT PROTECTION AND SANITIZATION (ANTI-XSS / NO INJECTIONS)
// ==========================================
export function sanitizeInputs(req: Request, res: Response, next: NextFunction) {
  const sanitizeString = (val: string): string => {
    return val
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/<iframe[^>]*>([\s\S]*?)<\/iframe>/gi, '');
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  
  next();
}
