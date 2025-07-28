import { db } from '../config/firebase';
import { createError } from '../middleware/errorHandler';
import { AuditService } from './auditService';

export interface PCIComplianceCheck {
  requirement: string;
  description: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  evidence?: string;
  lastChecked: Date;
  remediation?: string;
}

export interface PCIAssessment {
  id?: string;
  merchantId: string;
  assessmentDate: Date;
  assessorName: string;
  version: string; // PCI DSS version (e.g., "4.0")
  overallScore: number;
  requirements: PCIComplianceCheck[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  nextAssessmentDue: Date;
  certification?: {
    issued: Date;
    expiresAt: Date;
    certificateNumber: string;
  };
}

export interface SecurityIncident {
  id?: string;
  type: 'data_breach' | 'unauthorized_access' | 'malware' | 'network_intrusion' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  reportedAt?: Date;
  resolvedAt?: Date;
  affectedSystems: string[];
  affectedRecords?: number;
  responseActions: string[];
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  assignedTo?: string;
}

export class PCIDSSService {
  private static readonly PCI_REQUIREMENTS = [
    {
      id: '1',
      title: 'Install and maintain a firewall configuration',
      description: 'Protect cardholder data with appropriate firewall and router configurations'
    },
    {
      id: '2',
      title: 'Do not use vendor-supplied defaults',
      description: 'Remove or change vendor-supplied defaults for system passwords and security parameters'
    },
    {
      id: '3',
      title: 'Protect stored cardholder data',
      description: 'Protect stored cardholder data through encryption, truncation, masking, and hashing'
    },
    {
      id: '4',
      title: 'Encrypt transmission of cardholder data',
      description: 'Encrypt transmission of cardholder data across open, public networks'
    },
    {
      id: '5',
      title: 'Protect against malware',
      description: 'Protect all systems against malware and regularly update anti-virus software'
    },
    {
      id: '6',
      title: 'Develop secure systems and applications',
      description: 'Develop and maintain secure systems and applications'
    },
    {
      id: '7',
      title: 'Restrict access by business need-to-know',
      description: 'Restrict access to cardholder data by business need-to-know'
    },
    {
      id: '8',
      title: 'Assign unique user ID',
      description: 'Assign a unique ID to each person with computer access'
    },
    {
      id: '9',
      title: 'Restrict physical access',
      description: 'Restrict physical access to cardholder data'
    },
    {
      id: '10',
      title: 'Track and monitor access',
      description: 'Track and monitor all access to network resources and cardholder data'
    },
    {
      id: '11',
      title: 'Regularly test security systems',
      description: 'Regularly test security systems and processes'
    },
    {
      id: '12',
      title: 'Maintain information security policy',
      description: 'Maintain a policy that addresses information security for all personnel'
    }
  ];

  static async createAssessment(
    merchantId: string,
    assessorName: string,
    version: string = '4.0'
  ): Promise<PCIAssessment> {
    try {
      const assessment: PCIAssessment = {
        merchantId,
        assessmentDate: new Date(),
        assessorName,
        version,
        overallScore: 0,
        requirements: this.PCI_REQUIREMENTS.map(req => ({
          requirement: `${req.id}. ${req.title}`,
          description: req.description,
          status: 'not_applicable' as const,
          lastChecked: new Date()
        })),
        riskLevel: 'high',
        nextAssessmentDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      };

      const docRef = await db.collection('pciAssessments').add(assessment as any);
      assessment.id = docRef.id;

      await AuditService.logAction(
        merchantId,
        'pci_assessment_created',
        'compliance',
        { assessmentId: docRef.id, assessor: assessorName },
        {} as any,
        { complianceCategory: 'PCI_DSS', riskLevel: 'medium' }
      );

      return assessment;
    } catch (error) {
      console.error('Error creating PCI assessment:', error);
      throw createError('Failed to create PCI assessment', 500);
    }
  }

  static async updateRequirement(
    assessmentId: string,
    requirementIndex: number,
    update: Partial<PCIComplianceCheck>,
    updatedBy: string
  ): Promise<void> {
    try {
      const assessmentDoc = await db.collection('pciAssessments').doc(assessmentId).get();
      
      if (!assessmentDoc.exists) {
        throw createError('Assessment not found', 404);
      }

      const assessment = assessmentDoc.data() as PCIAssessment;
      
      if (requirementIndex < 0 || requirementIndex >= assessment.requirements.length) {
        throw createError('Invalid requirement index', 400);
      }

      // Update the specific requirement
      assessment.requirements[requirementIndex] = {
        ...assessment.requirements[requirementIndex],
        ...update,
        lastChecked: new Date()
      };

      // Recalculate overall score
      const compliantCount = assessment.requirements.filter(r => r.status === 'compliant').length;
      const applicableCount = assessment.requirements.filter(r => r.status !== 'not_applicable').length;
      assessment.overallScore = applicableCount > 0 ? (compliantCount / applicableCount) * 100 : 0;

      // Determine risk level based on score
      if (assessment.overallScore >= 95) {
        assessment.riskLevel = 'low';
      } else if (assessment.overallScore >= 80) {
        assessment.riskLevel = 'medium';
      } else if (assessment.overallScore >= 60) {
        assessment.riskLevel = 'high';
      } else {
        assessment.riskLevel = 'critical';
      }

      await db.collection('pciAssessments').doc(assessmentId).update(assessment as any);

      await AuditService.logAction(
        updatedBy,
        'pci_requirement_updated',
        'compliance',
        { 
          assessmentId, 
          requirementIndex, 
          status: update.status,
          score: assessment.overallScore 
        },
        {} as any,
        { complianceCategory: 'PCI_DSS', riskLevel: 'medium' }
      );
    } catch (error) {
      console.error('Error updating PCI requirement:', error);
      throw error;
    }
  }

  static async getAssessments(merchantId: string): Promise<PCIAssessment[]> {
    try {
      const snapshot = await db.collection('pciAssessments')
        .where('merchantId', '==', merchantId)
        .orderBy('assessmentDate', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        assessmentDate: doc.data().assessmentDate?.toDate() || new Date(),
        nextAssessmentDue: doc.data().nextAssessmentDue?.toDate() || new Date(),
        requirements: doc.data().requirements?.map((req: any) => ({
          ...req,
          lastChecked: req.lastChecked?.toDate() || new Date()
        })) || []
      })) as PCIAssessment[];
    } catch (error) {
      console.error('Error fetching PCI assessments:', error);
      throw createError('Failed to fetch PCI assessments', 500);
    }
  }

  static async reportSecurityIncident(
    incident: Omit<SecurityIncident, 'id' | 'detectedAt' | 'status'>,
    reportedBy: string
  ): Promise<SecurityIncident> {
    try {
      const newIncident: SecurityIncident = {
        ...incident,
        detectedAt: new Date(),
        reportedAt: new Date(),
        status: 'open'
      };

      const docRef = await db.collection('securityIncidents').add(newIncident);
      newIncident.id = docRef.id;

      // Log high-severity incidents immediately
      if (incident.severity === 'high' || incident.severity === 'critical') {
        console.error(`CRITICAL SECURITY INCIDENT: ${incident.type}`, {
          description: incident.description,
          severity: incident.severity,
          systems: incident.affectedSystems
        });
      }

      await AuditService.logAction(
        reportedBy,
        'security_incident_reported',
        'security',
        { 
          incidentId: docRef.id,
          type: incident.type,
          severity: incident.severity,
          affectedSystems: incident.affectedSystems
        },
        {} as any,
        { 
          complianceCategory: 'PCI_DSS', 
          riskLevel: incident.severity === 'critical' ? 'high' : 'medium' 
        }
      );

      return newIncident;
    } catch (error) {
      console.error('Error reporting security incident:', error);
      throw createError('Failed to report security incident', 500);
    }
  }

  static async updateIncidentStatus(
    incidentId: string,
    status: SecurityIncident['status'],
    responseAction?: string,
    updatedBy?: string
  ): Promise<void> {
    try {
      const incidentDoc = await db.collection('securityIncidents').doc(incidentId).get();
      
      if (!incidentDoc.exists) {
        throw createError('Security incident not found', 404);
      }

      const updates: any = { status };

      if (status === 'resolved' || status === 'closed') {
        updates.resolvedAt = new Date();
      }

      if (responseAction) {
        const incident = incidentDoc.data() as SecurityIncident;
        updates.responseActions = [...(incident.responseActions || []), responseAction];
      }

      if (updatedBy) {
        updates.assignedTo = updatedBy;
      }

      await db.collection('securityIncidents').doc(incidentId).update(updates);

      if (updatedBy) {
        await AuditService.logAction(
          updatedBy,
          'security_incident_updated',
          'security',
          { incidentId, status, responseAction },
          {} as any,
          { complianceCategory: 'PCI_DSS', riskLevel: 'medium' }
        );
      }
    } catch (error) {
      console.error('Error updating security incident:', error);
      throw error;
    }
  }

  static async getSecurityIncidents(
    filters: {
      status?: SecurityIncident['status'];
      severity?: SecurityIncident['severity'];
      type?: SecurityIncident['type'];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<SecurityIncident[]> {
    try {
      let query = db.collection('securityIncidents')
        .orderBy('detectedAt', 'desc');

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      let incidents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        detectedAt: doc.data().detectedAt?.toDate() || new Date(),
        reportedAt: doc.data().reportedAt?.toDate(),
        resolvedAt: doc.data().resolvedAt?.toDate()
      })) as SecurityIncident[];

      // Apply filters in memory
      if (filters.status) {
        incidents = incidents.filter(i => i.status === filters.status);
      }
      if (filters.severity) {
        incidents = incidents.filter(i => i.severity === filters.severity);
      }
      if (filters.type) {
        incidents = incidents.filter(i => i.type === filters.type);
      }
      if (filters.startDate) {
        incidents = incidents.filter(i => i.detectedAt >= filters.startDate!);
      }
      if (filters.endDate) {
        incidents = incidents.filter(i => i.detectedAt <= filters.endDate!);
      }

      return incidents;
    } catch (error) {
      console.error('Error fetching security incidents:', error);
      throw createError('Failed to fetch security incidents', 500);
    }
  }

  static async generateComplianceReport(merchantId: string): Promise<any> {
    try {
      const assessments = await this.getAssessments(merchantId);
      const recentIncidents = await this.getSecurityIncidents({
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        limit: 100
      });

      const latestAssessment = assessments[0];
      
      const report = {
        merchantId,
        generatedAt: new Date(),
        assessmentSummary: latestAssessment ? {
          date: latestAssessment.assessmentDate,
          overallScore: latestAssessment.overallScore,
          riskLevel: latestAssessment.riskLevel,
          compliantRequirements: latestAssessment.requirements.filter(r => r.status === 'compliant').length,
          totalRequirements: latestAssessment.requirements.filter(r => r.status !== 'not_applicable').length
        } : null,
        securityMetrics: {
          totalIncidents: recentIncidents.length,
          criticalIncidents: recentIncidents.filter(i => i.severity === 'critical').length,
          openIncidents: recentIncidents.filter(i => i.status === 'open').length,
          averageResolutionTime: this.calculateAverageResolutionTime(recentIncidents.filter(i => i.resolvedAt))
        },
        recommendations: this.generateRecommendations(latestAssessment, recentIncidents),
        nextSteps: this.getNextSteps(latestAssessment)
      };

      // Store the report
      await db.collection('complianceReports').add({
        ...report,
        reportType: 'PCI_DSS'
      });

      return report;
    } catch (error) {
      console.error('Error generating PCI compliance report:', error);
      throw createError('Failed to generate PCI compliance report', 500);
    }
  }

  private static calculateAverageResolutionTime(resolvedIncidents: SecurityIncident[]): number {
    if (resolvedIncidents.length === 0) return 0;

    const totalTime = resolvedIncidents.reduce((sum, incident) => {
      if (incident.resolvedAt && incident.detectedAt) {
        return sum + (incident.resolvedAt.getTime() - incident.detectedAt.getTime());
      }
      return sum;
    }, 0);

    return Math.round(totalTime / resolvedIncidents.length / (1000 * 60 * 60)); // Hours
  }

  private static generateRecommendations(
    assessment?: PCIAssessment,
    incidents?: SecurityIncident[]
  ): string[] {
    const recommendations: string[] = [];

    if (assessment) {
      const nonCompliantReqs = assessment.requirements.filter(r => 
        r.status === 'non_compliant' || r.status === 'partial'
      );

      if (nonCompliantReqs.length > 0) {
        recommendations.push(`Address ${nonCompliantReqs.length} non-compliant PCI DSS requirements`);
      }

      if (assessment.overallScore < 80) {
        recommendations.push('Priority focus needed on PCI DSS compliance - score below 80%');
      }
    }

    if (incidents && incidents.length > 0) {
      const criticalIncidents = incidents.filter(i => i.severity === 'critical');
      if (criticalIncidents.length > 0) {
        recommendations.push(`Investigate and resolve ${criticalIncidents.length} critical security incidents`);
      }

      const openIncidents = incidents.filter(i => i.status === 'open');
      if (openIncidents.length > 5) {
        recommendations.push('High number of open incidents - consider additional security resources');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring and maintain current security posture');
    }

    return recommendations;
  }

  private static getNextSteps(assessment?: PCIAssessment): string[] {
    const steps: string[] = [];

    if (assessment) {
      const nextDue = assessment.nextAssessmentDue;
      const daysUntilDue = Math.ceil((nextDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (daysUntilDue <= 30) {
        steps.push('Schedule next PCI DSS assessment - due within 30 days');
      } else if (daysUntilDue <= 90) {
        steps.push('Begin preparation for upcoming PCI DSS assessment');
      }

      if (assessment.overallScore < 100) {
        steps.push('Complete remediation activities for non-compliant requirements');
      }
    }

    steps.push('Continue regular vulnerability scans and penetration testing');
    steps.push('Review and update security policies and procedures');
    steps.push('Conduct security awareness training for all personnel');

    return steps;
  }
}