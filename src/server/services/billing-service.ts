import { db, firebaseAdmin } from '../../lib/firebase';

export type BillingPlanId = 'starter' | 'school_pro' | 'enterprise';
export type BillingPaymentMethod = 'CARD' | 'UPI' | 'NETBANKING';
export type BillingSessionStatus = 'CREATED' | 'SUCCEEDED' | 'FAILED';

export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  monthlyAmountInr: number;
  currency: 'INR';
  seatLimit: number;
  features: string[];
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CreateBillingCheckoutInput {
  planId: BillingPlanId;
  billingName: string;
  billingEmail: string;
  paymentMethod: BillingPaymentMethod;
  discountCode?: string;
  billingAddress: BillingAddress;
}

export interface BillingCheckoutSessionSummary {
  sessionId: string;
  status: BillingSessionStatus;
  checkoutProvider: 'SIMULATED';
  plan: BillingPlan;
  billingName: string;
  billingEmail: string;
  paymentMethod: BillingPaymentMethod;
  discountCode: string | null;
  subtotalAmountInr: number;
  discountAmountInr: number;
  totalAmountInr: number;
  createdAtIso: string;
  updatedAtIso: string;
  successUrl: string;
  failureUrl: string;
}

const BILLING_PLANS: BillingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyAmountInr: 499,
    currency: 'INR',
    seatLimit: 1,
    features: ['Student dashboard', 'AI companion basic', 'Weekly progress report'],
  },
  {
    id: 'school_pro',
    name: 'School Pro',
    monthlyAmountInr: 2499,
    currency: 'INR',
    seatLimit: 120,
    features: ['Teacher intervention tools', 'Parent inbox', 'Realtime analytics'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyAmountInr: 9999,
    currency: 'INR',
    seatLimit: 1000,
    features: ['Custom integrations', 'Priority support', 'Advanced compliance controls'],
  },
];

const DISCOUNT_CODES: Record<string, number> = {
  SANKALP10: 0.1,
  SCHOOL20: 0.2,
};

interface BillingCheckoutSessionRecord {
  ownerUid: string;
  status: BillingSessionStatus;
  checkoutProvider: 'SIMULATED';
  planId: BillingPlanId;
  billingName: string;
  billingEmail: string;
  paymentMethod: BillingPaymentMethod;
  discountCode: string | null;
  subtotalAmountInr: number;
  discountAmountInr: number;
  totalAmountInr: number;
  billingAddress: BillingAddress;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

function getFrontendBaseUrl(): string {
  const value = process.env.FRONTEND_URL || 'http://localhost:3000';
  return value.replace(/\/$/, '');
}

function sanitizePlainText(input: string, maxLength: number): string {
  return input.replace(/[<>]/g, '').trim().slice(0, maxLength);
}

function sanitizeAddress(address: BillingAddress): BillingAddress {
  return {
    line1: sanitizePlainText(address.line1, 120),
    line2: sanitizePlainText(address.line2 || '', 120),
    city: sanitizePlainText(address.city, 80),
    state: sanitizePlainText(address.state, 80),
    postalCode: sanitizePlainText(address.postalCode, 24),
    country: sanitizePlainText(address.country, 80),
  };
}

function requirePlan(planId: BillingPlanId): BillingPlan {
  const plan = BILLING_PLANS.find((item) => item.id === planId);

  if (!plan) {
    throw new Error(`Unknown billing plan: ${planId}`);
  }

  return plan;
}

function computeDiscountAmount(subtotalAmountInr: number, discountCode: string | undefined): { code: string | null; amountInr: number } {
  if (!discountCode) {
    return { code: null, amountInr: 0 };
  }

  const normalized = discountCode.trim().toUpperCase();
  const ratio = DISCOUNT_CODES[normalized];

  if (!ratio) {
    return { code: null, amountInr: 0 };
  }

  return {
    code: normalized,
    amountInr: Math.round(subtotalAmountInr * ratio),
  };
}

function toIsoString(value: FirebaseFirestore.Timestamp | undefined): string {
  return value ? value.toDate().toISOString() : new Date().toISOString();
}

function mapSessionSummary(sessionId: string, record: BillingCheckoutSessionRecord): BillingCheckoutSessionSummary {
  const plan = requirePlan(record.planId);
  const frontendBaseUrl = getFrontendBaseUrl();

  return {
    sessionId,
    status: record.status,
    checkoutProvider: record.checkoutProvider,
    plan,
    billingName: record.billingName,
    billingEmail: record.billingEmail,
    paymentMethod: record.paymentMethod,
    discountCode: record.discountCode,
    subtotalAmountInr: record.subtotalAmountInr,
    discountAmountInr: record.discountAmountInr,
    totalAmountInr: record.totalAmountInr,
    createdAtIso: toIsoString(record.createdAt),
    updatedAtIso: toIsoString(record.updatedAt),
    successUrl: `${frontendBaseUrl}/billing/success?session=${sessionId}`,
    failureUrl: `${frontendBaseUrl}/billing/failed?session=${sessionId}`,
  };
}

export function getBillingPlans(): BillingPlan[] {
  return BILLING_PLANS;
}

export async function createBillingCheckoutSession(ownerUid: string, input: CreateBillingCheckoutInput): Promise<BillingCheckoutSessionSummary> {
  const plan = requirePlan(input.planId);
  const discount = computeDiscountAmount(plan.monthlyAmountInr, input.discountCode);
  const subtotalAmountInr = plan.monthlyAmountInr;
  const totalAmountInr = Math.max(subtotalAmountInr - discount.amountInr, 0);

  const payload: BillingCheckoutSessionRecord = {
    ownerUid,
    status: 'CREATED',
    checkoutProvider: 'SIMULATED',
    planId: input.planId,
    billingName: sanitizePlainText(input.billingName, 120),
    billingEmail: sanitizePlainText(input.billingEmail, 120),
    paymentMethod: input.paymentMethod,
    discountCode: discount.code,
    subtotalAmountInr,
    discountAmountInr: discount.amountInr,
    totalAmountInr,
    billingAddress: sanitizeAddress(input.billingAddress),
  };

  const docRef = db.collection('billing_checkout_sessions').doc();
  const now = firebaseAdmin.firestore.Timestamp.now();

  await docRef.set({
    ...payload,
    createdAt: now,
    updatedAt: now,
  });

  return mapSessionSummary(docRef.id, {
    ...payload,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getBillingCheckoutSession(ownerUid: string, sessionId: string): Promise<BillingCheckoutSessionSummary | null> {
  const snapshot = await db.collection('billing_checkout_sessions').doc(sessionId).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() as BillingCheckoutSessionRecord;

  if (data.ownerUid !== ownerUid) {
    throw new Error('Forbidden');
  }

  return mapSessionSummary(sessionId, data);
}

export async function completeBillingCheckoutSession(
  ownerUid: string,
  sessionId: string,
  status: Extract<BillingSessionStatus, 'SUCCEEDED' | 'FAILED'>,
): Promise<BillingCheckoutSessionSummary> {
  const session = await getBillingCheckoutSession(ownerUid, sessionId);

  if (!session) {
    throw new Error('Not found');
  }

  const updatedAt = firebaseAdmin.firestore.Timestamp.now();

  await db.collection('billing_checkout_sessions').doc(sessionId).set(
    {
      status,
      updatedAt,
    },
    { merge: true },
  );

  const refreshed = await db.collection('billing_checkout_sessions').doc(sessionId).get();
  const refreshedData = refreshed.data() as BillingCheckoutSessionRecord;

  return mapSessionSummary(sessionId, refreshedData);
}
