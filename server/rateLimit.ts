// =========================================================================
// RATE LIMIT EM MEMÓRIA (janela deslizante por IP)
// =========================================================================
// Extraído do server.ts para que routers montados em arquivos próprios (as rotas
// de licença, que são públicas por natureza) usem o MESMO primitivo em vez de
// reimplementá-lo com sutilezas diferentes.
// =========================================================================

import type { Request, Response, NextFunction } from "express";
import { getClientIp } from "./auth";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitRecord>();

export function createRateLimiter(maxRequests: number, windowMs: number, keyPrefix = "std") {
  return (req: Request, res: Response, next: NextFunction) => {
    // IP resolvido no servidor (não confia em cabeçalhos do cliente sem proxy
    // confiável). Impede burlar o rate limit forjando "x-forwarded-for".
    const ip = getClientIp(req);
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let record = rateLimits.get(key);
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + windowMs };
      rateLimits.set(key, record);
    } else {
      record.count++;
    }

    // Auto-limpeza periódica dos registros vencidos e teto contra exaustão de memória.
    if (rateLimits.size > 5000) {
      for (const [k, v] of rateLimits.entries()) {
        if (now > v.resetAt) rateLimits.delete(k);
      }
      if (rateLimits.size >= 5000) {
        const oldestKey = rateLimits.keys().next().value;
        if (oldestKey !== undefined) rateLimits.delete(oldestKey);
      }
    }

    if (record.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        success: false,
        error: "Limite de requisições excedido. Por favor, aguarde alguns instantes.",
        retryAfter,
      });
    }
    return next();
  };
}
