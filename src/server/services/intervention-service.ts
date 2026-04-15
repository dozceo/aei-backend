import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

/**
 * Supported intervention trigger types.
 */
export type TriggerType = 
  | 'ATTENTION_RISK' 
  | 'MASTERY_DROP' 
  | 'QUIZ_FAILURE_STREAK' 
  | 'OVERDUE_ASSIGNMENT' 
  | 'LONG_ABSENCE';

/**
 * Alert severity levels.
 */
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Result object returned by trigger checks.
 */
export interface TriggerResult {
  triggered: boolean;
  context?: Record<string, any>;
}

/**
 * Service responsible for detecting when students need help based on performance data
 * and generating appropriate alerts and notifications.
 */
export class InterventionService {
  private db = getFirestore();

  /**
   * Queries all active students, evaluates all triggers for each student,
   * creates deduplicated alerts, and queues parent notifications.
   * 
   * @returns {Promise<void>}
   */
  public async detectInterventions(): Promise<void> {
    try {
      const studentsSnap = await this.db.collection('students')
        .where('status', '==', 'ACTIVE')
        .get();

      const triggers: TriggerType[] = [
        'ATTENTION_RISK',
        'MASTERY_DROP',
        'QUIZ_FAILURE_STREAK',
        'OVERDUE_ASSIGNMENT',
        'LONG_ABSENCE'
      ];

      for (const studentDoc of studentsSnap.docs) {
        const studentId = studentDoc.id;

        for (const trigger of triggers) {
          try {
            const result = await this.checkTrigger(studentId, trigger);

            if (result.triggered) {
              const severity = this.getSeverityForTrigger(trigger);
              const alertId = await this.logInterventionCreated(studentId, trigger, severity);

              // If alertId is returned, it means it wasn't a duplicate
              if (alertId) {
                await this.queueParentNotification(studentId, alertId, trigger, result.context);
              }
            }
          } catch (error) {
            // Graceful error handling: log and continue to the next trigger/student
            console.error(`[InterventionService] Error processing trigger ${trigger} for student ${studentId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('[InterventionService] Failed to fetch active students:', error);
      throw error;
    }
  }

  /**
   * Checks a specific trigger condition for a given student.
   * 
   * @param {string} studentId - The ID of the student.
   * @param {TriggerType} triggerType - The type of trigger to evaluate.
   * @returns {Promise<TriggerResult>} Object containing boolean trigger status and optional context.
   */
  public async checkTrigger(studentId: string, triggerType: TriggerType): Promise<TriggerResult> {
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    switch (triggerType) {
      case 'ATTENTION_RISK': {
        // ML score > 80%
        const snap = await this.db.collection('memory_records')
          .where('studentId', '==', studentId)
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();
        
        const score = snap.empty ? 0 : (snap.docs[0].data().attentionRiskScore || 0);
        return { triggered: score > 0.8, context: { attentionRiskScore: score } };
      }

      case 'MASTERY_DROP': {
        // Mastery decreased >15% in 7 days
        const sevenDaysAgo = new Date(now - 7 * ONE_DAY_MS);
        
        const latestSnap = await this.db.collection('memory_records')
          .where('studentId', '==', studentId)
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();

        const pastSnap = await this.db.collection('memory_records')
          .where('studentId', '==', studentId)
          .where('timestamp', '<=', Timestamp.fromDate(sevenDaysAgo))
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();

        if (latestSnap.empty || pastSnap.empty) return { triggered: false };

        const currentMastery = latestSnap.docs[0].data().masteryLevel || 0;
        const pastMastery = pastSnap.docs[0].data().masteryLevel || 0;
        const drop = pastMastery - currentMastery;

        return { 
          triggered: drop > 0.15, 
          context: { currentMastery, pastMastery, dropPercentage: drop * 100 } 
        };
      }

      case 'QUIZ_FAILURE_STREAK': {
        // 3+ consecutive scores < 60%
        const snap = await this.db.collection('quiz_events')
          .where('studentId', '==', studentId)
          .orderBy('timestamp', 'desc')
          .limit(3)
          .get();

        if (snap.size < 3) return { triggered: false };

        const scores = snap.docs.map(doc => doc.data().score as number);
        const isStreak = scores.every(score => score < 60);

        return { triggered: isStreak, context: { recentScores: scores } };
      }

      case 'OVERDUE_ASSIGNMENT': {
        // Assignment >2 days late
        const twoDaysAgo = new Date(now - 2 * ONE_DAY_MS);
        
        // Note: Filtering status in memory to avoid Firestore multiple inequality limitations
        const snap = await this.db.collection('assignments')
          .where('studentId', '==', studentId)
          .where('dueDate', '<', Timestamp.fromDate(twoDaysAgo))
          .get();

        const overdueAssignments = snap.docs.filter(doc => doc.data().status !== 'COMPLETED');
        
        return { 
          triggered: overdueAssignments.length > 0, 
          context: { overdueCount: overdueAssignments.length, oldestOverdueId: overdueAssignments[0]?.id } 
        };
      }

      case 'LONG_ABSENCE': {
        // No activity >7 days
        const sevenDaysAgo = new Date(now - 7 * ONE_DAY_MS);
        
        const snap = await this.db.collection('quiz_events')
          .where('studentId', '==', studentId)
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();

        if (snap.empty) {
          return { triggered: true, context: { reason: 'No activity records found' } };
        }

        const lastActivityDate = snap.docs[0].data().timestamp.toDate();
        return { 
          triggered: lastActivityDate < sevenDaysAgo, 
          context: { lastActivityDate } 
        };
      }

      default:
        return { triggered: false };
    }
  }

  /**
   * Logs an intervention alert to Firestore. Prevents duplicate alerts for the 
   * same student and trigger type on the same day.
   * 
   * @param {string} studentId - The ID of the student.
   * @param {TriggerType} triggerType - The type of trigger that caused the alert.
   * @param {Severity} severity - The severity level of the alert.
   * @returns {Promise<string | null>} The new alert ID, or null if a duplicate was prevented.
   */
  public async logInterventionCreated(
    studentId: string, 
    triggerType: TriggerType, 
    severity: Severity
  ): Promise<string | null> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Check for existing alert today
    const existingAlerts = await this.db.collection('alerts')
      .where('studentId', '==', studentId)
      .where('triggerType', '==', triggerType)
      .where('createdAt', '>=', Timestamp.fromDate(startOfDay))
      .limit(1)
      .get();

    if (!existingAlerts.empty) {
      // Deduplication: Alert already exists for this trigger today
      return null;
    }

    // Create new alert
    const alertRef = await this.db.collection('alerts').add({
      studentId,
      triggerType,
      severity,
      status: 'NEW',
      createdAt: FieldValue.serverTimestamp(),
      resolved: false
    });

    return alertRef.id;
  }

  /**
   * Queues a notification to be sent to the student's parents.
   * 
   * @private
   */
  private async queueParentNotification(
    studentId: string, 
    alertId: string, 
    triggerType: TriggerType, 
    context?: Record<string, any>
  ): Promise<void> {
    await this.db.collection('notifications').add({
      studentId,
      alertId,
      type: 'PARENT_INTERVENTION_ALERT',
      triggerType,
      context: context || {},
      status: 'QUEUED',
      createdAt: FieldValue.serverTimestamp()
    });
  }

  /**
   * Maps a trigger type to its corresponding severity level.
   * 
   * @private
   */
  private getSeverityForTrigger(triggerType: TriggerType): Severity {
    switch (triggerType) {
      case 'ATTENTION_RISK': return 'CRITICAL';
      case 'MASTERY_DROP': return 'HIGH';
      case 'QUIZ_FAILURE_STREAK': return 'HIGH';
      case 'LONG_ABSENCE': return 'MEDIUM';
      case 'OVERDUE_ASSIGNMENT': return 'LOW';
      default: return 'LOW';
    }
  }
}

// ============================================================================
// EXPORTED API FUNCTIONS (for use in routes)
// ============================================================================

const interventionServiceInstance = new InterventionService();

/**
 * Get active alerts for a student
 */
export async function getStudentAlerts(
  studentId: string,
  userId: string,
  options: { limit?: number; offset?: number; [key: string]: any } = {}
) {
  const db = getFirestore();
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  try {
    const snapshot = await db.collection('alerts')
      .where('studentId', '==', studentId)
      .where('resolved', '==', false)
      .limit(limit)
      .offset(offset)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Failed to fetch student alerts:', error);
    return [];
  }
}

/**
 * Get teacher dashboard data
 */
export async function getTeacherDashboard(classId: string, userId: string) {
  const db = getFirestore();

  try {
    const alertsSnapshot = await db.collection('alerts')
      .where('classId', '==', classId)
      .where('resolved', '==', false)
      .get();

    return {
      classId,
      activeAlerts: alertsSnapshot.size,
      recentAlerts: alertsSnapshot.docs.slice(0, 10).map(doc => ({ id: doc.id, ...doc.data() }))
    };
  } catch (error) {
    console.error('Failed to fetch teacher dashboard:', error);
    return { classId, activeAlerts: 0, recentAlerts: [] };
  }
}

/**
 * Get analytics for a class
 */
export async function getAnalytics(
  classId: string,
  userId: string,
  options: { period?: 'day' | 'week' | 'month'; [key: string]: any } = {}
) {
  const db = getFirestore();

  try {
    const period = options.period || 'week';
    const daysBack = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysBack);

    const snapshot = await db.collection('alerts')
      .where('classId', '==', classId)
      .where('createdAt', '>=', Timestamp.fromDate(dateThreshold))
      .get();

    return {
      period,
      totalAlerts: snapshot.size,
      byTrigger: aggregateAlertsByTrigger(snapshot.docs)
    };
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return { period: 'week', totalAlerts: 0, byTrigger: {} };
  }
}

/**
 * Trigger manual intervention detection
 */
export async function triggerDetection(studentId: string) {
  try {
    await interventionServiceInstance.detectInterventions();
    return { success: true, studentId, message: 'Intervention detection triggered' };
  } catch (error) {
    console.error('Failed to trigger detection:', error);
    throw error;
  }
}

/**
 * Resolve an alert
 */
export async function resolveAlert(
  alertId: string,
  userId: string,
  data: { notes?: string; resolution?: string; [key: string]: any } = {}
) {
  const db = getFirestore();

  try {
    const docRef = db.collection('alerts').doc(alertId);
    await docRef.update({
      resolved: true,
      resolvedAt: Timestamp.now(),
      resolvedBy: userId,
      ...data
    });

    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  } catch (error) {
    console.error('Failed to resolve alert:', error);
    throw error;
  }
}

/**
 * Get alert details
 */
export async function getAlertDetails(alertId: string, userId: string) {
  const db = getFirestore();

  try {
    const doc = await db.collection('alerts').doc(alertId).get();

    if (!doc.exists) {
      throw new Error(`Alert ${alertId} not found`);
    }

    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Failed to fetch alert details:', error);
    throw error;
  }
}

/**
 * Helper function to aggregate alerts by trigger type
 */
function aggregateAlertsByTrigger(docs: any[]): Record<string, number> {
  const result: Record<string, number> = {};
  
  docs.forEach(doc => {
    const data = doc.data();
    const triggerType = data.triggerType || 'UNKNOWN';
    result[triggerType] = (result[triggerType] || 0) + 1;
  });

  return result;
}

