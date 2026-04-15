"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListenerManager = exports.db = void 0;
exports.onStudentStateChange = onStudentStateChange;
exports.onTeacherAlerts = onTeacherAlerts;
exports.onParentNotifications = onParentNotifications;
exports.onInterventionUpdates = onInterventionUpdates;
const firestore_1 = require("firebase-admin/firestore");
/**
 * The initialized Firestore instance.
 */
exports.db = (0, firestore_1.getFirestore)();
// ============================================================================
// LISTENER FUNCTIONS (Simplified - Use standard queries in API)
// ============================================================================
/**
 * Note: For backend APIs, use standard queries instead of real-time listeners.
 * These are kept for potential future use but backend APIs should use
 * db.collection().where().get() pattern instead.
 */
function onStudentStateChange(studentId, callback) {
    console.info(`Listener registered for student: ${studentId}`);
    return () => console.info(`Listener unsubscribed for student: ${studentId}`);
}
function onTeacherAlerts(teacherId, callback) {
    console.info(`Listener registered for teacher alerts: ${teacherId}`);
    return () => console.info(`Listener unsubscribed for teacher alerts: ${teacherId}`);
}
function onParentNotifications(parentId, callback) {
    console.info(`Listener registered for parent notifications: ${parentId}`);
    return () => console.info(`Listener unsubscribed for parent notifications: ${parentId}`);
}
function onInterventionUpdates(studentId, callback) {
    console.info(`Listener registered for intervention updates: ${studentId}`);
    return () => console.info(`Listener unsubscribed for intervention updates: ${studentId}`);
}
/**
 * Manages real-time Firestore listeners based on user type.
 * Note: Backend implementations should prefer standard queries.
 */
class ListenerManager {
    constructor(userId, userType) {
        this._unsubscribes = [];
        this._eventListeners = new Map();
        this.isConnected = false;
        this.error = null;
        this.userId = userId;
        this.userType = userType;
    }
    start() {
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
    stop() {
        if (!this.isConnected) {
            return;
        }
        this._unsubscribes.forEach(unsub => unsub());
        this._unsubscribes = [];
        this.isConnected = false;
        this.error = null;
        this._emit('connectionStateChange', { isConnected: false });
    }
    on(eventType, callback) {
        if (!this._eventListeners.has(eventType)) {
            this._eventListeners.set(eventType, new Set());
        }
        this._eventListeners.get(eventType).add(callback);
        return () => {
            this._eventListeners.get(eventType)?.delete(callback);
        };
    }
    setupStudentListeners() {
        const unsubState = onStudentStateChange(this.userId, (data, err) => {
            this.handleCallback('studentStateChange', data, err);
        });
        const unsubIntervention = onInterventionUpdates(this.userId, (data, err) => {
            this.handleCallback('interventionUpdates', data, err);
        });
        this._unsubscribes.push(unsubState, unsubIntervention);
    }
    setupTeacherListeners() {
        const unsubAlerts = onTeacherAlerts(this.userId, (data, err) => {
            this.handleCallback('teacherAlerts', data, err);
        });
        this._unsubscribes.push(unsubAlerts);
    }
    setupParentListeners() {
        const unsubNotifications = onParentNotifications(this.userId, (data, err) => {
            this.handleCallback('parentNotifications', data, err);
        });
        this._unsubscribes.push(unsubNotifications);
    }
    handleCallback(eventType, data, error) {
        if (error) {
            this.error = error;
            this._emit('error', error);
        }
        else {
            if (this.error) {
                this.error = null;
            }
            this._emit(eventType, data);
        }
    }
    _emit(eventType, payload) {
        const listeners = this._eventListeners.get(eventType);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(payload);
                }
                catch (e) {
                    console.error(`Error in event listener for '${eventType}':`, e);
                }
            });
        }
    }
}
exports.ListenerManager = ListenerManager;
//# sourceMappingURL=firebase-listeners.js.map