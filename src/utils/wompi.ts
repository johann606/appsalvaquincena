export const WOMPI_PLANS = {
  monthly: {
    id: 'monthly',
    label: 'Mensual',
    amountCop: 15000,
    description: 'Renovacion mensual'
  },
  annual: {
    id: 'annual',
    label: 'Anual',
    amountCop: 165000,
    description: 'Un ano de acceso PRO'
  }
} as const;

export type WompiPlanId = keyof typeof WOMPI_PLANS;
