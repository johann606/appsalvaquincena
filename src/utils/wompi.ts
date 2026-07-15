// Wompi payment integration helper
// Public key is safe to use on client-side. Integrity secret should move to backend in production.
// NEVER include PRIVATE_KEY or EVENTS_SECRET in frontend code

export const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY || '';
const WOMPI_INTEGRITY_SECRET = import.meta.env.VITE_WOMPI_INTEGRITY_SECRET || '';

export const WOMPI_CURRENCY = 'COP';

export const WOMPI_PLANS = {
  monthly: {
    id: 'monthly',
    label: 'Mensual',
    amountCop: 15000,
    description: 'Renovación mensual'
  },
  annual: {
    id: 'annual',
    label: 'Anual',
    amountCop: 165000,
    description: 'Un año de acceso PRO'
  }
} as const;

export type WompiPlanId = keyof typeof WOMPI_PLANS;

export interface WompiTransaction {
  id: string;
  status: string;
  reference?: string;
}

export interface WompiCustomer {
  email: string;
  fullName: string;
  phoneNumber?: string;
}

export function validateWompiConfig(): string | null {
  if (!WOMPI_PUBLIC_KEY || !WOMPI_INTEGRITY_SECRET) {
    return 'Faltan VITE_WOMPI_PUBLIC_KEY y/o VITE_WOMPI_INTEGRITY_SECRET en el archivo .env.local.';
  }

  const publicKeyEnv = WOMPI_PUBLIC_KEY.startsWith('pub_prod_') ? 'prod' : WOMPI_PUBLIC_KEY.startsWith('pub_test_') ? 'test' : null;
  const integrityEnv = WOMPI_INTEGRITY_SECRET.startsWith('prod_integrity_') ? 'prod' : WOMPI_INTEGRITY_SECRET.startsWith('test_integrity_') ? 'test' : null;

  if (!publicKeyEnv || !integrityEnv) {
    return 'Las llaves de Wompi no tienen el prefijo esperado: pub_test_/pub_prod_ y test_integrity_/prod_integrity_.';
  }

  if (publicKeyEnv !== integrityEnv) {
    return 'La llave publica y el integrity secret pertenecen a ambientes distintos. Usa test con test, o prod con prod.';
  }

  return null;
}

/**
 * Generates a unique payment reference for this transaction.
 */
export function generateReference(planId: WompiPlanId): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SQ-PRO-${planId.toUpperCase()}-${timestamp}-${random}`;
}

/**
 * Generates the Wompi integrity signature using Web Crypto API (SHA-256).
 * Formula: SHA256(reference + amountInCents + currency + integritySecret)
 */
export async function generateIntegritySignature(reference: string, amountInCents: number): Promise<string> {
  const signatureString = `${reference}${amountInCents}${WOMPI_CURRENCY}${WOMPI_INTEGRITY_SECRET}`;
  const msgBuffer = new TextEncoder().encode(signatureString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function buildWompiCheckoutUrl(planId: WompiPlanId, customer?: WompiCustomer): Promise<{ url: string; reference: string }> {
  const configError = validateWompiConfig();
  if (configError) {
    throw new Error(configError);
  }

  const plan = WOMPI_PLANS[planId];
  const amountInCents = plan.amountCop * 100;
  const reference = generateReference(planId);
  const signature = await generateIntegritySignature(reference, amountInCents);
  const redirectUrl = window.location.origin + window.location.pathname;
  const params: string[] = [
    `public-key=${encodeURIComponent(WOMPI_PUBLIC_KEY)}`,
    `currency=${encodeURIComponent(WOMPI_CURRENCY)}`,
    `amount-in-cents=${amountInCents}`,
    `reference=${encodeURIComponent(reference)}`,
    `signature:integrity=${encodeURIComponent(signature)}`
  ];

  if (window.location.protocol === 'https:') {
    params.push(`redirect-url=${encodeURIComponent(redirectUrl)}`);
  }

  if (customer?.email) {
    params.push(`customer-data:email=${encodeURIComponent(customer.email)}`);
  }

  if (customer?.fullName) {
    params.push(`customer-data:full-name=${encodeURIComponent(customer.fullName)}`);
  }

  if (customer?.phoneNumber) {
    params.push(`customer-data:phone-number=${encodeURIComponent(customer.phoneNumber)}`);
    params.push(`customer-data:phone-number-prefix=${encodeURIComponent('+57')}`);
  }

  return {
    url: `https://checkout.wompi.co/p/?${params.join('&')}`,
    reference
  };
}
