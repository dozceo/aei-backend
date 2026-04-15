/**
 * Supported intervention trigger types.
 */
export type TriggerType = 'ATTENTION_RISK' | 'MASTERY_DROP' | 'QUIZ_FAILURE_STREAK' | 'OVERDUE_ASSIGNMENT' | 'LONG_ABSENCE';
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
export declare class InterventionService {
    private db;
    /**
     * Queries all active students, evaluates all triggers for each student,
     * creates deduplicated alerts, and queues parent notifications.
     *
     * @returns {Promise<void>}
     */
    detectInterventions(): Promise<void>;
    /**
     * Checks a specific trigger condition for a given student.
     *
     * @param {string} studentId - The ID of the student.
     * @param {TriggerType} triggerType - The type of trigger to evaluate.
     * @returns {Promise<TriggerResult>} Object containing boolean trigger status and optional context.
     */
    checkTrigger(studentId: string, triggerType: TriggerType): Promise<TriggerResult>;
    /**
     * Logs an intervention alert to Firestore. Prevents duplicate alerts for the
     * same student and trigger type on the same day.
     *
     * @param {string} studentId - The ID of the student.
     * @param {TriggerType} triggerType - The type of trigger that caused the alert.
     * @param {Severity} severity - The severity level of the alert.
     * @returns {Promise<string | null>} The new alert ID, or null if a duplicate was prevented.
     */
    logInterventionCreated(studentId: string, triggerType: TriggerType, severity: Severity): Promise<string | null>;
    /**
     * Queues a notification to be sent to the student's parents.
     *
     * @private
     */
    private queueParentNotification;
    /**
     * Maps a trigger type to its corresponding severity level.
     *
     * @private
     */
    private getSeverityForTrigger;
}
/**
 * Get active alerts for a student
 */
export declare function getStudentAlerts(studentId: string, userId: string, options?: {
    limit?: number;
    offset?: number;
    [key: string]: any;
}): Promise<{
    id: string;
}[]>;
/**
 * Get teacher dashboard data
 */
export declare function getTeacherDashboard(classId: string, userId: string): Promise<{
    classId: string;
    activeAlerts: number;
    recentAlerts: {
        id: string;
    }[];
}>;
/**
 * Get analytics for a class
 */
export declare function getAnalytics(classId: string, userId: string, options?: {
    period?: 'day' | 'week' | 'month';
    [key: string]: any;
}): Promise<{
    period: "day" | "week" | "month";
    totalAlerts: number;
    byTrigger: Record<string, number>;
} | {
    period: string;
    totalAlerts: number;
    byTrigger: {};
}>;
/**
 * Trigger manual intervention detection
 */
export declare function triggerDetection(studentId: string): Promise<{
    success: boolean;
    studentId: string;
    message: string;
}>;
/**
 * Resolve an alert
 */
export declare function resolveAlert(alertId: string, userId: string, data?: {
    notes?: string;
    resolution?: string;
    [key: string]: any;
}): Promise<{
    id: string;
}>;
/**
 * Get alert details
 */
export declare function getAlertDetails(alertId: string, userId: string): Promise<{
    id: string;
}>;
//# sourceMappingURL=intervention-service.d.ts.map