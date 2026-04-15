"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonschema_1 = require("jsonschema");
const auth_1 = require("../middleware/auth");
const InterventionService = __importStar(require("../services/intervention-service"));
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const v = new jsonschema_1.Validator();
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
const isValidId = (id) => /^[a-zA-Z0-9_-]{10,32}$/.test(id);
const handleError = (err, res, next) => {
    logger_1.logger.error('Intervention Route Error:', err);
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
router.use(auth_1.verifyAuth);
/**
 * 1. GET /api/interventions/student/:studentId
 * Returns paginated list of alerts for a student
 */
router.get('/student/:studentId', async (req, res, next) => {
    try {
        const { studentId } = req.params;
        if (!isValidId(studentId)) {
            return res.status(400).json({ error: 'Invalid studentId format' });
        }
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = parseInt(req.query.offset, 10) || 0;
        const status = req.query.status || 'all';
        if (!['UNRESOLVED', 'RESOLVED', 'all'].includes(status)) {
            return res.status(400).json({ error: "Status must be 'UNRESOLVED', 'RESOLVED', or 'all'" });
        }
        const alerts = await InterventionService.getStudentAlerts(studentId, req.user.uid, {
            limit,
            offset,
            status,
            sortBy: [{ field: 'createdAt', direction: 'desc' }, { field: 'severity', direction: 'desc' }]
        });
        res.status(200).json(alerts);
    }
    catch (error) {
        handleError(error, res, next);
    }
});
/**
 * 3. GET /api/interventions/teacher/dashboard
 * Returns dashboard statistics for a specific class
 * Note: Placed before /:alertId to prevent route collision
 */
router.get('/teacher/dashboard', async (req, res, next) => {
    try {
        const classId = req.query.classId;
        if (!classId || !isValidId(classId)) {
            return res.status(400).json({ error: 'Valid classId query parameter is required' });
        }
        // Service will verify if req.user.uid is the owner/teacher of classId
        const dashboardData = await InterventionService.getTeacherDashboard(classId, req.user.uid);
        res.status(200).json(dashboardData);
    }
    catch (error) {
        handleError(error, res, next);
    }
});
/**
 * 6. GET /api/interventions/analytics
 * Returns analytics for interventions over a date range
 */
router.get('/analytics', async (req, res, next) => {
    try {
        const classId = req.query.classId;
        if (!classId || !isValidId(classId)) {
            return res.status(400).json({ error: 'Valid classId query parameter is required' });
        }
        // Default to last 30 days if not provided
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const analytics = await InterventionService.getAnalytics(classId, req.user.uid, {
            startDate,
            endDate
        });
        res.status(200).json(analytics);
    }
    catch (error) {
        handleError(error, res, next);
    }
});
/**
 * 5. POST /api/interventions/trigger
 * Manually trigger intervention detection (Admin/Testing only)
 */
router.post('/trigger', async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            logger_1.logger.warn(`Unauthorized trigger attempt by user ${req.user.uid}`);
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        const validation = v.validate(req.body, triggerDetectionSchema);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.errors.map(e => e.stack) });
        }
        const { studentId } = req.body;
        const result = await InterventionService.triggerDetection(studentId);
        logger_1.logger.info(`Intervention detection triggered by ${req.user.uid}`, { studentId, result });
        res.status(200).json(result);
    }
    catch (error) {
        handleError(error, res, next);
    }
});
/**
 * 2. POST /api/interventions/:alertId/resolve
 * Mark an intervention as resolved
 */
router.post('/:alertId/resolve', async (req, res, next) => {
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
        const updatedAlert = await InterventionService.resolveAlert(alertId, req.user.uid, {
            action,
            teacherNotes,
            status: 'RESOLVED',
            resolvedAt: new Date()
        });
        logger_1.logger.info(`Alert ${alertId} resolved by ${req.user.uid}`);
        res.status(200).json(updatedAlert);
    }
    catch (error) {
        handleError(error, res, next);
    }
});
/**
 * 4. GET /api/interventions/:alertId
 * Get single intervention details with context
 */
router.get('/:alertId', async (req, res, next) => {
    try {
        const { alertId } = req.params;
        if (!isValidId(alertId)) {
            return res.status(400).json({ error: 'Invalid alertId format' });
        }
        const alertDetails = await InterventionService.getAlertDetails(alertId, req.user.uid);
        if (!alertDetails) {
            return res.status(404).json({ error: 'Intervention alert not found' });
        }
        res.status(200).json(alertDetails);
    }
    catch (error) {
        handleError(error, res, next);
    }
});
exports.default = router;
//# sourceMappingURL=interventions.js.map