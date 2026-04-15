import { Router, Request, Response, NextFunction } from 'express';
import { Validator } from 'jsonschema';
import { verifyAuth } from '../middleware/auth';
import * as InterventionService from '../services/intervention-service';
import { logger } from '../utils/logger';
import type { UserContext } from '../../types/auth-context';

const router = Router();
const v = new Validator();

// --- JSON Schemas ---

const resolveAlertSchema = {
  id: '/ResolveAlert',
  type: 'object',
  properties: {
    action: { type: 'string', minLength: 1 },
    teacherNotes: { type: 'string' }
  },
  required: ['action']
};

const triggerDetectionSchema = {
  id: '/TriggerDetection',
  type: 'object',
  properties: {
    studentId: { type: 'string', minLength: 1 }
  }
};

// --- Helper Functions ---

const isValidId = (id: string) => /^[a-zA-Z0-9_-]{10,32}$/.test(id);

const handleError = (err: any, res: Response, next: NextFunction) => {
  logger.error('Intervention Route Error:', err);
  
  if (err.message?.toLowerCase().includes('not found')) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  if (err.message?.toLowerCase().includes('forbidden') || err.message?.toLowerCase().includes('unauthorized')) {
    return res.status(403).json({ error: 'Forbidden access' });
  }
  if (err.name === 'ValidationError' || err.message?.toLowerCase().includes('invalid')) {
    return res.status(400).json({ error: err.message });
  }
  
  res.status(500).json({ error: 'Internal server error' });
};

// --- Routes ---

// Apply authentication middleware to all routes
router.use(verifyAuth);

/**
 * 1. GET /api/interventions/student/:studentId
 * Returns paginated list of alerts for a student
 */
router.get('/student/:studentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    if (!isValidId(studentId)) {
      return res.status(400).json({ error: 'Invalid studentId format' });
    }

    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const status = (req.query.status as string) || 'all';

    if (!['UNRESOLVED', 'RESOLVED', 'all'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'UNRESOLVED', 'RESOLVED', or 'all'" });
    }

    const alerts = await InterventionService.getStudentAlerts(studentId, req.user!.uid, {
      limit,
      offset,
      status,
      sortBy: [{ field: 'createdAt', direction: 'desc' }, { field: 'severity', direction: 'desc' }]
    });

    res.status(200).json(alerts);
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * 3. GET /api/interventions/teacher/dashboard
 * Returns dashboard statistics for a specific class
 * Note: Placed before /:alertId to prevent route collision
 */
router.get('/teacher/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.query.classId as string;
    
    if (!classId || !isValidId(classId)) {
      return res.status(400).json({ error: 'Valid classId query parameter is required' });
    }

    // Service will verify if req.user.uid is the owner/teacher of classId
    const dashboardData = await InterventionService.getTeacherDashboard(classId, req.user!.uid);
    
    res.status(200).json(dashboardData);
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * 6. GET /api/interventions/analytics
 * Returns analytics for interventions over a date range
 */
router.get('/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.query.classId as string;
    
    if (!classId || !isValidId(classId)) {
      return res.status(400).json({ error: 'Valid classId query parameter is required' });
    }

    // Default to last 30 days if not provided
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const analytics = await InterventionService.getAnalytics(classId, req.user!.uid, {
      startDate,
      endDate
    });

    res.status(200).json(analytics);
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * 5. POST /api/interventions/trigger
 * Manually trigger intervention detection (Admin/Testing only)
 */
router.post('/trigger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin') {
      logger.warn(`Unauthorized trigger attempt by user ${req.user!.uid}`);
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const validation = v.validate(req.body, triggerDetectionSchema);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.map(e => e.stack) });
    }

    const { studentId } = req.body;
    const result = await InterventionService.triggerDetection(studentId);

    logger.info(`Intervention detection triggered by ${req.user!.uid}`, { studentId, result });
    res.status(200).json(result);
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * 2. POST /api/interventions/:alertId/resolve
 * Mark an intervention as resolved
 */
router.post('/:alertId/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { alertId } = req.params;
    if (!isValidId(alertId)) {
      return res.status(400).json({ error: 'Invalid alertId format' });
    }

    const validation = v.validate(req.body, resolveAlertSchema);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.map(e => e.stack) });
    }

    const { action, teacherNotes } = req.body;
    
    const updatedAlert = await InterventionService.resolveAlert(alertId, req.user!.uid, {
      action,
      teacherNotes,
      status: 'RESOLVED',
      resolvedAt: new Date()
    });

    logger.info(`Alert ${alertId} resolved by ${req.user!.uid}`);
    res.status(200).json(updatedAlert);
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * 4. GET /api/interventions/:alertId
 * Get single intervention details with context
 */
router.get('/:alertId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { alertId } = req.params;
    if (!isValidId(alertId)) {
      return res.status(400).json({ error: 'Invalid alertId format' });
    }

    const alertDetails = await InterventionService.getAlertDetails(alertId, req.user!.uid);
    
    if (!alertDetails) {
      return res.status(404).json({ error: 'Intervention alert not found' });
    }

    res.status(200).json(alertDetails);
  } catch (error) {
    handleError(error, res, next);
  }
});

export default router;

