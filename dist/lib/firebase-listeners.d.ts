import { Firestore, Timestamp } from 'firebase-admin/firestore';
/**
 * The initialized Firestore instance.
 */
export declare const db: Firestore;
export type UserType = 'STUDENT' | 'TEACHER' | 'PARENT';
export type EventType = 'studentStateChange' | 'teacherAlerts' | 'parentNotifications' | 'interventionUpdates' | 'error' | 'connectionStateChange';
export interface Student {
    id: string;
    name: string;
    grade: number;
    currentFocus?: string;
}
export interface MemoryRecord {
    id: string;
    studentId: string;
    topic: string;
    score: number;
    recordedAt: Timestamp;
}
export interface StudentState {
    student: Student;
    memoryRecords: MemoryRecord[];
}
export interface Alert {
    id: string;
    studentId: string;
    teacherId: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    createdAt: Timestamp;
    resolvedAt: Timestamp | null;
}
export interface Notification {
    id: string;
    parentId: string;
    studentId: string;
    message: string;
    sentAt: Timestamp;
    read: boolean;
}
export type ListenerCallback<T> = (data: T | null, error: Error | null) => void;
export type Unsubscriber = () => void;
/**
 * Note: For backend APIs, use standard queries instead of real-time listeners.
 * These are kept for potential future use but backend APIs should use
 * db.collection().where().get() pattern instead.
 */
export declare function onStudentStateChange(studentId: string, callback: ListenerCallback<StudentState>): Unsubscriber;
export declare function onTeacherAlerts(teacherId: string, callback: ListenerCallback<Alert[]>): Unsubscriber;
export declare function onParentNotifications(parentId: string, callback: ListenerCallback<Notification[]>): Unsubscriber;
export declare function onInterventionUpdates(studentId: string, callback: ListenerCallback<Alert[]>): Unsubscriber;
type EventCallback = (payload: any) => void;
/**
 * Manages real-time Firestore listeners based on user type.
 * Note: Backend implementations should prefer standard queries.
 */
export declare class ListenerManager {
    private readonly userId;
    private readonly userType;
    private _unsubscribes;
    private _eventListeners;
    isConnected: boolean;
    error: Error | null;
    constructor(userId: string, userType: UserType);
    start(): void;
    stop(): void;
    on(eventType: EventType, callback: EventCallback): () => void;
    private setupStudentListeners;
    private setupTeacherListeners;
    private setupParentListeners;
    private handleCallback;
    private _emit;
}
export {};
//# sourceMappingURL=firebase-listeners.d.ts.map