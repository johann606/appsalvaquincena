import { Debt, StrategyResult, SimulationResult } from '../types';

// Convert TEA (Tasa Efectiva Anual) to TEM (Tasa Efectiva Mensual)
export function teaToTem(tea: number): number {
  return Math.pow(1 + tea / 100, 1 / 12) - 1;
}

export function runDebtSimulation(
  debts: Debt[],
  monthlyExtraPayment: number,
  strategy: 'Snowball' | 'Avalanche'
): StrategyResult {
  // Sort debts based on strategy
  const getSortedDebts = (activeDebts: Debt[]) => {
    const list = [...activeDebts];
    if (strategy === 'Snowball') {
      // Sort by balance ascending (smallest first)
      return list.sort((a, b) => a.balance - b.balance);
    } else {
      // Sort by interest rate descending (highest first)
      return list.sort((a, b) => b.interestRate - a.interestRate);
    }
  };

  // Clone debts to track balances during simulation
  let simulatedDebts = debts.map((d) => ({
    ...d,
    currentBalance: d.balance,
  }));

  const timeline: SimulationResult[] = [];
  let totalInterestPaid = 0;
  let totalPaid = 0;
  let month = 0;
  const maxMonths = 360; // 30 years safety cap

  // Calculate sum of minimum payments
  const sumMinimums = debts.reduce((sum, d) => sum + (d.minimumPayment || 0), 0);
  const totalMonthlyAllocation = sumMinimums + monthlyExtraPayment;

  while (simulatedDebts.some((d) => d.currentBalance > 0) && month < maxMonths) {
    month++;
    let extraAvailable = totalMonthlyAllocation;
    let interestThisMonthTotal = 0;
    let paidThisMonthTotal = 0;

    const monthlyPayments = simulatedDebts.map((d) => {
      if (d.currentBalance <= 0) {
        return { id: d.id, name: d.name, remainingBalance: 0, paymentThisMonth: 0, interest: 0 };
      }

      // Calculate interest for this month
      const monthlyRate = d.isAdvanced ? teaToTem(d.interestRate) : 0;
      const interest = d.currentBalance * monthlyRate;
      
      // Minimum payment covers interest + principal
      let minPay = d.isAdvanced ? d.minimumPayment : 0;
      
      // Cannot pay more than balance + interest
      const payoffAmount = d.currentBalance + interest;
      minPay = Math.min(minPay, payoffAmount);

      return {
        id: d.id,
        name: d.name,
        remainingBalance: d.currentBalance,
        paymentThisMonth: minPay,
        interest,
      };
    });

    // 1. Pay the minimums first
    monthlyPayments.forEach((p) => {
      if (p.paymentThisMonth > 0) {
        const debtIdx = simulatedDebts.findIndex((d) => d.id === p.id);
        const debt = simulatedDebts[debtIdx];
        
        // Add interest to balance, then subtract payment
        debt.currentBalance = debt.currentBalance + p.interest - p.paymentThisMonth;
        if (debt.currentBalance < 0.01) {
          debt.currentBalance = 0;
        }

        extraAvailable -= p.paymentThisMonth;
        interestThisMonthTotal += p.interest;
        paidThisMonthTotal += p.paymentThisMonth;
      }
    });

    // 2. Distribute remaining extra payment to the target debt
    if (extraAvailable > 0) {
      // Find active debts (excluding ones paid off just now)
      const activeDebts = simulatedDebts.filter((d) => d.currentBalance > 0);
      const sortedActive = getSortedDebts(activeDebts);

      if (sortedActive.length > 0) {
        const targetDebt = sortedActive[0];
        const debtIdx = simulatedDebts.findIndex((d) => d.id === targetDebt.id);
        const debt = simulatedDebts[debtIdx];

        // How much is needed to pay this debt off completely?
        // Note: interest was already added in step 1, but if it had a min payment, interest was already paid.
        // If it didn't have a min payment, we need to add the interest now.
        const targetPaymentDetail = monthlyPayments.find((p) => p.id === debt.id);
        const interestAdded = targetPaymentDetail && targetPaymentDetail.paymentThisMonth > 0 ? 0 : (debt.isAdvanced ? teaToTem(debt.interestRate) * debt.currentBalance : 0);
        
        const remainingToPayoff = debt.currentBalance + interestAdded;
        const extraToApply = Math.min(extraAvailable, remainingToPayoff);

        debt.currentBalance = debt.currentBalance + interestAdded - extraToApply;
        if (debt.currentBalance < 0.01) {
          debt.currentBalance = 0;
        }

        // Update the payment record for the target debt
        const payRecord = monthlyPayments.find((p) => p.id === debt.id);
        if (payRecord) {
          payRecord.paymentThisMonth += extraToApply;
          payRecord.interest += interestAdded;
        }

        extraAvailable -= extraToApply;
        interestThisMonthTotal += interestAdded;
        paidThisMonthTotal += extraToApply;
      }
    }

    totalInterestPaid += interestThisMonthTotal;
    totalPaid += paidThisMonthTotal;

    timeline.push({
      month,
      debts: monthlyPayments.map((p) => {
        const currentRef = simulatedDebts.find((d) => d.id === p.id);
        return {
          id: p.id,
          name: p.name,
          remainingBalance: currentRef ? currentRef.currentBalance : 0,
          paymentThisMonth: p.paymentThisMonth,
        };
      }),
      totalPaidThisMonth: paidThisMonthTotal,
      totalInterestPaidThisMonth: interestThisMonthTotal,
      extraPaymentApplied: totalMonthlyAllocation - paidThisMonthTotal, // unused money returns
    });
  }

  return {
    strategyName: strategy,
    monthsToPayoff: month,
    totalInterestPaid: Math.round(totalInterestPaid),
    totalPaid: Math.round(totalPaid),
    timeline,
  };
}
