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
export declare class NotificationService {
    /**
     * Severity ranking to easily compare severity levels
     */
    private static readonly SEVERITY_WEIGHTS;
    /**
     * Strips Personally Identifiable Information (PII) from notification payloads.
     * @param data - The raw notification data
     * @returns Sanitized data object
     */
    private sanitizeData;
    /**
     * Creates a single notification record for a parent.
     *
     * @param parentId - The ID of the parent receiving the notification
     * @param studentId - The ID of the student the notification is about
     * @param type - The category of the notification
     * @param data - Additional payload data (PII will be stripped)
     * @returns The generated notificationId, or null if the operation failed
     */
    sendParentNotification(parentId: string, studentId: string, type: NotificationType, data: Record<string, any>): Promise<string | null>;
    /**
     * Generates and sends a weekly report to all parents of a specific student.
     * Calculates mastery, engagement, and growth over the past 7 days.
     *
     * @param studentId - The ID of the student
     * @returns The count of notifications successfully queued/sent
     */
    sendWeeklyReport(studentId: string): Promise<number>;
    /**
     * Sends an alert notification to parents if the severity meets the threshold (>= MEDIUM).
     *
     * @param studentId - The ID of the student
     * @param alertType - The specific type of alert
     * @param severity - The severity level of the alert
     * @returns An array of generated notificationIds (one per parent)
     */
    sendAlertNotification(studentId: string, alertType: AlertType, severity: Severity): Promise<string[]>;
    /**
     * Logs the delivery status of a notification across different channels (e.g., Email, SMS).
     *
     * @param notificationId - The ID of the notification
     * @param channel - The channel used for delivery
     * @param success - Whether the delivery was successful
     * @param error - Optional error message if delivery failed
     * @returns Boolean indicating if the log was successfully saved
     */
    logDelivery(notificationId: string, channel: Channel, success: boolean, error?: string): Promise<boolean>;
}
/**
 * Get notifications for a parent with pagination
 */
export declare function getNotifications(parentId: string, options?: {
    limit?: number;
    offset?: number;
    unread?: boolean;
}): Promise<{
    notifications: {
        id: string;
    }[];
    total: number;
}>;
/**
 * Mark a notification as read
 */
export declare function markAsRead(notificationId: string): Promise<{
    id: string;
}>;
/**
 * Get notification summary for a parent
 */
export declare function getSummary(parentId: string): Promise<{
    totalNotifications: number;
    unreadNotifications: number;
}>;
/**
 * Send a test notification
 */
export declare function sendTestNotification(parentId: string, studentId: string): Promise<string>;
/**
 * Get notification preferences for a parent
 */
export declare function getPreferences(parentId: string): Promise<FirebaseFirestore.DocumentData>;
/**
 * Update notification preferences for a parent
 */
export declare function updatePreferences(parentId: string, preferences: any): Promise<FirebaseFirestore.DocumentData>;
//# sourceMappingURL=notification-service.d.ts.map