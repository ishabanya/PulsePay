import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
  saltLength: number;
}

export class EncryptionService {
  private static readonly config: EncryptionConfig = {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
    saltLength: 32
  };

  private static readonly encryptionKey = process.env.ENCRYPTION_KEY || 
    crypto.randomBytes(32).toString('hex');

  static encrypt(plaintext: string, additionalData?: string): string {
    try {
      const iv = crypto.randomBytes(this.config.ivLength);
      const salt = crypto.randomBytes(this.config.saltLength);
      
      // Derive key from base key and salt
      const key = crypto.pbkdf2Sync(
        Buffer.from(this.encryptionKey, 'hex'),
        salt,
        100000,
        this.config.keyLength,
        'sha256'
      );

      const cipher = crypto.createCipher('aes-256-cbc', key);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Combine salt + iv + encrypted data (simplified without GCM for compatibility)
      const combined = Buffer.concat([
        salt,
        iv,
        Buffer.from(encrypted, 'hex')
      ]);

      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw createError('Encryption failed', 500);
    }
  }

  static decrypt(encryptedData: string, additionalData?: string): string {
    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract components (simplified without GCM)
      const salt = combined.subarray(0, this.config.saltLength);
      const iv = combined.subarray(this.config.saltLength, this.config.saltLength + this.config.ivLength);
      const encrypted = combined.subarray(this.config.saltLength + this.config.ivLength);

      // Derive key from base key and salt
      const key = crypto.pbkdf2Sync(
        Buffer.from(this.encryptionKey, 'hex'),
        salt,
        100000,
        this.config.keyLength,
        'sha256'
      );

      const decipher = crypto.createDecipher('aes-256-cbc', key);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw createError('Decryption failed', 500);
    }
  }

  static hash(data: string, salt?: string): { hash: string; salt: string } {
    const usedSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, usedSalt, 100000, 64, 'sha256').toString('hex');
    return { hash, salt: usedSalt };
  }

  static verifyHash(data: string, hash: string, salt: string): boolean {
    const computedHash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  }

  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static encryptSensitiveFields(data: any, fieldsToEncrypt: string[]): any {
    const encrypted = { ...data };
    
    for (const field of fieldsToEncrypt) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = this.encrypt(encrypted[field], field);
        encrypted[`${field}_encrypted`] = true;
      }
    }
    
    return encrypted;
  }

  static decryptSensitiveFields(data: any, fieldsToDecrypt: string[]): any {
    const decrypted = { ...data };
    
    for (const field of fieldsToDecrypt) {
      if (decrypted[field] && decrypted[`${field}_encrypted`]) {
        try {
          decrypted[field] = this.decrypt(decrypted[field], field);
          delete decrypted[`${field}_encrypted`];
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }
    
    return decrypted;
  }
}

// Middleware for encrypting request data
export const encryptRequestData = (fieldsToEncrypt: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body && typeof req.body === 'object') {
        req.body = EncryptionService.encryptSensitiveFields(req.body, fieldsToEncrypt);
      }
      next();
    } catch (error) {
      console.error('Request encryption error:', error);
      next(createError('Failed to encrypt request data', 500));
    }
  };
};

// Middleware for decrypting response data
export const decryptResponseData = (fieldsToDecrypt: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send.bind(res);
    
    res.send = function(data: any): Response {
      try {
        if (data && typeof data === 'object') {
          if (Array.isArray(data)) {
            data = data.map(item => 
              typeof item === 'object' 
                ? EncryptionService.decryptSensitiveFields(item, fieldsToDecrypt)
                : item
            );
          } else {
            data = EncryptionService.decryptSensitiveFields(data, fieldsToDecrypt);
          }
        }
        return originalSend(data);
      } catch (error) {
        console.error('Response decryption error:', error);
        return originalSend(data); // Send original data if decryption fails
      }
    };
    
    next();
  };
};

// Middleware for HTTPS enforcement
export const enforceHTTPS = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
  }
  next();
};

// Middleware for setting security headers
export const setSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Force HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://js.stripe.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.stripe.com; " +
    "frame-src https://js.stripe.com; " +
    "object-src 'none'; " +
    "base-uri 'self';"
  );
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

// Middleware for data masking in logs
export const maskSensitiveData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'cardNumber', 'cvv', 'ssn',
    'accountNumber', 'routingNumber', 'pin', 'apiKey', 'privateKey'
  ];
  
  const masked = Array.isArray(data) ? [...data] : { ...data };
  
  const maskValue = (value: any, key: string): any => {
    if (typeof value === 'string') {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        return value.length > 4 ? '*'.repeat(value.length - 4) + value.slice(-4) : '*'.repeat(value.length);
      }
      if (key.toLowerCase().includes('email')) {
        const [user, domain] = value.split('@');
        return user.length > 2 ? user.slice(0, 2) + '*'.repeat(user.length - 2) + '@' + domain : value;
      }
    }
    if (typeof value === 'object' && value !== null) {
      return maskSensitiveData(value);
    }
    return value;
  };
  
  if (Array.isArray(masked)) {
    return masked.map(item => maskSensitiveData(item));
  }
  
  Object.keys(masked).forEach(key => {
    masked[key] = maskValue(masked[key], key);
  });
  
  return masked;
};

// Middleware for request/response encryption in transit
export const encryptInTransit = (req: Request, res: Response, next: NextFunction) => {
  // Ensure request is over HTTPS in production
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.status(400).json({ error: 'HTTPS required' });
  }
  
  // Add encryption headers to indicate encrypted channel
  res.setHeader('X-Transport-Encryption', 'TLS');
  res.setHeader('X-Content-Encryption', 'enabled');
  
  next();
};

// Database field encryption helper
export const encryptDatabaseFields = (
  document: any, 
  fieldsToEncrypt: string[] = ['email', 'phone', 'address', 'name']
): any => {
  return EncryptionService.encryptSensitiveFields(document, fieldsToEncrypt);
};

// Database field decryption helper
export const decryptDatabaseFields = (
  document: any, 
  fieldsToDecrypt: string[] = ['email', 'phone', 'address', 'name']
): any => {
  return EncryptionService.decryptSensitiveFields(document, fieldsToDecrypt);
};