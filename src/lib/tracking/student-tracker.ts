/**
 * @file src/lib/tracking/student-tracker.ts
 * @description Core tracking system for student actions, feeding into ML and analytics.
 * Implements batching, exponential backoff retries, and privacy-first data sanitization.
 */

/**
 * Supported action types for analytics and ML tracking.
 */
export type ActionType =
  | 'quiz_start'
  | 'quiz_answer'
  | 'quiz_complete'
  | 'concept_view'
  | 'lesson_play'
  | 'page_view'
  | 'click'
  | 'form_submit'
  | 'badge_earned'
  | 'milestone_reached'
  | 'login'
  | 'logout'
  | 'chat_message';

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

// Keys that are considered Personally Identifiable Information (PII) and must be stripped.
const PII_KEYS = new Set([
  'email', 'name', 'password', 'phone', 'address', 'ssn', 'credit_card', 'dob'
]);

/**
 * Recursively sanitizes metadata to ensure no PII is sent to the tracking API.
 * @param metadata - The metadata object to sanitize
 * @returns A sanitized copy of the metadata
 */
function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  if (!metadata || typeof metadata !== 'object') return {};

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (PII_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Generates a unique identifier for events.
 */
function generateTraceId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxx-xxxx-xxx-xxxx'.replace(/[x]/g, () =>
    ((Math.random() * 16) | 0).toString(16)
  );
}

/**
 * Internal EventQueue class to manage in-memory batching of tracking events.
 */
class EventQueue {
  private events: TrackingEvent[] = [];
  private flushIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly flushCallback: () => Promise<void>;
  private readonly FLUSH_INTERVAL_MS = 30000; // 30 seconds

  /**
   * @param flushCallback - The function to call when the queue needs to be flushed
   */
  constructor(flushCallback: () => Promise<void>) {
    this.flushCallback = flushCallback;
    this.startAutoFlush();
    this.setupUnloadHandler();
  }

  /**
   * Adds an event to the queue.
   */
  public add(event: TrackingEvent): void {
    this.events.push(event);
  }

  /**
   * Drains the current queue, returning all events and clearing the internal array.
   * This prevents race conditions where new events are added during a flush.
   */
  public drain(): TrackingEvent[] {
    const batch = [...this.events];
    this.events = [];
    return batch;
  }

  /**
   * Puts events back at the front of the queue (used when a flush fails).
   */
  public unshift(...events: TrackingEvent[]): void {
    this.events.unshift(...events);
  }

  /**
   * Returns the current number of events in the queue.
   */
  public getQueueSize(): number {
    return this.events.length;
  }

  /**
   * Starts the 30-second auto-flush timer.
   */
  private startAutoFlush(): void {
    if (this.flushIntervalId) return;
    this.flushIntervalId = setInterval(() => {
      if (this.events.length > 0) {
        this.flushCallback().catch(console.error);
      }
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Ensures events are flushed when the application shuts down.
   * Note: This is a server-side implementation, not using browser unload handlers.
   */
  private setupUnloadHandler(): void {
    // In backend context, we rely on periodic flush and explicit drain calls
    // Add process-level handlers if needed
    if (process.env.NODE_ENV === 'production') {
      process.on('SIGTERM', () => {
        this.flushCallback().catch(console.error);
      });
      process.on('SIGINT', () => {
        this.flushCallback().catch(console.error);
      });
    }
  }
}

/**
 * StudentTracker class for tracking user actions and sending them to the analytics API.
 */
export class StudentTracker {
  private queue: EventQueue;
  private userId: string;
  private currentContext: TrackingContext;
  private isFlushing: boolean = false;

  /**
   * @param userId - The ID of the currently authenticated student
   */
  constructor(userId: string) {
    this.userId = userId;
    this.currentContext = { page: 'unknown', flow: 'unknown' };
    this.queue = new EventQueue(() => this.flush());
  }

  /**
   * Updates the user ID if the user logs in/out after initialization.
   */
  public setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Queues an event locally to be batched and sent to the API.
   * 
   * @param actionType - The type of action being tracked
   * @param metadata - Additional data about the event (PII will be stripped)
   * @param outcome - Whether the action was a success or error (defaults to success)
   * @returns The unique traceId for the generated event
   */
  public track(
    actionType: ActionType | string,
    metadata: Record<string, any> = {},
    outcome: 'success' | 'error' = 'success'
  ): string {
    const traceId = generateTraceId();
    
    const event: TrackingEvent = {
      userId: this.userId,
      traceId,
      actionType,
      timestamp: Date.now(),
      context: { ...this.currentContext },
      metadata: sanitizeMetadata(metadata),
      outcome,
    };

    this.queue.add(event);
    return traceId;
  }

  /**
   * Tracks a page view and updates the current tracking context.
   * Designed to be called on page load/mount.
   * 
   * @param pageId - The identifier for the current page
   * @param flow - The user flow the page belongs to (e.g., 'onboarding', 'quiz_attempt')
   * @returns A cleanup function to be called on unmount
   */
  public trackPageView(pageId: string, flow: string): () => void {
    this.currentContext = { page: pageId, flow };
    this.track('page_view', { pageId, flow });

    // Return cleanup function for unmount
    return () => {
      this.track('page_leave', { pageId, flow, timeSpentMs: Date.now() });
      this.currentContext = { page: 'unknown', flow: 'unknown' };
    };
  }

  /**
   * Flushes the currently queued events to the API.
   * Implements exponential backoff for retries on failure.
   */
  public async flush(): Promise<void> {
    if (this.isFlushing || this.queue.getQueueSize() === 0) return;

    this.isFlushing = true;
    const batch = this.queue.drain();

    try {
      await this.sendWithRetry(batch);
    } catch (error) {
      console.error('[StudentTracker] Failed to flush events after retries:', error);
      // Put events back at the front of the queue to try again later
      this.queue.unshift(...batch);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Internal method to send events with exponential backoff retry logic.
   */
  private async sendWithRetry(
    events: TrackingEvent[],
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<void> {
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const response = await fetch('/api/tracking/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events }),
        });

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        // Success - exit the retry loop
        return;
      } catch (error) {
        attempt++;
        if (attempt > maxRetries) {
          throw error; // Exhausted retries
        }

        // Exponential backoff: 1s, 2s, 4s...
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Exposes the current queue size for debugging purposes.
   */
  public getQueueSize(): number {
    return this.queue.getQueueSize();
  }
}

