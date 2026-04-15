import { Timestamp } from 'firebase/firestore';
/**
 * =================================================================
 * COLLECTION PATH CONSTANTS
 * =================================================================
 * Provides easy-to-use and consistent references to Firestore
 * collection names throughout the application.
 * =================================================================
 */
export declare const MEMORY_RECORDS_COLLECTION = "memory_records";
export declare const ALERTS_COLLECTION = "alerts";
export declare const NOTIFICATIONS_COLLECTION = "notifications";
export declare const CHAT_SESSIONS_COLLECTION = "chat_sessions";
export declare const AUDIT_LOGS_COLLECTION = "audit_logs";
/**
 * =================================================================
 * SUB-TYPES and ENUMS
 * =================================================================
 * Shared types, enums, and interfaces used across the main
 * collection interfaces.
 * =================================================================
 */
/**
 * Represents a single review event within a memory record.
 */
export interface ReviewEvent {
    /** The timestamp when the review occurred. */
    reviewedAt: Timestamp;
    /** The outcome of the review. */
    outcome: 'correct' | 'incorrect';
    /** The user's self-reported confidence level (0-1) at the time of review. */
    confidence: number;
}
export type AlertType = 'INTERVENTION' | 'ALERT' | 'ACHIEVEMENT';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
/**
 * Represents the data payload for an 'INTERVENTION' alert.
 */
export interface InterventionAlertData {
    /** The ID of the concept requiring intervention. */
    conceptId: string;
    /** A suggested action for the teacher or student. */
    suggestedAction: string;
}
/**
 * Represents the data payload for an 'ACHIEVEMENT' alert.
 */
export interface AchievementAlertData {
    /** The ID of the badge or achievement earned. */
    achievementId: string;
    /** The name of the achievement. */
    achievementName: string;
}
/**
 * A union type for the structured data payload in an Alert document.
 * Allows for specific typed data structures while providing a flexible fallback.
 */
export type AlertData = InterventionAlertData | AchievementAlertData | Record<string, unknown>;
export type NotificationType = 'WEEKLY_REPORT' | 'ALERT' | 'ACHIEVEMENT' | 'REMINDER';
export type DeliveryChannel = 'EMAIL' | 'PUSH' | 'IN_APP';
/**
 * Represents metadata for a 'WEEKLY_REPORT' notification.
 */
export interface WeeklyReportMetadata {
    /** The URL to the detailed weekly report. */
    reportUrl: string;
    /** The start date of the reporting period. */
    periodStart: Timestamp;
    /** The end date of the reporting period. */
    periodEnd: Timestamp;
}
/**
 * Represents metadata for an 'ACHIEVEMENT' notification.
 */
export interface AchievementMetadata {
    /** The ID of the achievement. */
    achievementId: string;
    /** The URL to the badge icon. */
    badgeIconUrl?: string;
}
/**
 * A union type for the structured metadata in a Notification document.
 */
export type NotificationMetadata = WeeklyReportMetadata | AchievementMetadata | Record<string, unknown>;
export type MentorType = 'MINDFUL_MENTOR' | 'TUTOR';
export type ChatMessageSender = 'user' | 'ai';
/**
 * Represents a single message within a chat session.
 */
export interface ChatMessage {
    /** The sender of the message. */
    sender: ChatMessageSender;
    /** The text content of the message. */
    content: string;
    /** The timestamp when the message was sent. */
    timestamp: Timestamp;
}
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW';
/**
 * Identifies a resource that was acted upon in an audit log.
 */
export interface ResourceIdentifier {
    /** The name of the Firestore collection. */
    collection: string;
    /** The ID of the document within the collection. */
    documentId: string;
}
/**
 * Represents the data state for a CREATE action.
 */
export interface CreateChange {
    /** The state of the data after creation. */
    after: Record<string, unknown>;
}
/**
 * Represents the data state for a DELETE action.
 */
export interface DeleteChange {
    /** The state of the data before deletion. */
    before: Record<string, unknown>;
}
/**
 * Represents the changes recorded in an audit log for an UPDATE action.
 */
export interface UpdateChange {
    /** The state of the data before the change. */
    before: Record<string, unknown>;
    /** The state of the data after the change. */
    after: Record<string, unknown>;
}
/**
 * A union type for the structured change data in an AuditLog document.
 */
export type AuditChangeData = CreateChange | UpdateChange | DeleteChange;
/**
 * =================================================================
 * MAIN COLLECTION INTERFACES
 * =================================================================
 * Defines the data structure for documents within each
 * Firestore collection.
 * =================================================================
 */
/**
 * Represents a document in the 'memory_records' collection.
 * Tracks a user's learning progress on a specific concept using spaced repetition principles.
 */
export interface MemoryRecord {
    /** The ID of the user this record belongs to. */
    userId: string;
    /** The ID of the concept being tracked. */
    conceptId: string;
    /** A score from 0 to 100 representing the user's mastery of the concept. */
    mastery: number;
    /** A score from 0 to 1 representing the user's self-reported confidence. */
    confidence: number;
    /** The timestamp of the last review session for this concept. */
    lastReviewed: Timestamp;
    /** The calculated timestamp for the next scheduled review. */
    nextReview: Timestamp;
    /** A historical log of all review events for this concept. */
    reviews: ReviewEvent[];
}
/**
 * Represents a document in the 'alerts' collection.
 * Used to flag situations requiring attention from students or teachers.
 */
export interface Alert {
    /** The unique identifier for the student involved. */
    studentId: string;
    /** The unique identifier for the teacher associated with the student. */
    teacherId: string;
    /** The category of the alert. */
    type: AlertType;
    /** The urgency or importance of the alert. */
    severity: AlertSeverity;
    /** A human-readable message describing the alert. */
    message: string;
    /** The timestamp when the alert was triggered. */
    triggeredAt: Timestamp;
    /** The timestamp when the alert was resolved. Null if unresolved. */
    resolvedAt: Timestamp | null;
    /** A flexible data object containing context-specific information about the alert. */
    data: AlertData;
}
/**
 * Represents a document in the 'notifications' collection.
 * A record of a message sent to a user.
 */
export interface Notification {
    /** The ID of the parent entity (e.g., an alertId) that triggered this notification. */
    parentId: string;
    /** The ID of the student who is the recipient of the notification. */
    studentId: string;
    /** The category of the notification. */
    type: NotificationType;
    /** The content of the notification message. */
    message: string;
    /** The timestamp when the user marked the notification as read. Null if unread. */
    readAt: Timestamp | null;
    /** The timestamp when the notification was sent. */
    sentAt: Timestamp;
    /** An array of channels through which the notification was delivered. */
    deliveryChannels: DeliveryChannel[];
    /** A flexible object containing additional data related to the notification. */
    metadata: NotificationMetadata;
}
/**
 * Represents a document in the 'chat_sessions' collection.
 * Contains the history of a chat between a student and an AI mentor.
 */
export interface ChatSession {
    /** The ID of the student participating in the chat. */
    studentId: string;
    /** The type of AI mentor in the session. */
    mentorType: MentorType;
    /** An array of all messages exchanged during the session. */
    messages: ChatMessage[];
    /** The timestamp when the chat session was initiated. */
    startedAt: Timestamp;
    /** The timestamp of the most recent message in the session. */
    lastMessageAt: Timestamp;
    /** An object containing contextual information for the chat session, like the topic. */
    context: {
        conceptId?: string;
        topic?: string;
        [key: string]: unknown;
    };
}
/**
 * Represents a document in the 'audit_logs' collection.
 * Records significant actions performed by users within the system for security and compliance.
 */
export interface AuditLog {
    /** The ID of the user who performed the action. */
    userId: string;
    /** The type of action that was performed. */
    action: AuditAction;
    /** An object identifying the resource that was affected. */
    resource: ResourceIdentifier;
    /** An object detailing the changes made, if applicable. Null for actions like LOGIN or VIEW. */
    changes: AuditChangeData | null;
    /** The timestamp when the action occurred. */
    timestamp: Timestamp;
    /** The IP address from which the action was initiated. */
    ipAddress: string;
    /** The user agent string of the client that performed the action. */
    userAgent: string;
}
//# sourceMappingURL=firestore.d.ts.map