export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  paymentId?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

export interface Debt {
  id: string;
  name: string;
  balance: number;
  interestRate: number; // Annual Percentage Rate / TEA (%)
  minimumPayment: number; // Minimum monthly payment
  termMonths?: number; // Optional loan term
  isAdvanced: boolean; // Whether the user populated interestRate/minimumPayment/term
}

export interface SimulationResult {
  month: number;
  debts: {
    id: string;
    name: string;
    remainingBalance: number;
    paymentThisMonth: number;
  }[];
  totalPaidThisMonth: number;
  totalInterestPaidThisMonth: number;
  extraPaymentApplied: number;
}

export interface StrategyResult {
  strategyName: 'Snowball' | 'Avalanche';
  monthsToPayoff: number;
  totalInterestPaid: number;
  totalPaid: number;
  timeline: SimulationResult[];
}

export interface AccountProfile {
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  acceptedTermsAt: string;
}

export interface PaymentRecord {
  id: string;
  reference: string;
  status: string;
  amount: number;
  currency: 'COP';
  plan: 'monthly' | 'annual';
  planLabel: string;
  accountEmail: string;
  accountName: string;
  createdAt: string;
}
