const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

/**
 * Rate Limiting - Limita requisições por IP
 */
const createRateLimiter = (max = 100, windowMs = 60000) => {
  return rateLimit({
    windowMs: windowMs, // 1 minuto
    max: max, // máximo de requisições por IP
    message: {
      error: 'Muitas requisições deste IP, tente novamente em alguns minutos.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Rate limit excedido',
        message: 'Muitas requisições deste IP, tente novamente em alguns minutos.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

/**
 * CORS Configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5000'];
    
    // Permitir requisições sem origin (como mobile apps)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Origin não permitida pelo CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

/**
 * Helmet Configuration - Headers de segurança
 */
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
};

/**
 * Middleware de segurança básica
 */
const basicSecurity = (req, res, next) => {
  // Remove headers que podem expor informações
  res.removeHeader('X-Powered-By');
  
  // Adiciona headers de segurança
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Log de requisições suspeitas
  if (req.headers['user-agent']?.includes('bot') || req.headers['user-agent']?.includes('crawler')) {
    console.log(`🚨 Requisição suspeita detectada: ${req.ip} - ${req.headers['user-agent']}`);
  }
  
  next();
};

/**
 * Middleware de validação de IP
 */
const validateIP = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Lista de IPs bloqueados (exemplo)
  const blockedIPs = process.env.BLOCKED_IPS?.split(',') || [];
  
  if (blockedIPs.includes(clientIP)) {
    return res.status(403).json({
      error: 'IP bloqueado',
      message: 'Seu IP foi bloqueado por violação de segurança.'
    });
  }
  
  next();
};

/**
 * Middleware de sanitização de dados
 */
const sanitizeData = (req, res, next) => {
  // Sanitiza dados de entrada
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Remove scripts e tags HTML
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim();
      }
    });
  }
  
  next();
};

module.exports = {
  createRateLimiter,
  corsOptions,
  helmetConfig,
  basicSecurity,
  validateIP,
  sanitizeData
};
