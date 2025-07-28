import { db } from '../config/firebase';
import { createError } from '../middleware/errorHandler';
import { AuditService } from './auditService';

export interface DataProcessingRecord {
  id?: string;
  userId: string;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  dataCategories: string[];
  dataSubjects: string[];
  recipients: string[];
  thirdCountryTransfers?: string[];
  retentionPeriod: string;
  securityMeasures: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentRecord {
  id?: string;
  userId: string;
  purpose: string;
  consentText: string;
  granted: boolean;
  grantedAt?: Date;
  withdrawnAt?: Date;
  ipAddress: string;
  userAgent: string;
  version: string;
  expiry?: Date;
  isActive: boolean;
}

export interface DataSubjectRequest {
  id?: string;
  userId: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'restriction' | 'portability' | 'objection';
  description: string;
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  response?: string;
  handledBy?: string;
  verificationMethod: string;
  documentPath?: string; // For data export files
}

export interface DataBreachRecord {
  id?: string;
  title: string;
  description: string;
  discoveredAt: Date;
  reportedAt?: Date;
  notificationSent?: Date;
  dataSubjectsAffected: number;
  dataCategories: string[];
  riskLevel: 'low' | 'high';
  status: 'discovered' | 'assessed' | 'contained' | 'resolved' | 'reported_to_dpa';
  containmentMeasures: string[];
  notificationRequiredDPA: boolean;
  notificationRequiredSubjects: boolean;
  reportedBy: string;
  dpaReference?: string;
}

export class GDPRService {
  static async recordDataProcessing(
    record: Omit<DataProcessingRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DataProcessingRecord> {
    try {
      const newRecord: DataProcessingRecord = {
        ...record,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await db.collection('dataProcessingRecords').add(newRecord);
      newRecord.id = docRef.id;

      await AuditService.logAction(
        record.userId,
        'data_processing_recorded',
        'gdpr',
        { 
          recordId: docRef.id,
          purpose: record.purpose,
          legalBasis: record.legalBasis 
        },
        {} as any,
        { complianceCategory: 'GDPR', riskLevel: 'medium' }
      );

      return newRecord;
    } catch (error) {
      console.error('Error recording data processing:', error);
      throw createError('Failed to record data processing', 500);
    }
  }

  static async recordConsent(
    consent: Omit<ConsentRecord, 'id' | 'grantedAt' | 'isActive'>,
    req: any
  ): Promise<ConsentRecord> {
    try {
      const newConsent: ConsentRecord = {
        ...consent,
        grantedAt: consent.granted ? new Date() : undefined,
        isActive: consent.granted,
        ipAddress: this.getClientIP(req),
        userAgent: req.headers['user-agent'] || 'Unknown'
      };

      // Withdraw previous consent for the same purpose if this is a new consent
      if (consent.granted) {
        await db.collection('consentRecords')
          .where('userId', '==', consent.userId)
          .where('purpose', '==', consent.purpose)
          .where('isActive', '==', true)
          .get()
          .then(snapshot => {
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
              batch.update(doc.ref, { 
                isActive: false, 
                withdrawnAt: new Date() 
              });
            });
            return batch.commit();
          });
      }

      const docRef = await db.collection('consentRecords').add(newConsent);
      newConsent.id = docRef.id;

      await AuditService.logAction(
        consent.userId,
        consent.granted ? 'consent_granted' : 'consent_withdrawn',
        'gdpr',
        { 
          consentId: docRef.id,
          purpose: consent.purpose,
          granted: consent.granted 
        },
        req,
        { complianceCategory: 'GDPR', riskLevel: 'low' }
      );

      return newConsent;
    } catch (error) {
      console.error('Error recording consent:', error);
      throw createError('Failed to record consent', 500);
    }
  }

  static async withdrawConsent(
    userId: string,
    purpose: string,
    req: any
  ): Promise<void> {
    try {
      const snapshot = await db.collection('consentRecords')
        .where('userId', '==', userId)
        .where('purpose', '==', purpose)
        .where('isActive', '==', true)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { 
          isActive: false, 
          withdrawnAt: new Date() 
        });
      });
      await batch.commit();

      await AuditService.logAction(
        userId,
        'consent_withdrawn',
        'gdpr',
        { purpose, consentCount: snapshot.docs.length },
        req,
        { complianceCategory: 'GDPR', riskLevel: 'medium' }
      );
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      throw createError('Failed to withdraw consent', 500);
    }
  }

  static async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    try {
      const snapshot = await db.collection('consentRecords')
        .where('userId', '==', userId)
        .orderBy('grantedAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        grantedAt: doc.data().grantedAt?.toDate(),
        withdrawnAt: doc.data().withdrawnAt?.toDate(),
        expiry: doc.data().expiry?.toDate()
      })) as ConsentRecord[];
    } catch (error) {
      console.error('Error fetching user consents:', error);
      throw createError('Failed to fetch user consents', 500);
    }
  }

  static async submitDataSubjectRequest(
    request: Omit<DataSubjectRequest, 'id' | 'requestedAt' | 'status'>
  ): Promise<DataSubjectRequest> {
    try {
      const newRequest: DataSubjectRequest = {
        ...request,
        requestedAt: new Date(),
        status: 'pending'
      };

      const docRef = await db.collection('dataSubjectRequests').add(newRequest);
      newRequest.id = docRef.id;

      await AuditService.logAction(
        request.userId,
        'data_subject_request_submitted',
        'gdpr',
        { 
          requestId: docRef.id,
          requestType: request.requestType,
          description: request.description 
        },
        {} as any,
        { complianceCategory: 'GDPR', riskLevel: 'medium' }
      );

      return newRequest;
    } catch (error) {
      console.error('Error submitting data subject request:', error);
      throw createError('Failed to submit data subject request', 500);
    }
  }

  static async processDataSubjectRequest(
    requestId: string,
    handledBy: string,
    response?: string
  ): Promise<void> {
    try {
      const updates: any = {
        status: 'processing',
        processedAt: new Date(),
        handledBy
      };

      if (response) {
        updates.response = response;
        updates.status = 'completed';
        updates.completedAt = new Date();
      }

      await db.collection('dataSubjectRequests').doc(requestId).update(updates);

      await AuditService.logAction(
        handledBy,
        'data_subject_request_processed',
        'gdpr',
        { requestId, status: updates.status, response },
        {} as any,
        { complianceCategory: 'GDPR', riskLevel: 'medium' }
      );
    } catch (error) {
      console.error('Error processing data subject request:', error);
      throw createError('Failed to process data subject request', 500);
    }
  }

  static async exportUserData(userId: string): Promise<any> {
    try {
      const userData: any = {
        exportDate: new Date().toISOString(),
        userId,
        personalData: {},
        transactions: [],
        consents: [],
        auditLogs: []
      };

      // Get user profile data
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        userData.personalData = userDoc.data();
      }

      // Get transactions
      const transactionsSnapshot = await db.collection('transactions')
        .where('userId', '==', userId)
        .get();
      userData.transactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get consent records
      userData.consents = await this.getUserConsents(userId);

      // Get audit logs (last 6 months)
      const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
      userData.auditLogs = await AuditService.getAuditLogs(userId, {
        startDate: sixMonthsAgo,
        limit: 1000
      });

      await AuditService.logAction(
        userId,
        'data_export_generated',
        'gdpr',
        { recordCount: userData.transactions.length + userData.consents.length },
        {} as any,
        { complianceCategory: 'GDPR', riskLevel: 'low' }
      );

      return userData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw createError('Failed to export user data', 500);
    }
  }

  static async deleteUserData(
    userId: string,
    deletedBy: string,
    retainForLegal: boolean = false
  ): Promise<void> {
    try {
      const collections = ['users', 'transactions', 'consentRecords', 'dataSubjectRequests'];
      
      if (retainForLegal) {
        // Anonymize instead of delete for legal compliance
        await this.anonymizeUserData(userId, deletedBy);
      } else {
        // Complete deletion
        for (const collection of collections) {
          const snapshot = await db.collection(collection)
            .where('userId', '==', userId)
            .get();
          
          const batch = db.batch();
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        }
      }

      await AuditService.logAction(
        deletedBy,
        retainForLegal ? 'user_data_anonymized' : 'user_data_deleted',
        'gdpr',
        { 
          targetUserId: userId,
          retainForLegal,
          deletionType: retainForLegal ? 'anonymization' : 'complete_deletion'
        },
        {} as any,
        { complianceCategory: 'GDPR', riskLevel: 'high' }
      );
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw createError('Failed to delete user data', 500);
    }
  }

  private static async anonymizeUserData(userId: string, anonymizedBy: string): Promise<void> {
    const anonymizedId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update user record
    await db.collection('users').doc(userId).update({
      email: `${anonymizedId}@anonymized.local`,
      name: 'Anonymized User',
      phone: null,
      address: null,
      anonymized: true,
      anonymizedAt: new Date(),
      anonymizedBy
    });

    // Anonymize transactions (keep for financial records but remove PII)
    const transactionsSnapshot = await db.collection('transactions')
      .where('userId', '==', userId)
      .get();
    
    const batch = db.batch();
    transactionsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        customerEmail: `${anonymizedId}@anonymized.local`,
        customerName: 'Anonymized Customer',
        anonymized: true
      });
    });
    await batch.commit();
  }

  static async reportDataBreach(
    breach: Omit<DataBreachRecord, 'id' | 'discoveredAt' | 'status'>
  ): Promise<DataBreachRecord> {
    try {
      const newBreach: DataBreachRecord = {
        ...breach,
        discoveredAt: new Date(),
        status: 'discovered'
      };

      const docRef = await db.collection('dataBreaches').add(newBreach);
      newBreach.id = docRef.id;

      // High-risk breaches require immediate attention
      if (breach.riskLevel === 'high' || breach.dataSubjectsAffected > 100) {
        console.error(`HIGH RISK DATA BREACH REPORTED: ${breach.title}`, {
          affected: breach.dataSubjectsAffected,
          categories: breach.dataCategories
        });
      }

      await AuditService.logAction(
        breach.reportedBy,
        'data_breach_reported',
        'gdpr',
        { 
          breachId: docRef.id,
          riskLevel: breach.riskLevel,
          affectedSubjects: breach.dataSubjectsAffected 
        },
        {} as any,
        { complianceCategory: 'GDPR', riskLevel: 'high' }
      );

      return newBreach;
    } catch (error) {
      console.error('Error reporting data breach:', error);
      throw createError('Failed to report data breach', 500);
    }
  }

  static async getDataSubjectRequests(
    filters: {
      status?: DataSubjectRequest['status'];
      requestType?: DataSubjectRequest['requestType'];
      userId?: string;
      limit?: number;
    } = {}
  ): Promise<DataSubjectRequest[]> {
    try {
      let query = db.collection('dataSubjectRequests')
        .orderBy('requestedAt', 'desc');

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      let requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        requestedAt: doc.data().requestedAt?.toDate() || new Date(),
        processedAt: doc.data().processedAt?.toDate(),
        completedAt: doc.data().completedAt?.toDate()
      })) as DataSubjectRequest[];

      // Apply filters in memory
      if (filters.status) {
        requests = requests.filter(r => r.status === filters.status);
      }
      if (filters.requestType) {
        requests = requests.filter(r => r.requestType === filters.requestType);
      }
      if (filters.userId) {
        requests = requests.filter(r => r.userId === filters.userId);
      }

      return requests;
    } catch (error) {
      console.error('Error fetching data subject requests:', error);
      throw createError('Failed to fetch data subject requests', 500);
    }
  }

  static async generateGDPRReport(): Promise<any> {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        recentRequests,
        recentBreaches,
        activeConsents
      ] = await Promise.all([
        this.getDataSubjectRequests({ limit: 100 }),
        this.getDataBreaches({ startDate: lastMonth }),
        this.getActiveConsents()
      ]);

      const report = {
        reportDate: now,
        period: {
          start: lastMonth,
          end: now
        },
        dataSubjectRequests: {
          total: recentRequests.length,
          pending: recentRequests.filter(r => r.status === 'pending').length,
          completed: recentRequests.filter(r => r.status === 'completed').length,
          averageProcessingTime: this.calculateAverageProcessingTime(recentRequests)
        },
        dataBreaches: {
          total: recentBreaches.length,
          highRisk: recentBreaches.filter(b => b.riskLevel === 'high').length,
          reported: recentBreaches.filter(b => b.status === 'reported_to_dpa').length
        },
        consentManagement: {
          totalActiveConsents: activeConsents.length,
          recentWithdrawals: activeConsents.filter(c => 
            c.withdrawnAt && c.withdrawnAt >= lastMonth
          ).length
        },
        complianceScore: this.calculateComplianceScore(recentRequests, recentBreaches),
        recommendations: this.generateGDPRRecommendations(recentRequests, recentBreaches)
      };

      await db.collection('complianceReports').add({
        ...report,
        reportType: 'GDPR'
      });

      return report;
    } catch (error) {
      console.error('Error generating GDPR report:', error);
      throw createError('Failed to generate GDPR report', 500);
    }
  }

  private static async getDataBreaches(filters: { startDate?: Date } = {}): Promise<DataBreachRecord[]> {
    let query = db.collection('dataBreaches').orderBy('discoveredAt', 'desc');
    
    const snapshot = await query.get();
    let breaches = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      discoveredAt: doc.data().discoveredAt?.toDate() || new Date(),
      reportedAt: doc.data().reportedAt?.toDate(),
      notificationSent: doc.data().notificationSent?.toDate()
    })) as DataBreachRecord[];

    if (filters.startDate) {
      breaches = breaches.filter(b => b.discoveredAt >= filters.startDate!);
    }

    return breaches;
  }

  private static async getActiveConsents(): Promise<ConsentRecord[]> {
    const snapshot = await db.collection('consentRecords')
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      grantedAt: doc.data().grantedAt?.toDate(),
      withdrawnAt: doc.data().withdrawnAt?.toDate()
    })) as ConsentRecord[];
  }

  private static calculateAverageProcessingTime(requests: DataSubjectRequest[]): number {
    const completed = requests.filter(r => r.completedAt && r.requestedAt);
    if (completed.length === 0) return 0;

    const totalTime = completed.reduce((sum, req) => {
      return sum + (req.completedAt!.getTime() - req.requestedAt.getTime());
    }, 0);

    return Math.round(totalTime / completed.length / (1000 * 60 * 60 * 24)); // Days
  }

  private static calculateComplianceScore(
    requests: DataSubjectRequest[],
    breaches: DataBreachRecord[]
  ): number {
    let score = 100;

    // Deduct for overdue requests (30+ days)
    const overdueRequests = requests.filter(r => 
      r.status === 'pending' && 
      (Date.now() - r.requestedAt.getTime()) > 30 * 24 * 60 * 60 * 1000
    );
    score -= overdueRequests.length * 5;

    // Deduct for unreported high-risk breaches
    const unreportedBreaches = breaches.filter(b => 
      b.riskLevel === 'high' && 
      b.status !== 'reported_to_dpa' &&
      (Date.now() - b.discoveredAt.getTime()) > 72 * 60 * 60 * 1000 // 72 hours
    );
    score -= unreportedBreaches.length * 15;

    return Math.max(0, score);
  }

  private static generateGDPRRecommendations(
    requests: DataSubjectRequest[],
    breaches: DataBreachRecord[]
  ): string[] {
    const recommendations: string[] = [];

    const pendingRequests = requests.filter(r => r.status === 'pending');
    if (pendingRequests.length > 5) {
      recommendations.push('High number of pending data subject requests - consider additional resources');
    }

    const overdueRequests = requests.filter(r => 
      r.status === 'pending' && 
      (Date.now() - r.requestedAt.getTime()) > 30 * 24 * 60 * 60 * 1000
    );
    if (overdueRequests.length > 0) {
      recommendations.push(`${overdueRequests.length} data subject requests are overdue (30+ days)`);
    }

    const recentBreaches = breaches.filter(b => 
      (Date.now() - b.discoveredAt.getTime()) < 30 * 24 * 60 * 60 * 1000
    );
    if (recentBreaches.length > 0) {
      recommendations.push('Recent data breaches detected - review security measures');
    }

    if (recommendations.length === 0) {
      recommendations.push('GDPR compliance appears to be on track - continue monitoring');
    }

    return recommendations;
  }

  private static getClientIP(req: any): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.headers['x-real-ip'] as string ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           'unknown';
  }
}