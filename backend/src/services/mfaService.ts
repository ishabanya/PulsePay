import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { db } from '../config/firebase';
import { createError } from '../middleware/errorHandler';

export interface MFASetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFAConfig {
  userId: string;
  secret: string;
  isEnabled: boolean;
  backupCodes: string[];
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class MFAService {
  static async setupMFA(userId: string, userEmail: string): Promise<MFASetup> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `PulsePay (${userEmail})`,
        issuer: 'PulsePay'
      });

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // Store in database (not enabled yet)
      const mfaConfig: Omit<MFAConfig, 'userId'> = {
        secret: secret.base32,
        isEnabled: false,
        backupCodes: backupCodes.map(code => this.hashBackupCode(code)),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('mfaConfigs').doc(userId).set(mfaConfig);

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes // Return unhashed codes to user (only time they see them)
      };
    } catch (error) {
      console.error('Error setting up MFA:', error);
      throw createError('Failed to setup MFA', 500);
    }
  }

  static async enableMFA(userId: string, token: string): Promise<boolean> {
    try {
      const mfaDoc = await db.collection('mfaConfigs').doc(userId).get();
      
      if (!mfaDoc.exists) {
        throw createError('MFA not set up', 400);
      }

      const mfaConfig = mfaDoc.data() as MFAConfig;
      
      // Verify the token
      const isValid = speakeasy.totp.verify({
        secret: mfaConfig.secret,
        encoding: 'base32',
        token,
        window: 2 // Allow 2 time windows for clock drift
      });

      if (!isValid) {
        throw createError('Invalid MFA token', 400);
      }

      // Enable MFA
      await db.collection('mfaConfigs').doc(userId).update({
        isEnabled: true,
        lastUsedAt: new Date(),
        updatedAt: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error enabling MFA:', error);
      throw error;
    }
  }

  static async verifyMFA(userId: string, token: string): Promise<boolean> {
    try {
      const mfaDoc = await db.collection('mfaConfigs').doc(userId).get();
      
      if (!mfaDoc.exists) {
        return false; // MFA not set up
      }

      const mfaConfig = mfaDoc.data() as MFAConfig;
      
      if (!mfaConfig.isEnabled) {
        return false;
      }

      // Try TOTP first
      const isValidTOTP = speakeasy.totp.verify({
        secret: mfaConfig.secret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (isValidTOTP) {
        await db.collection('mfaConfigs').doc(userId).update({
          lastUsedAt: new Date(),
          updatedAt: new Date()
        });
        return true;
      }

      // Try backup codes
      const hashedToken = this.hashBackupCode(token);
      const backupCodeIndex = mfaConfig.backupCodes.findIndex(code => code === hashedToken);
      
      if (backupCodeIndex !== -1) {
        // Remove used backup code
        const updatedBackupCodes = [...mfaConfig.backupCodes];
        updatedBackupCodes.splice(backupCodeIndex, 1);
        
        await db.collection('mfaConfigs').doc(userId).update({
          backupCodes: updatedBackupCodes,
          lastUsedAt: new Date(),
          updatedAt: new Date()
        });
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error verifying MFA:', error);
      return false;
    }
  }

  static async disableMFA(userId: string, token: string): Promise<boolean> {
    try {
      // Verify current MFA token before disabling
      const isValid = await this.verifyMFA(userId, token);
      
      if (!isValid) {
        throw createError('Invalid MFA token', 400);
      }

      await db.collection('mfaConfigs').doc(userId).update({
        isEnabled: false,
        updatedAt: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error disabling MFA:', error);
      throw error;
    }
  }

  static async isMFAEnabled(userId: string): Promise<boolean> {
    try {
      const mfaDoc = await db.collection('mfaConfigs').doc(userId).get();
      
      if (!mfaDoc.exists) {
        return false;
      }

      const mfaConfig = mfaDoc.data() as MFAConfig;
      return mfaConfig.isEnabled;
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return false;
    }
  }

  static async regenerateBackupCodes(userId: string, mfaToken: string): Promise<string[]> {
    try {
      // Verify current MFA token
      const isValid = await this.verifyMFA(userId, mfaToken);
      
      if (!isValid) {
        throw createError('Invalid MFA token', 400);
      }

      // Generate new backup codes
      const newBackupCodes = this.generateBackupCodes();
      const hashedBackupCodes = newBackupCodes.map(code => this.hashBackupCode(code));

      await db.collection('mfaConfigs').doc(userId).update({
        backupCodes: hashedBackupCodes,
        updatedAt: new Date()
      });

      return newBackupCodes; // Return unhashed codes to user
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      throw error;
    }
  }

  static async getMFAStatus(userId: string): Promise<{ isEnabled: boolean; hasBackupCodes: boolean; lastUsedAt?: Date }> {
    try {
      const mfaDoc = await db.collection('mfaConfigs').doc(userId).get();
      
      if (!mfaDoc.exists) {
        return { isEnabled: false, hasBackupCodes: false };
      }

      const mfaConfig = mfaDoc.data() as MFAConfig;
      
      return {
        isEnabled: mfaConfig.isEnabled,
        hasBackupCodes: mfaConfig.backupCodes.length > 0,
        lastUsedAt: mfaConfig.lastUsedAt instanceof Date ? mfaConfig.lastUsedAt : (mfaConfig.lastUsedAt as any)?.toDate?.()
      };
    } catch (error) {
      console.error('Error getting MFA status:', error);
      return { isEnabled: false, hasBackupCodes: false };
    }
  }

  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generate 8-digit backup codes
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  private static hashBackupCode(code: string): string {
    // Simple hash for backup codes (in production, use proper hashing like bcrypt)
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}