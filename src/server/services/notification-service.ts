import { db } from '../../lib/firebase';
import { randomUUID } from 'crypto';

// --- Types & Interfaces ---

export type NotificationType = 'WEEKLY_REPORT' | 'ALERT' | 'ACHIEVEMENT' | 'CUSTOM';
export type AlertType = 'MASTERY_DROP' | 'ATTENTION_RISK' | 'STREAK_BROKEN';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Channel = 'IN_APP' | 'EMAIL' | 'SMS';

export interface DeliveryLog {
  channel: Channel;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface NotificationRecord {
  notificationId: string;
  parentId: string;
  studentId: string;
  type: NotificationType;
  data: Record<string, any>;
  sentAt: string;
  readAt: string | null;
  deliveryLogs: DeliveryLog[];
}

/**
 * Service responsible for generating and managing parent notifications
 * regarding student learning progress, alerts, and achievements.
 */
export class NotificationService {
  
  /**
   * Severity ranking to easily compare severity levels
   */
  private static readonly SEVERITY_WEIGHTS: Record<Severity, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  };

  /**
   * Strips Personally Identifiable Information (PII) from notification payloads.
   * @param data - The raw notification data
   * @returns Sanitized data object
   */
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const piiKeys = ['name', 'email', 'phone', 'address', 'ssn', 'dob'];
    const sanitized = { ...data };
    
    for (const key of Object.keys(sanitized)) {
      if (piiKeys.some(pii => key.toLowerCase().includes(pii))) {
        delete sanitized[key];
      }
    }
    return sanitized;
  }

  /**
   * Creates a single notification record for a parent.
   * 
   * @param parentId - The ID of the parent receiving the notification
   * @param studentId - The ID of the student the notification is about
   * @param type - The category of the notification
   * @param data - Additional payload data (PII will be stripped)
   * @returns The generated notificationId, or null if the operation failed
   */
  async sendParentNotification(
    parentId: string,
    studentId: string,
    type: NotificationType,
    data: Record<string, any>
  ): Promise<string | null> {
    try {
      const notificationId = randomUUID();
      const safeData = this.sanitizeData(data);

      const record: NotificationRecord = {
        notificationId,
        parentId,
        studentId,
        type,
        data: safeData,
        sentAt: new Date().toISOString(),
        readAt: null,
        deliveryLogs: [],
      };

      await db.collection('notifications').doc(notificationId).set(record);
      return notificationId;
    } catch (error) {
      console.error('[NotificationService] Failed to send parent notification:', error);
      return null;
    }
  }

  /**
   * Generates and sends a weekly report to all parents of a specific student.
   * Calculates mastery, engagement, and growth over the past 7 days.
   * 
   * @param studentId - The ID of the student
   * @returns The count of notifications successfully queued/sent
   */
  async sendWeeklyReport(studentId: string): Promise<number> {
    try {
      // 1. Calculate date range (past 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 2. Fetch student metrics
      const metricsSnapshot = await db.collection('student_metrics')
        .where('studentId', '==', studentId)
        .where('date', '>=', sevenDaysAgo.toISOString())
        .get();

      let masteryPercent = 0;
      let engagementPercent = 0;
      let growthPercent = 0;

      if (!metricsSnapshot.empty) {
        let totalMastery = 0;
        let totalEngagement = 0;
        let totalGrowth = 0;

        metricsSnapshot.forEach(doc => {
          const d = doc.data();
          totalMastery += d.mastery || 0;
          totalEngagement += d.engagement || 0;
          totalGrowth += d.growth || 0;
        });

        const count = metricsSnapshot.size;
        masteryPercent = Math.round(totalMastery / count);
        engagementPercent = Math.round(totalEngagement / count);
        growthPercent = Math.round(totalGrowth / count);
      }

      const reportData = {
        masteryPercent,
        engagementPercent,
        growthPercent,
        period: 'LAST_7_DAYS',
        message: `Weekly Report: Mastery is at ${masteryPercent}%, Engagement at ${engagementPercent}%.`
      };

      // 3. Get all parents of the student
      const parentsSnapshot = await db.collection('users')
        .where('role', '==', 'PARENT')
        .where('studentIds', 'array-contains', studentId)
        .get();

      if (parentsSnapshot.empty) {
        return 0;
      }

      // 4. Batch write notifications for all parents
      const batch = db.batch();
      let sentCount = 0;

      parentsSnapshot.forEach(parentDoc => {
        const notificationId = randomUUID();
        const record: NotificationRecord = {
          notificationId,
          parentId: parentDoc.id,
          studentId,
          type: 'WEEKLY_REPORT',
          data: reportData,
          sentAt: new Date().toISOString(),
          readAt: null,
          deliveryLogs: [],
        };

        const docRef = db.collection('notifications').doc(notificationId);
        batch.set(docRef, record);
        sentCount++;
      });

      await batch.commit();
      return sentCount;

    } catch (error) {
      console.error(`[NotificationService] Failed to send weekly report for student ${studentId}:`, error);
      return 0;
    }
  }

  /**
   * Sends an alert notification to parents if the severity meets the threshold (>= MEDIUM).
   * 
   * @param studentId - The ID of the student
   * @param alertType - The specific type of alert
   * @param severity - The severity level of the alert
   * @returns An array of generated notificationIds (one per parent)
   */
  async sendAlertNotification(
    studentId: string,
    alertType: AlertType,
    severity: Severity
  ): Promise<string[]> {
    try {
      // Only send if severity is MEDIUM or higher
      if (NotificationService.SEVERITY_WEIGHTS[severity] < NotificationService.SEVERITY_WEIGHTS['MEDIUM']) {
        console.info(`[NotificationService] Alert severity ${severity} is below threshold. Skipping.`);
        return [];
      }

      const parentsSnapshot = await db.collection('users')
        .where('role', '==', 'PARENT')
        .where('studentIds', 'array-contains', studentId)
        .get();

      if (parentsSnapshot.empty) {
        return [];
      }

      const batch = db.batch();
      const notificationIds: string[] = [];
      const alertMessage = `Alert: We noticed a ${alertType.replace('_', ' ').toLowerCase()} regarding your student's learning.`;

      parentsSnapshot.forEach(parentDoc => {
        const notificationId = randomUUID();
        const record: NotificationRecord = {
          notificationId,
          parentId: parentDoc.id,
          studentId,
          type: 'ALERT',
          data: { alertType, severity, message: alertMessage },
          sentAt: new Date().toISOString(),
          readAt: null,
          deliveryLogs: [],
        };

        const docRef = db.collection('notifications').doc(notificationId);
        batch.set(docRef, record);
        notificationIds.push(notificationId);
      });

      await batch.commit();
      return notificationIds;

    } catch (error) {
      console.error(`[NotificationService] Failed to send alert for student ${studentId}:`, error);
      return [];
    }
  }

  /**
   * Logs the delivery status of a notification across different channels (e.g., Email, SMS).
   * 
   * @param notificationId - The ID of the notification
   * @param channel - The channel used for delivery
   * @param success - Whether the delivery was successful
   * @param error - Optional error message if delivery failed
   * @returns Boolean indicating if the log was successfully saved
   */
  async logDelivery(
    notificationId: string,
    channel: Channel,
    success: boolean,
    error?: string
  ): Promise<boolean> {
    try {
      const logEntry: DeliveryLog = {
        channel,
        success,
        timestamp: new Date().toISOString(),
      };

      if (error) {
        logEntry.error = error;
      }

      const docRef = db.collection('notifications').doc(notificationId);
      
      // Fetch and update to ensure we don't overwrite existing logs
      // (Avoids needing specific FieldValue.arrayUnion imports which vary by Firebase SDK version)
      const doc = await docRef.get();
      
      if (!doc.exists) {
        console.warn(`[NotificationService] Notification ${notificationId} not found for delivery logging.`);
        return false;
      }

      const data = doc.data() as NotificationRecord;
      const deliveryLogs = data.deliveryLogs || [];
      deliveryLogs.push(logEntry);

      await docRef.update({ deliveryLogs });
      return true;

    } catch (err) {
      console.error(`[NotificationService] Failed to log delivery for notification ${notificationId}:`, err);
      return false;
    }
  }
}

// ============================================================================
// EXPORTED API FUNCTIONS (for use in routes)
// ============================================================================

const notificationServiceInstance = new NotificationService();

/**
 * Get notifications for a parent with pagination
 */
export async function getNotifications(
  parentId: string,
  options: { limit?: number; offset?: number; unread?: boolean } = {}
) {
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  try {
    let query = db.collection('notifications').where('parentId', '==', parentId);
    
    if (options.unread) {
      query = query.where('readAt', '==', null);
    }

    const snapshot = await query.orderBy('sentAt', 'desc').limit(limit).offset(offset).get();
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { notifications, total: snapshot.size };
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return { notifications: [], total: 0 };
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string) {
  try {
    const docRef = db.collection('notifications').doc(notificationId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    await docRef.update({ readAt: new Date().toISOString() });
    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

/**
 * Get notification summary for a parent
 */
export async function getSummary(parentId: string) {
  try {
    const unreadSnapshot = await db.collection('notifications')
      .where('parentId', '==', parentId)
      .where('readAt', '==', null)
      .get();

    const allSnapshot = await db.collection('notifications')
      .where('parentId', '==', parentId)
      .get();

    return {
      totalNotifications: allSnapshot.size,
      unreadNotifications: unreadSnapshot.size
    };
  } catch (error) {
    console.error('Failed to get notification summary:', error);
    return { totalNotifications: 0, unreadNotifications: 0 };
  }
}

/**
 * Send a test notification
 */
export async function sendTestNotification(parentId: string, studentId: string) {
  return notificationServiceInstance.sendParentNotification(
    parentId,
    studentId,
    'CUSTOM',
    { message: 'This is a test notification', timestamp: new Date().toISOString() }
  );
}

/**
 * Get notification preferences for a parent
 */
export async function getPreferences(parentId: string) {
  try {
    const docRef = db.collection('notification_preferences').doc(parentId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return {
        parentId,
        channels: ['IN_APP'],
        weeklyReportEnabled: true,
        quietHours: { start: '22:00', end: '08:00' }
      };
    }

    return doc.data();
  } catch (error) {
    console.error('Failed to get preferences:', error);
    return { parentId, channels: ['IN_APP'] };
  }
}

/**
 * Update notification preferences for a parent
 */
export async function updatePreferences(parentId: string, preferences: any) {
  try {
    const docRef = db.collection('notification_preferences').doc(parentId);
    await docRef.set({ parentId, ...preferences }, { merge: true });
    const updated = await docRef.get();
    return updated.data();
  } catch (error) {
    console.error('Failed to update preferences:', error);
    throw error;
  }
}

