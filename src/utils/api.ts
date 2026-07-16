import { Debt, PaymentRecord, SavingsGoal, Transaction, AccountProfile } from '../types';
import { WompiPlanId } from './wompi';

const API_URL = (import.meta.env.VITE_API_URL || 'https://appsalvaquincena.cafeysoftware.com').replace(/\/$/, '');
const TOKEN_KEY = 'salvaquincena_api_token';

type ApiUser = {
  id: number;
  name: string;
  email: string;
  profile?: {
    phone?: string | null;
  } | null;
  subscription?: ApiSubscription | null;
};

type ApiSubscription = {
  status?: string;
  plan?: string | null;
  ends_at?: string | null;
};

type ApiTransaction = {
  external_id?: string | null;
  description: string;
  amount_cents: number;
  type: 'income' | 'expense';
  category?: string | null;
  transaction_date: string;
  wompi_payment_id?: number | null;
};

type ApiSavingsGoal = {
  external_id?: string | null;
  name: string;
  target_amount_cents: number;
  current_amount_cents: number;
  target_date?: string | null;
};

type ApiDebt = {
  external_id?: string | null;
  name: string;
  balance_cents: number;
  annual_rate?: number | null;
  minimum_payment_cents?: number | null;
  term_months?: number | null;
  is_advanced?: boolean | number;
};

type ApiPayment = {
  id: number;
  transaction_id?: string | null;
  reference: string;
  status: string;
  amount_cents: number;
  currency: 'COP';
  plan: 'monthly' | 'annual';
  plan_label?: string | null;
  created_at: string;
  user?: ApiUser;
};

export type SyncPayload = {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  debts: Debt[];
};

export type SyncResult = {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  debts: Debt[];
  payments: PaymentRecord[];
  isPro: boolean;
  subscriptionEndsAt: string | null;
  subscriptionPlan: string | null;
};

export type AdvisorMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function getApiToken(): string {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setApiToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearApiToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getApiToken();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('No pudimos conectar con tu cuenta. Revisa tu conexion o intenta de nuevo en unos minutos.');
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'message' in payload
      ? String(payload.message)
      : 'No se pudo completar la solicitud.';
    throw new Error(message);
  }

  return payload as T;
}

export function profileFromApiUser(user: ApiUser): AccountProfile {
  return {
    name: user.name,
    email: user.email,
    phone: user.profile?.phone || '',
    createdAt: new Date().toISOString(),
    acceptedTermsAt: new Date().toISOString(),
  };
}

export async function registerAccount(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  acceptedTerms: boolean;
}): Promise<AccountProfile> {
  const response = await apiRequest<{ token: string; user: ApiUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      phone: input.phone,
      password: input.password,
      accepted_terms: input.acceptedTerms,
    }),
  });

  setApiToken(response.token);
  return profileFromApiUser(response.user);
}

export async function loginAccount(email: string, password: string): Promise<AccountProfile> {
  const response = await apiRequest<{ token: string; user: ApiUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setApiToken(response.token);
  return profileFromApiUser(response.user);
}

export async function logoutAccount(): Promise<void> {
  if (getApiToken()) {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  }

  clearApiToken();
}

export async function fetchCurrentAccount(): Promise<AccountProfile> {
  const response = await apiRequest<{ user: ApiUser }>('/api/me');
  return profileFromApiUser(response.user);
}

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (amount: number) => Math.round(amount / 100);

function buildSyncBody(payload: SyncPayload) {
  return {
    transactions: payload.transactions.map((transaction) => ({
      external_id: transaction.id,
      description: transaction.description,
      amount_cents: toCents(transaction.amount),
      type: transaction.type,
      category: transaction.category,
      transaction_date: transaction.date,
    })),
    savings_goals: payload.savingsGoals.map((goal) => ({
      external_id: goal.id,
      name: goal.name,
      target_amount_cents: toCents(goal.targetAmount),
      current_amount_cents: toCents(goal.currentAmount),
      target_date: goal.targetDate,
    })),
    debts: payload.debts.map((debt) => ({
      external_id: debt.id,
      name: debt.name,
      balance_cents: toCents(debt.balance),
      annual_rate: debt.interestRate || 0,
      minimum_payment_cents: toCents(debt.minimumPayment || 0),
      term_months: debt.termMonths || null,
      is_advanced: debt.isAdvanced,
    })),
  };
}

function mapSyncResponse(response: {
  transactions?: ApiTransaction[];
  savings_goals?: ApiSavingsGoal[];
  debts?: ApiDebt[];
  payments?: ApiPayment[];
  subscription?: ApiSubscription | null;
}): SyncResult {
  const transactions = (response.transactions || []).map((transaction) => ({
    id: transaction.external_id || crypto.randomUUID(),
    description: transaction.description,
    amount: fromCents(transaction.amount_cents),
    type: transaction.type,
    category: transaction.category || 'Otros',
    date: transaction.transaction_date?.slice(0, 10),
    paymentId: transaction.wompi_payment_id ? String(transaction.wompi_payment_id) : undefined,
  }));

  const savingsGoals = (response.savings_goals || []).map((goal) => ({
    id: goal.external_id || crypto.randomUUID(),
    name: goal.name,
    targetAmount: fromCents(goal.target_amount_cents),
    currentAmount: fromCents(goal.current_amount_cents || 0),
    targetDate: goal.target_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
  }));

  const debts = (response.debts || []).map((debt) => ({
    id: debt.external_id || crypto.randomUUID(),
    name: debt.name,
    balance: fromCents(debt.balance_cents),
    interestRate: Number(debt.annual_rate || 0),
    minimumPayment: fromCents(debt.minimum_payment_cents || 0),
    termMonths: debt.term_months || undefined,
    isAdvanced: Boolean(debt.is_advanced),
  }));

  const payments = (response.payments || []).map((payment) => ({
    id: payment.transaction_id || String(payment.id),
    reference: payment.reference,
    status: payment.status,
    amount: fromCents(payment.amount_cents),
    currency: payment.currency,
    plan: payment.plan,
    planLabel: payment.plan_label || payment.plan,
    accountEmail: payment.user?.email || '',
    accountName: payment.user?.name || '',
    createdAt: payment.created_at,
  }));

  const isPro = response.subscription?.status === 'active';
  const subscriptionEndsAt = response.subscription?.ends_at || null;
  const subscriptionPlan = response.subscription?.plan || null;

  return { transactions, savingsGoals, debts, payments, isPro, subscriptionEndsAt, subscriptionPlan };
}

export async function fetchSync(): Promise<SyncResult> {
  const response = await apiRequest('/api/sync');
  return mapSyncResponse(response as Parameters<typeof mapSyncResponse>[0]);
}

export async function pushSync(payload: SyncPayload): Promise<SyncResult> {
  const response = await apiRequest('/api/sync', {
    method: 'POST',
    body: JSON.stringify(buildSyncBody(payload)),
  });

  return mapSyncResponse(response as Parameters<typeof mapSyncResponse>[0]);
}

export async function refreshSubscription(): Promise<boolean> {
  const response = await apiRequest<{ is_pro: boolean }>('/api/subscription');
  return response.is_pro;
}

export async function createProCheckout(plan: WompiPlanId): Promise<{ reference: string; checkoutUrl: string }> {
  const response = await apiRequest<{ reference: string; checkout_url: string }>('/api/subscription/checkout', {
    method: 'POST',
    body: JSON.stringify({
      plan,
      redirect_url: window.location.origin + window.location.pathname,
    }),
  });

  return {
    reference: response.reference,
    checkoutUrl: response.checkout_url,
  };
}

export async function askFinancialAdvisor(message: string, history: AdvisorMessage[]): Promise<string> {
  const response = await apiRequest<{ reply: string }>('/api/advisor/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      history: history.slice(-8),
    }),
  });

  return response.reply;
}
