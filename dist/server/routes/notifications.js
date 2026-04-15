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
const logger_1 = require("../utils/logger");
const NotificationService = __importStar(require("../services/notification-service"));
const router = (0, express_1.Router)();
const validator = new jsonschema_1.Validator();
// JSON Schema for Notification Preferences Validation
const preferencesSchema = {
    id: '/NotificationPreferences',
    type: 'object',
    properties: {
        channels: {
            type: 'array',
            items: { type: 'string', enum: ['IN_APP', 'EMAIL', 'SMS'] }
        },
        weeklyReportEnabled: { type: 'boolean' },
        alertTypes: {
            type: 'array',
            items: { type: 'string' }
        },
        quietHours: {
            type: 'object',
            properties: {
                start: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' }, // HH:MM format
                end: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' }
            },
            required: ['start', 'end']
        }
    },
    additionalProperties: false
};
// Middleware: Log all requests to this router
router.use((req, res, next) => {
    logger_1.logger.info(`[Notifications Router] ${req.method} ${req.originalUrl}`);
    next();
});
// Middleware: Require Firebase Authentication for all routes
router.use(auth_1.verifyAuth);
/**
 * 1. GET /api/notifications/parent/:parentId
 * Returns paginated list of notifications for parent
 */
router.get('/parent/:parentId', async (req, res) => {
    try {
        const { parentId } = req.params;
        if (!parentId) {
            res.status(400).json({ error: 'Missing parentId parameter' });
            return;
        }
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = parseInt(req.query.offset, 10) || 0;
        let unread = undefined;
        if (req.query.unread !== undefined) {
            unread = req.query.unread === 'true';
        }
        const notifications = await NotificationService.getNotifications(parentId, {
            limit,
            offset,
            unread
        });
        res.status(200).json(notifications);
    }
    catch (error) {
        logger_1.logger.error(`Error fetching notifications for parent: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * 2. POST /api/notifications/:notificationId/read
 * Mark notification as read
 */
router.post('/:notificationId/read', async (req, res) => {
    try {
        const { notificationId } = req.params;
        if (!notificationId) {
            res.status(400).json({ error: 'Missing notificationId parameter' });
            return;
        }
        const updatedNotification = await NotificationService.markAsRead(notificationId);
        if (!updatedNotification) {
            res.status(404).json({ error: 'Notification not found' });
            return;
        }
        res.status(200).json(updatedNotification);
    }
    catch (error) {
        logger_1.logger.error(`Error marking notification as read: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * 3. GET /api/notifications/parent/:parentId/summary
 * Returns: totalCount, unreadCount, alertCount, achievementCount
 */
router.get('/parent/:parentId/summary', async (req, res) => {
    try {
        const { parentId } = req.params;
        if (!parentId) {
            res.status(400).json({ error: 'Missing parentId parameter' });
            return;
        }
        const summary = await NotificationService.getSummary(parentId);
        if (!summary) {
            res.status(404).json({ error: 'Summary not found for the specified parent' });
            return;
        }
        res.status(200).json(summary);
    }
    catch (error) {
        logger_1.logger.error(`Error fetching notification summary: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * 4. POST /api/notifications/test/send
 * For testing: sends test notification (Disabled in production)
 */
router.post('/test/send', async (req, res) => {
    try {
        // Security check: Remove/disable in production
        if (process.env.NODE_ENV === 'production') {
            logger_1.logger.warn('Attempted to access test notification endpoint in production');
            res.status(404).json({ error: 'Endpoint not available in production' });
            return;
        }
        const parentId = req.query.parentId;
        const studentId = req.query.studentId;
        if (!parentId || !studentId) {
            res.status(400).json({ error: 'Missing parentId or studentId query parameters' });
            return;
        }
        const notificationId = await NotificationService.sendTestNotification(parentId, studentId);
        res.status(201).json({ notificationId });
    }
    catch (error) {
        logger_1.logger.error(`Error sending test notification: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * 5. GET /api/notifications/preferences/:parentId
 * Get parent notification preferences
 */
router.get('/preferences/:parentId', async (req, res) => {
    try {
        const { parentId } = req.params;
        if (!parentId) {
            res.status(400).json({ error: 'Missing parentId parameter' });
            return;
        }
        const preferences = await NotificationService.getPreferences(parentId);
        if (!preferences) {
            res.status(404).json({ error: 'Preferences not found' });
            return;
        }
        res.status(200).json(preferences);
    }
    catch (error) {
        logger_1.logger.error(`Error fetching preferences: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * 6. PUT /api/notifications/preferences/:parentId
 * Update notification preferences
 */
router.put('/preferences/:parentId', async (req, res) => {
    try {
        const { parentId } = req.params;
        if (!parentId) {
            res.status(400).json({ error: 'Missing parentId parameter' });
            return;
        }
        // Validate request body against JSON schema
        const validationResult = validator.validate(req.body, preferencesSchema);
        if (!validationResult.valid) {
            res.status(400).json({
                error: 'Invalid preferences payload',
                details: validationResult.errors.map(e => e.stack)
            });
            return;
        }
        const updatedPreferences = await NotificationService.updatePreferences(parentId, req.body);
        if (!updatedPreferences) {
            res.status(404).json({ error: 'Parent not found to update preferences' });
            return;
        }
        res.status(200).json(updatedPreferences);
    }
    catch (error) {
        logger_1.logger.error(`Error updating preferences: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map