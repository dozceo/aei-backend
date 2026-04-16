import { Router, Request, Response, NextFunction } from 'express';
import { Validator } from 'jsonschema';
import { verifyAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  completeBillingCheckoutSession,
  createBillingCheckoutSession,
  getBillingCheckoutSession,
  getBillingPlans,
  type BillingSessionStatus,
} from '../services/billing-service';

const router = Router();
const validator = new Validator();

const checkoutSchema = {
  id: '/BillingCheckoutInput',
  type: 'object',
  properties: {
    planId: { type: 'string', enum: ['starter', 'school_pro', 'enterprise'] },
    billingName: { type: 'string', minLength: 2, maxLength: 120 },
    billingEmail: { type: 'string', minLength: 3, maxLength: 120 },
    paymentMethod: { type: 'string', enum: ['CARD', 'UPI', 'NETBANKING'] },
    discountCode: { type: 'string', maxLength: 40 },
    billingAddress: {
      type: 'object',
      properties: {
        line1: { type: 'string', minLength: 2, maxLength: 120 },
        line2: { type: 'string', maxLength: 120 },
        city: { type: 'string', minLength: 2, maxLength: 80 },
        state: { type: 'string', minLength: 2, maxLength: 80 },
        postalCode: { type: 'string', minLength: 3, maxLength: 24 },
        country: { type: 'string', minLength: 2, maxLength: 80 },
      },
      required: ['line1', 'city', 'state', 'postalCode', 'country'],
      additionalProperties: false,
    },
  },
  required: ['planId', 'billingName', 'billingEmail', 'paymentMethod', 'billingAddress'],
  additionalProperties: false,
};

const completeSchema = {
  id: '/BillingCompleteInput',
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['SUCCEEDED', 'FAILED'] },
  },
  required: ['status'],
  additionalProperties: false,
};

function parseValidationErrors(errors: Array<{ stack: string }>): string[] {
  return errors.map((entry) => entry.stack);
}

function handleRouteError(error: unknown, res: Response, next: NextFunction): void {
  const message = error instanceof Error ? error.message : 'Unknown billing error';
  logger.error('Billing route error', { message });

  if (message.toLowerCase().includes('forbidden')) {
    res.status(403).json({ error: 'Forbidden', message: 'You can only access your own billing sessions.' });
    return;
  }

  if (message.toLowerCase().includes('not found')) {
    res.status(404).json({ error: 'Not Found', message: 'Billing session not found.' });
    return;
  }

  if (message.toLowerCase().includes('unknown billing plan')) {
    res.status(400).json({ error: 'Invalid plan', message });
    return;
  }

  next(error);
}

router.use(verifyAuth);

router.get('/billing/plans', (req: Request, res: Response) => {
  res.status(200).json({
    plans: getBillingPlans(),
  });
});

router.post('/billing/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validator.validate(req.body, checkoutSchema);

    if (!validation.valid) {
      res.status(400).json({
        error: 'Invalid checkout payload',
        details: parseValidationErrors(validation.errors as Array<{ stack: string }>),
      });
      return;
    }

    const result = await createBillingCheckoutSession(req.user!.uid, req.body);

    logger.info('Billing checkout session created', {
      sessionId: result.sessionId,
      uid: req.user!.uid,
      planId: result.plan.id,
      totalAmountInr: result.totalAmountInr,
    });

    res.status(201).json(result);
  } catch (error) {
    handleRouteError(error, res, next);
  }
});

router.get('/billing/checkout/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await getBillingCheckoutSession(req.user!.uid, req.params.sessionId);

    if (!session) {
      res.status(404).json({ error: 'Not Found', message: 'Billing session not found.' });
      return;
    }

    res.status(200).json(session);
  } catch (error) {
    handleRouteError(error, res, next);
  }
});

router.post('/billing/checkout/:sessionId/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validator.validate(req.body, completeSchema);

    if (!validation.valid) {
      res.status(400).json({
        error: 'Invalid completion payload',
        details: parseValidationErrors(validation.errors as Array<{ stack: string }>),
      });
      return;
    }

    const status = req.body.status as Extract<BillingSessionStatus, 'SUCCEEDED' | 'FAILED'>;
    const session = await completeBillingCheckoutSession(req.user!.uid, req.params.sessionId, status);

    logger.info('Billing checkout session completed', {
      sessionId: session.sessionId,
      uid: req.user!.uid,
      status: session.status,
    });

    res.status(200).json(session);
  } catch (error) {
    handleRouteError(error, res, next);
  }
});

export default router;
