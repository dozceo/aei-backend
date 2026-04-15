/**
 * @file src/lib/tracking/student-tracker.ts
 * @description Core tracking system for student actions, feeding into ML and analytics.
 * Implements batching, exponential backoff retries, and privacy-first data sanitization.
 */
/**
 * Supported action types for analytics and ML tracking.
 */
export type ActionType = 'quiz_start' | 'quiz_answer' | 'quiz_complete' | 'concept_view' | 'lesson_play' | 'page_view' | 'click' | 'form_submit' | 'badge_earned' | 'milestone_reached' | 'login' | 'logout' | 'chat_message';
/**
 * Contextual information about where the event occurred.
 */
export interface TrackingContext {
    page: string;
    flow: string;
}
/**
 * Structure of a tracking event sent to the API.
 */
export interface TrackingEvent {
    userId: string;
    traceId: string;
    actionType: ActionType | string;
    timestamp: number;
    context: TrackingContext;
    metadata: Record<string, any>;
    outcome: 'success' | 'error';
}
/**
 * StudentTracker class for tracking user actions and sending them to the analytics API.
 */
export declare class StudentTracker {
    private queue;
    private userId;
    private currentContext;
    private isFlushing;
    /**
     * @param userId - The ID of the currently authenticated student
     */
    constructor(userId: string);
    /**
     * Updates the user ID if the user logs in/out after initialization.
     */
    setUserId(userId: string): void;
    /**
     * Queues an event locally to be batched and sent to the API.
     *
     * @param actionType - The type of action being tracked
     * @param metadata - Additional data about the event (PII will be stripped)
     * @param outcome - Whether the action was a success or error (defaults to success)
     * @returns The unique traceId for the generated event
     */
    track(actionType: ActionType | string, metadata?: Record<string, any>, outcome?: 'success' | 'error'): string;
    /**
     * Tracks a page view and updates the current tracking context.
     * Designed to be called on page load/mount.
     *
     * @param pageId - The identifier for the current page
     * @param flow - The user flow the page belongs to (e.g., 'onboarding', 'quiz_attempt')
     * @returns A cleanup function to be called on unmount
     */
    trackPageView(pageId: string, flow: string): () => void;
    /**
     * Flushes the currently queued events to the API.
     * Implements exponential backoff for retries on failure.
     */
    flush(): Promise<void>;
    /**
     * Internal method to send events with exponential backoff retry logic.
     */
    private sendWithRetry;
    /**
     * Exposes the current queue size for debugging purposes.
     */
    getQueueSize(): number;
}
//# sourceMappingURL=student-tracker.d.ts.map