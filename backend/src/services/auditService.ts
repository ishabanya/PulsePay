import { db } from '../config/firebase';
import { Request } from 'express';

export interface AuditLog {
  id?: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  sessionId?: string;
  riskLevel: 'low' | 'medium' | 'high';
  complianceCategory: 'PCI_DSS' | 'GDPR' | 'SOX' | 'GENERAL';
}

export class AuditService {
  static async logAction(
    userId: string,
    action: string,
    resource: string,
    details: any,
    req: Request,
    options: {
      resourceId?: string;
      riskLevel?: 'low' | 'medium' | 'high';
      complianceCategory?: 'PCI_DSS' | 'GDPR' | 'SOX' | 'GENERAL';
    } = {}
  ): Promise<void> {
    try {
      const auditLog: AuditLog = {
        userId,
        action,
        resource,
        resourceId: options.resourceId,
        details: this.sanitizeDetails(details, action),
        ipAddress: this.getClientIP(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
        timestamp: new Date(),
        sessionId: req.headers['x-session-id'] as string,
        riskLevel: options.riskLevel || this.determineRiskLevel(action, resource),
        complianceCategory: options.complianceCategory || this.determineComplianceCategory(action, resource)
      };

      await db.collection('auditLogs').add(auditLog);

      // Log high-risk activities immediately to console for monitoring
      if (auditLog.riskLevel === 'high') {
        console.warn(`HIGH RISK AUDIT LOG: ${userId} performed ${action} on ${resource}`, {
          details: auditLog.details,
          ip: auditLog.ipAddress
        });
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging shouldn't break the main flow
    }
  }

  static async getAuditLogs(
    userId: string, 
    filters: {
      startDate?: Date;
      endDate?: Date;
      action?: string;
      resource?: string;
      riskLevel?: string;
      complianceCategory?: string;
      limit?: number;
    } = {}
  ): Promise<AuditLog[]> {
    try {
      let query = db.collection('auditLogs')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc');

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      let logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as AuditLog[];

      // Apply additional filters in memory (to avoid index requirements)
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
      }
      if (filters.resource) {
        logs = logs.filter(log => log.resource === filters.resource);
      }
      if (filters.riskLevel) {
        logs = logs.filter(log => log.riskLevel === filters.riskLevel);
      }
      if (filters.complianceCategory) {
        logs = logs.filter(log => log.complianceCategory === filters.complianceCategory);
      }

      return logs;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw new Error('Failed to fetch audit logs');
    }
  }

  static async generateComplianceReport(
    userId: string,
    complianceCategory: 'PCI_DSS' | 'GDPR' | 'SOX' | 'GENERAL',
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      const logs = await this.getAuditLogs(userId, {
        startDate,
        endDate,
        complianceCategory
      });

      const report = {
        period: {
          start: startDate,
          end: endDate
        },
        complianceCategory,
        totalEvents: logs.length,
        riskBreakdown: {
          high: logs.filter(l => l.riskLevel === 'high').length,
          medium: logs.filter(l => l.riskLevel === 'medium').length,
          low: logs.filter(l => l.riskLevel === 'low').length
        },
        actionBreakdown: this.groupBy(logs, 'action'),
        resourceBreakdown: this.groupBy(logs, 'resource'),
        timelineData: this.generateTimeline(logs),
        suspiciousActivities: logs.filter(l => l.riskLevel === 'high'),
        generatedAt: new Date()
      };

      // Store the report
      await db.collection('complianceReports').add({
        ...report,
        userId,
        reportType: complianceCategory
      });

      return report;
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw new Error('Failed to generate compliance report');
    }
  }

  private static sanitizeDetails(details: any, action: string): any {
    // Remove sensitive data from audit logs
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'cardNumber', 'cvv', 'ssn'];
    
    if (typeof details === 'object' && details !== null) {
      const sanitized = { ...details };
      
      for (const field of sensitiveFields) {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      }
      
      // Special handling for payment data
      if (action.includes('payment') || action.includes('card')) {
        if (sanitized.paymentMethod) {
          sanitized.paymentMethod = {
            ...sanitized.paymentMethod,
            card: sanitized.paymentMethod.card ? {
              ...sanitized.paymentMethod.card,
              number: sanitized.paymentMethod.card.number ? 
                '**** **** **** ' + sanitized.paymentMethod.card.number.slice(-4) : undefined
            } : undefined
          };
        }
      }
      
      return sanitized;
    }
    
    return details;
  }

  private static getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.headers['x-real-ip'] as string ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  private static determineRiskLevel(action: string, resource: string): 'low' | 'medium' | 'high' {
    const highRiskActions = ['login', 'logout', 'payment_create', 'payment_refund', 'user_delete', 'admin_action'];
    const highRiskResources = ['payment', 'user', 'admin', 'settings'];
    
    if (highRiskActions.some(a => action.includes(a)) || 
        highRiskResources.some(r => resource.includes(r))) {
      return 'high';
    }
    
    const mediumRiskActions = ['update', 'delete', 'create'];
    if (mediumRiskActions.some(a => action.includes(a))) {
      return 'medium';
    }
    
    return 'low';
  }

  private static determineComplianceCategory(action: string, resource: string): 'PCI_DSS' | 'GDPR' | 'SOX' | 'GENERAL' {
    if (resource.includes('payment') || resource.includes('card') || action.includes('payment')) {
      return 'PCI_DSS';
    }
    
    if (resource.includes('user') || resource.includes('customer') || action.includes('data')) {
      return 'GDPR';
    }
    
    if (resource.includes('financial') || action.includes('report')) {
      return 'SOX';
    }
    
    return 'GENERAL';
  }

  private static groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private static generateTimeline(logs: AuditLog[]): any[] {
    const timeline = logs.reduce((acc, log) => {
      const date = log.timestamp.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, count: 0, highRisk: 0 };
      }
      acc[date].count++;
      if (log.riskLevel === 'high') {
        acc[date].highRisk++;
      }
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(timeline).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }
}