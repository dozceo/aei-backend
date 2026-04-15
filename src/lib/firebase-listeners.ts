import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';
import type { Query, DocumentReference } from 'firebase-admin/firestore';

/**
 * The initialized Firestore instance.
 */
export const db: Firestore = getFirestore();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type UserType = 'STUDENT' | 'TEACHER' | 'PARENT';

export type EventType =
  | 'studentStateChange'
  | 'teacherAlerts'
  | 'parentNotifications'
  | 'interventionUpdates'
  | 'error'
  | 'connectionStateChange';

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

// ============================================================================
// LISTENER FUNCTIONS (Simplified - Use standard queries in API)
// ============================================================================

/**
 * Note: For backend APIs, use standard queries instead of real-time listeners.
 * These are kept for potential future use but backend APIs should use
 * db.collection().where().get() pattern instead.
 */

export function onStudentStateChange(
  studentId: string,
  callback: ListenerCallback<StudentState>
): Unsubscriber {
  console.info(`Listener registered for student: ${studentId}`);
  return () => console.info(`Listener unsubscribed for student: ${studentId}`);
}

export function onTeacherAlerts(
  teacherId: string,
  callback: ListenerCallback<Alert[]>
): Unsubscriber {
  console.info(`Listener registered for teacher alerts: ${teacherId}`);
  return () => console.info(`Listener unsubscribed for teacher alerts: ${teacherId}`);
}

export function onParentNotifications(
  parentId: string,
  callback: ListenerCallback<Notification[]>
): Unsubscriber {
  console.info(`Listener registered for parent notifications: ${parentId}`);
  return () => console.info(`Listener unsubscribed for parent notifications: ${parentId}`);
}

export function onInterventionUpdates(
  studentId: string,
  callback: ListenerCallback<Alert[]>
): Unsubscriber {
  console.info(`Listener registered for intervention updates: ${studentId}`);
  return () => console.info(`Listener unsubscribed for intervention updates: ${studentId}`);
}

// ============================================================================
// LISTENER MANAGER
// ============================================================================

type EventCallback = (payload: any) => void;

/**
 * Manages real-time Firestore listeners based on user type.
 * Note: Backend implementations should prefer standard queries.
 */
export class ListenerManager {
  private readonly userId: string;
  private readonly userType: UserType;
  private _unsubscribes: Unsubscriber[] = [];
  private _eventListeners: Map<EventType, Set<EventCallback>> = new Map();

  public isConnected: boolean = false;
  public error: Error | null = null;

  constructor(userId: string, userType: UserType) {
    this.userId = userId;
    this.userType = userType;
  }

  public start(): void {
    if (this.isConnected) {
      console.warn('ListenerManager already started.');
      return;
    }

    this.isConnected = true;
    this._emit('connectionStateChange', { isConnected: true });

    switch (this.userType) {
      case 'STUDENT':
        this.setupStudentListeners();
        break;
      case 'TEACHER':
        this.setupTeacherListeners();
        break;
      case 'PARENT':
        this.setupParentListeners();
        break;
    }
  }

  public stop(): void {
    if (!this.isConnected) {
      return;
    }
    this._unsubscribes.forEach(unsub => unsub());
    this._unsubscribes = [];
    this.isConnected = false;
    this.error = null;
    this._emit('connectionStateChange', { isConnected: false });
  }

  public on(eventType: EventType, callback: EventCallback): () => void {
    if (!this._eventListeners.has(eventType)) {
      this._eventListeners.set(eventType, new Set());
    }
    this._eventListeners.get(eventType)!.add(callback);

    return () => {
      this._eventListeners.get(eventType)?.delete(callback);
    };
  }

  private setupStudentListeners(): void {
    const unsubState = onStudentStateChange(this.userId, (data, err) => {
      this.handleCallback('studentStateChange', data, err);
    });
    const unsubIntervention = onInterventionUpdates(this.userId, (data, err) => {
      this.handleCallback('interventionUpdates', data, err);
    });
    this._unsubscribes.push(unsubState, unsubIntervention);
  }

  private setupTeacherListeners(): void {
    const unsubAlerts = onTeacherAlerts(this.userId, (data, err) => {
      this.handleCallback('teacherAlerts', data, err);
    });
    this._unsubscribes.push(unsubAlerts);
  }

  private setupParentListeners(): void {
    const unsubNotifications = onParentNotifications(this.userId, (data, err) => {
      this.handleCallback('parentNotifications', data, err);
    });
    this._unsubscribes.push(unsubNotifications);
  }

  private handleCallback<T>(eventType: EventType, data: T | null, error: Error | null): void {
    if (error) {
      this.error = error;
      this._emit('error', error);
    } else {
      if (this.error) {
        this.error = null;
      }
      this._emit(eventType, data);
    }
  }

  private _emit(eventType: EventType, payload: any): void {
    const listeners = this._eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(payload);
        } catch (e) {
          console.error(`Error in event listener for '${eventType}':`, e);
        }
      });
    }
  }
}

