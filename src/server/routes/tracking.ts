import { Router, Request, Response, NextFunction } from 'express';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Validator } from 'jsonschema';
import rateLimit from 'express-rate-limit';

// Mock imports for authentication middleware (replace with your actual paths)
import { verifyAuth, verifyAdmin } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const db = getFirestore();
const validator = new Validator();

// --- Types & Interfaces ---

interface TrackingEvent {
  userId: string;
  traceId?: string;
  actionType: string;
  timestamp: number | string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  outcome?: string;
}

// --- JSON Schemas ---

const eventSchema = {
  id: '/Event',
  type: 'object',
  properties: {
    userId: { type: 'string' },
    traceId: { type: 'string' },
    actionType: { type: 'string' },
    timestamp: { type: ['number', 'string'] },
    context: { type: 'object' },
    metadata: { type: 'object' },
    outcome: { type: 'string' }
  },
  required: ['userId', 'actionType', 'timestamp']
};

const batchSchema = {
  id: '/Batch',
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: { $ref: '/Event' },
      maxItems: 500 // Firestore batch limit
    }
  },
  required: ['events']
};

validator.addSchema(eventSchema, '/Event');

// --- Middleware & Helpers ---

// Rate limiting: 100 requests per second per IP/User
const trackingRateLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 100,
  message: { error: 'Too many tracking requests, please try again later.' },
  keyGenerator: (req: any) => req.user?.uid || req.ip
});

// PII Stripping Helper
const PII_KEYS = new Set(['email', 'name', 'phone', 'ssn', 'address', 'password', 'credit_card']);

function stripPII(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripPII);

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (PII_KEYS.has(key.toLowerCase())) {
      cleaned[key] = '[REDACTED]';
    } else {
      cleaned[key] = stripPII(value);
    }
  }
  return cleaned;
}

// Prepare event for Firestore (adds TTL and strips PII)
function prepareEventForStorage(event: TrackingEvent) {
  const cleanedEvent = stripPII(event);
  
  // Ensure timestamp is a number for consistent sorting
  const eventTime = new Date(cleanedEvent.timestamp).getTime();
  
  return {
    ...cleanedEvent,
    timestamp: eventTime,
    // TTL: 1 year from now
    expiresAt: Timestamp.fromMillis(Date.now() + 365 * 24 * 60 * 60 * 1000),
    storedAt: FieldValue.serverTimestamp()
  };
}

// --- Endpoints ---

/**
 * 1. POST /api/tracking/events
 * Batch ingestion of tracking events
 */
router.post('/events', verifyAuth, trackingRateLimiter, async (req: Request, res: Response) => {
  try {
    const validation = validator.validate(req.body, batchSchema);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid batch payload', details: validation.errors });
    }

    const events: TrackingEvent[] = req.body.events;
    const batch = db.batch();
    const collectionRef = db.collection('tracking_events');

    let processed = 0;
    let errors = 0;

    events.forEach((event) => {
      try {
        const docRef = collectionRef.doc();
        batch.set(docRef, prepareEventForStorage(event));
        processed++;
      } catch (err) {
        errors++;
        logger.error('Error preparing event for batch', { error: err, event });
      }
    });

    // Async processing - commit batch without waiting for it to finish to return 202 quickly
    batch.commit().catch(err => {
      logger.error('Firestore batch commit failed', { error: err });
    });

    return res.status(202).json({
      received: events.length,
      processed,
      errors
    });
  } catch (error) {
    logger.error('Batch tracking error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 2. POST /api/tracking/event
 * Single event ingestion (fallback)
 */
router.post('/event', verifyAuth, trackingRateLimiter, async (req: Request, res: Response) => {
  try {
    const validation = validator.validate(req.body, eventSchema);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid event payload', details: validation.errors });
    }

    const eventData = prepareEventForStorage(req.body);
    const docRef = await db.collection('tracking_events').add(eventData);

    return res.status(201).json({ eventId: docRef.id });
  } catch (error) {
    logger.error('Single tracking error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 3. GET /api/tracking/student/:studentId/summary
 * Student activity summary
 */
router.get('/student/:studentId/summary', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const days = parseInt(req.query.dateRange as string) || 7;
    const startDate = Date.now() - days * 24 * 60 * 60 * 1000;

    const snapshot = await db.collection('tracking_events')
      .where('userId', '==', studentId)
      .where('timestamp', '>=', startDate)
      .get();

    let totalEvents = 0;
    let lastActivityAt = 0;
    const eventsByType: Record<string, number> = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      totalEvents++;
      
      eventsByType[data.actionType] = (eventsByType[data.actionType] || 0) + 1;
      
      if (data.timestamp > lastActivityAt) {
        lastActivityAt = data.timestamp;
      }
    });

    return res.json({
      totalEvents,
      eventsByType,
      lastActivityAt: lastActivityAt || null
    });
  } catch (error) {
    logger.error('Summary fetch error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 4. GET /api/tracking/student/:studentId/timeline
 * Paginated timeline of events
 */
router.get('/student/:studentId/timeline', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 30;
    const offset = parseInt(req.query.offset as string) || 0;
    const actionTypes = req.query.actionTypes ? (req.query.actionTypes as string).split(',') : null;

    let query = db.collection('tracking_events')
      .where('userId', '==', studentId);

    if (actionTypes && actionTypes.length > 0) {
      query = query.where('actionType', 'in', actionTypes.slice(0, 10)); // Firestore 'in' limit is 10
    }

    query = query.orderBy('timestamp', 'desc')
                 .limit(limit)
                 .offset(offset);

    const snapshot = await query.get();
    const timeline = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        actionType: data.actionType,
        timestamp: data.timestamp,
        context: data.context,
        metadata: data.metadata,
        outcome: data.outcome
      };
    });

    return res.json({ timeline, limit, offset });
  } catch (error) {
    logger.error('Timeline fetch error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 5. DELETE /api/tracking/student/:studentId
 * Delete all tracking events for student (GDPR/CCPA Compliance)
 */
router.delete('/student/:studentId', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { reason } = req.body;

    logger.info(`Initiating data deletion for user ${studentId}`, { reason });

    const collectionRef = db.collection('tracking_events');
    const snapshot = await collectionRef.where('userId', '==', studentId).get();

    if (snapshot.empty) {
      return res.json({ deletedCount: 0 });
    }

    // Firestore requires batching deletes in chunks of 500
    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;
    let deletedCount = 0;

    snapshot.docs.forEach((doc) => {
      currentBatch.delete(doc.ref);
      operationCount++;
      deletedCount++;

      if (operationCount === 500) {
        batches.push(currentBatch.commit());
        currentBatch = db.batch();
        operationCount = 0;
      }
    });

    if (operationCount > 0) {
      batches.push(currentBatch.commit());
    }

    await Promise.all(batches);

    return res.json({ deletedCount });
  } catch (error) {
    logger.error('Data deletion error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 6. GET /api/tracking/analytics
 * Aggregated analytics (Admin only)
 */
router.get('/analytics', verifyAuth, verifyAdmin, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.dateRange as string) || 30;
    const metric = req.query.metric as string; // e.g., 'views', 'clicks', 'completions'
    const startDate = Date.now() - days * 24 * 60 * 60 * 1000;

    if (!metric) {
      return res.status(400).json({ error: 'Metric query parameter is required' });
    }

    // Note: For massive datasets, consider exporting Firestore to BigQuery.
    // This is a basic aggregation suitable for moderate traffic.
    const snapshot = await db.collection('tracking_events')
      .where('actionType', '==', metric)
      .where('timestamp', '>=', startDate)
      .get();

    const aggregatedData: Record<string, number> = {};
    let total = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      total++;
      
      // Group by day (YYYY-MM-DD)
      const dateStr = new Date(data.timestamp).toISOString().split('T')[0];
      aggregatedData[dateStr] = (aggregatedData[dateStr] || 0) + 1;
    });

    return res.json({
      metric,
      dateRange: `${days} days`,
      total,
      timeseries: aggregatedData
    });
  } catch (error) {
    logger.error('Analytics fetch error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

