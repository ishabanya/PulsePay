import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { PCIDSSService } from '../services/pciDssService';
import { GDPRService } from '../services/gdprService';
import { MFAService } from '../services/mfaService';
import { RBACService } from '../services/rbacService';
import { AuditService } from '../services/auditService';
import { createError } from '../middleware/errorHandler';

export class SecurityController {
  // PCI DSS Compliance
  static async createPCIAssessment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { assessorName, version } = req.body;
      const userId = req.user?.uid;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const assessment = await PCIDSSService.createAssessment(userId, assessorName, version);
      res.status(201).json(assessment);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async updatePCIRequirement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { assessmentId } = req.params;
      const { requirementIndex, status, evidence, remediation } = req.body;
      const userId = req.user?.uid;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      await PCIDSSService.updateRequirement(
        assessmentId,
        requirementIndex,
        { status, evidence, remediation },
        userId
      );

      res.json({ message: 'Requirement updated successfully' });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async getPCIAssessments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.uid;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const assessments = await PCIDSSService.getAssessments(userId);
      res.json(assessments);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async reportSecurityIncident(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, severity, description, affectedSystems, affectedRecords, responseActions } = req.body;
      const userId = req.user?.uid;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const incident = await PCIDSSService.reportSecurityIncident({
        type,
        severity,
        description,
        affectedSystems: affectedSystems || [],
        affectedRecords,
        responseActions: responseActions || []
      }, userId);

      res.status(201).json(incident);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async getSecurityIncidents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, severity, type, limit } = req.query;

      const incidents = await PCIDSSService.getSecurityIncidents({
        status: status as any,
        severity: severity as any,
        type: type as any,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.json(incidents);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async generatePCIReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.uid;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const report = await PCIDSSService.generateComplianceReport(userId);
      res.json(report);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  // GDPR Compliance
  static async recordConsent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { purpose, consentText, granted, version, expiry } = req.body;
      const userId = req.user?.uid;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const consent = await GDPRService.recordConsent({
        userId,
        purpose,
        consentText,
        granted,
        version,
        expiry: expiry ? new Date(expiry) : undefined,
        ipAddress: '',
        userAgent: ''
      }, req);

      res.status(201).json(consent);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async withdrawConsent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { purpose } = req.body;
      const userId = req.user?.uid;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      await GDPRService.withdrawConsent(userId, purpose, req);
      res.json({ message: 'Consent withdrawn successfully' });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async getUserConsents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.uid;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const consents = await GDPRService.getUserConsents(userId);
      res.json(consents);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async submitDataSubjectRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { requestType, description, verificationMethod } = req.body;
      const userId = req.user?.uid;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const request = await GDPRService.submitDataSubjectRequest({
        userId,
        requestType,
        description,
        verificationMethod
      });

      res.status(201).json(request);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async getDataSubjectRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, requestType, limit } = req.query;
      const userId = req.user?.uid;

      const requests = await GDPRService.getDataSubjectRequests({
        status: status as any,
        requestType: requestType as any,
        userId: req.query.userId as string || userId,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.json(requests);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async exportUserData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.uid;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const data = await GDPRService.exportUserData(userId);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${Date.now()}.json"`);
      res.json(data);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async generateGDPRReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const report = await GDPRService.generateGDPRReport();
      res.json(report);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  // MFA Management
  static async setupMFA(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.uid;
      const userEmail = req.user?.email;

      if (!userId || !userEmail) {
        throw createError('User not authenticated', 401);
      }

      const setup = await MFAService.setupMFA(userId, userEmail);
      res.json(setup);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async enableMFA(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      const userId = req.user?.uid;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const success = await MFAService.enableMFA(userId, token);
      res.json({ enabled: success });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async verifyMFA(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      const userId = req.user?.uid;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const valid = await MFAService.verifyMFA(userId, token);
      res.json({ valid });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async getMFAStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.uid;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const status = await MFAService.getMFAStatus(userId);
      res.json(status);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async regenerateBackupCodes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { mfaToken } = req.body;
      const userId = req.user?.uid;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const backupCodes = await MFAService.regenerateBackupCodes(userId, mfaToken);
      res.json({ backupCodes });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  // RBAC Management
  static async assignRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, role, expiresAt } = req.body;
      const assignedBy = req.user?.uid;

      if (!assignedBy) {
        throw createError('User not authenticated', 401);
      }

      // Check if user has permission to assign roles
      const hasPermission = await RBACService.hasPermission(assignedBy, 'admin:write');
      if (!hasPermission) {
        throw createError('Insufficient permissions', 403);
      }

      await RBACService.assignRole(
        userId,
        role,
        assignedBy,
        expiresAt ? new Date(expiresAt) : undefined
      );

      res.json({ message: 'Role assigned successfully' });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async removeRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, role } = req.body;
      const removedBy = req.user?.uid;

      if (!removedBy) {
        throw createError('User not authenticated', 401);
      }

      // Check permissions
      const hasPermission = await RBACService.hasPermission(removedBy, 'admin:write');
      if (!hasPermission) {
        throw createError('Insufficient permissions', 403);
      }

      await RBACService.removeRole(userId, role);
      res.json({ message: 'Role removed successfully' });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async getUserRoles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requesterId = req.user?.uid;

      if (!requesterId) {
        throw createError('User not authenticated', 401);
      }

      // Users can view their own roles, admins can view any user's roles
      if (userId !== requesterId) {
        const hasPermission = await RBACService.hasPermission(requesterId, 'admin:read');
        if (!hasPermission) {
          throw createError('Insufficient permissions', 403);
        }
      }

      const userRoles = await RBACService.getUserRoles(userId);
      res.json(userRoles);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async getRoleDefinitions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const definitions = RBACService.getRoleDefinitions();
      res.json(definitions);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async listAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const requesterId = req.user?.uid;

      if (!requesterId) {
        throw createError('User not authenticated', 401);
      }

      // Check permissions
      const hasPermission = await RBACService.hasPermission(requesterId, 'admin:read');
      if (!hasPermission) {
        throw createError('Insufficient permissions', 403);
      }

      const users = await RBACService.listAllUsers();
      res.json(users);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  // Audit Logs
  static async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.uid;
      const {
        startDate,
        endDate,
        action,
        resource,
        riskLevel,
        complianceCategory,
        limit
      } = req.query;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      // Check if user can view audit logs
      const hasPermission = await RBACService.hasPermission(userId, 'audit:read');
      if (!hasPermission) {
        throw createError('Insufficient permissions', 403);
      }

      const logs = await AuditService.getAuditLogs(userId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        action: action as string,
        resource: resource as string,
        riskLevel: riskLevel as string,
        complianceCategory: complianceCategory as any,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.json(logs);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  static async generateComplianceReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.uid;
      const { complianceCategory, startDate, endDate } = req.body;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      // Check permissions
      const hasPermission = await RBACService.hasPermission(userId, 'compliance:read');
      if (!hasPermission) {
        throw createError('Insufficient permissions', 403);
      }

      const report = await AuditService.generateComplianceReport(
        userId,
        complianceCategory,
        new Date(startDate),
        new Date(endDate)
      );

      res.json(report);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
}