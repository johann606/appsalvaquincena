import { useState, useEffect } from 'react';
import { 
  Home, 
  ArrowDownLeft, 
  ArrowUpRight, 
  PiggyBank, 
  CreditCard, 
  Plus, 
  Trash2, 
  X, 
  Info,
  Zap,
  Percent,
  HelpCircle,
  User,
  CalendarDays,
  AlertTriangle,
  BarChart3,
  Target,
  ShieldCheck
} from 'lucide-react';
import { Transaction, SavingsGoal, Debt, AccountProfile, PaymentRecord } from './types';
import { runDebtSimulation, teaToTem } from './utils/debtCalculator';
import { WOMPI_PLANS, WompiPlanId } from './utils/wompi';
import {
  clearApiToken,
  createProCheckout,
  fetchCurrentAccount,
  fetchSync,
  getApiToken,
  loginAccount,
  logoutAccount,
  pushSync,
  refreshSubscription,
  registerAccount,
} from './utils/api';


// Formatter for Colombian Pesos
const formatCOP = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(val);
};

const readLocalJson = <T,>(key: string, fallback: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;

  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
};

const getNextQuincena = () => {
  const today = new Date();
  const next = new Date(today);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  if (today.getDate() < 15) {
    next.setDate(15);
  } else {
    next.setDate(lastDay);
  }

  next.setHours(23, 59, 59, 999);
  return next;
};

const getDaysUntil = (date: Date) => {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const getPercent = (amount: number, base: number) => {
  if (base <= 0) return 0;
  return Math.round((amount / base) * 100);
};

const budgetRates: Record<string, number> = {
  Vivienda: 0.3,
  Alimentación: 0.15,
  Transporte: 0.1,
  Salud: 0.08,
  Entretenimiento: 0.07,
  Servicios: 0.08,
  Otros: 0.12
};

type AppNotice = {
  title: string;
  message: string;
  tone: 'success' | 'warning' | 'error' | 'info';
  actionLabel?: string;
  onAction?: () => void;
};

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'home' | 'transactions' | 'savings' | 'debts' | 'account'>('home');

  // Core Data States (hydrated from localStorage)
  const [transactions, setTransactions] = useState<Transaction[]>(() => readLocalJson<Transaction[]>('salvaquincena_transactions', []));

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => readLocalJson<SavingsGoal[]>('salvaquincena_savings', []));

  const [debts, setDebts] = useState<Debt[]>(() => readLocalJson<Debt[]>('salvaquincena_debts', []));

  // Pro Subscription States
  const [isPro, setIsPro] = useState<boolean>(() => localStorage.getItem('salvaquincena_ispro') === 'true');
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [notice, setNotice] = useState<AppNotice | null>(null);
  const [selectedProPlan, setSelectedProPlan] = useState<WompiPlanId>('monthly');
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(() => readLocalJson<AccountProfile | null>('salvaquincena_account', null));
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>(() => readLocalJson<PaymentRecord[]>('salvaquincena_payments', []));

  // Simulator Inputs
  const [extraPayment, setExtraPayment] = useState<number>(200000);

  // Modals States
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Transaction form states
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txCat, setTxCat] = useState('Otros');

  // Savings form states
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [goalAddAmount, setGoalAddAmount] = useState('');

  // Debt form states
  const [debtName, setDebtName] = useState('');
  const [debtBalance, setDebtBalance] = useState('');
  const [debtIsAdvanced, setDebtIsAdvanced] = useState(false);
  const [debtRate, setDebtRate] = useState('');
  const [debtMinPayment, setDebtMinPayment] = useState('');

  // Account form states
  const [accountName, setAccountName] = useState(accountProfile?.name ?? '');
  const [accountEmail, setAccountEmail] = useState(accountProfile?.email ?? '');
  const [accountPhone, setAccountPhone] = useState(accountProfile?.phone ?? '');
  const [acceptedTerms, setAcceptedTerms] = useState(Boolean(accountProfile?.acceptedTermsAt));
  const [accountPassword, setAccountPassword] = useState('');
  const [accountMode, setAccountMode] = useState<'login' | 'register'>(() => accountProfile ? 'login' : 'register');
  const [apiToken, setApiTokenState] = useState(() => getApiToken());
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [isSyncReady, setIsSyncReady] = useState(false);

  // Synchronize with localStorage
  useEffect(() => {
    localStorage.setItem('salvaquincena_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('salvaquincena_savings', JSON.stringify(savingsGoals));
  }, [savingsGoals]);

  useEffect(() => {
    localStorage.setItem('salvaquincena_debts', JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    localStorage.setItem('salvaquincena_ispro', isPro ? 'true' : 'false');
  }, [isPro]);

  useEffect(() => {
    if (accountProfile) {
      localStorage.setItem('salvaquincena_account', JSON.stringify(accountProfile));
    }
  }, [accountProfile]);

  useEffect(() => {
    localStorage.setItem('salvaquincena_payments', JSON.stringify(paymentRecords));
  }, [paymentRecords]);

  useEffect(() => {
    if (!apiToken) {
      setIsSyncReady(false);
      return;
    }

    let cancelled = false;

    const loadRemoteData = async () => {
      try {
        const [profile, remote] = await Promise.all([
          fetchCurrentAccount(),
          fetchSync(),
        ]);

        if (cancelled) return;

        setAccountProfile(profile);
        setAccountName(profile.name);
        setAccountEmail(profile.email);
        setAccountPhone(profile.phone);
        setAcceptedTerms(Boolean(profile.acceptedTermsAt));
        setPaymentRecords(remote.payments);
        setIsPro(remote.isPro);

        const hasRemoteData = remote.transactions.length > 0 || remote.savingsGoals.length > 0 || remote.debts.length > 0;

        if (hasRemoteData) {
          setTransactions(remote.transactions);
          setSavingsGoals(remote.savingsGoals);
          setDebts(remote.debts);
        } else {
          const synced = await pushSync({ transactions, savingsGoals, debts });
          if (cancelled) return;
          setPaymentRecords(synced.payments);
          setIsPro(synced.isPro);
        }

        setIsSyncReady(true);
      } catch {
        clearApiToken();
        setApiTokenState('');
        setIsSyncReady(false);
      }
    };

    loadRemoteData();

    return () => {
      cancelled = true;
    };
  }, [apiToken]);

  useEffect(() => {
    if (!apiToken || !isSyncReady) return;

    const timeout = window.setTimeout(async () => {
      try {
        const synced = await pushSync({ transactions, savingsGoals, debts });
        setPaymentRecords(synced.payments);
        setIsPro(synced.isPro);
      } catch {
        setNotice({
          title: 'Guardado pendiente',
          message: 'No pudimos guardar tus cambios en tu cuenta en este momento. Siguen protegidos en este celular y volveremos a intentarlo.',
          tone: 'warning'
        });
      }
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [transactions, savingsGoals, debts, apiToken, isSyncReady]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wompiTransactionId = params.get('id');
    const pendingReference = localStorage.getItem('salvaquincena_pending_payment_reference');

    if (!wompiTransactionId || !pendingReference || !apiToken) return;

    const refreshPaymentState = async () => {
      try {
        const [proActive, remote] = await Promise.all([
          refreshSubscription(),
          fetchSync(),
        ]);
        setIsPro(proActive);
        setPaymentRecords(remote.payments);
        localStorage.removeItem('salvaquincena_pending_payment_reference');
        localStorage.removeItem('salvaquincena_pending_payment_plan');
        window.history.replaceState({}, document.title, window.location.pathname);
        setNotice({
          title: proActive ? 'Pago aprobado' : 'Estamos confirmando tu pago',
          message: proActive
            ? 'Wompi confirmo el pago y tu plan PRO quedo activo en tu cuenta.'
            : 'Wompi recibio la transaccion. Si aun no ves PRO activo, espera unos minutos y vuelve a entrar a tu cuenta.',
          tone: proActive ? 'success' : 'info',
          actionLabel: 'Ver cuenta',
          onAction: () => setActiveTab('account')
        });
      } catch {
        setNotice({
          title: 'Estamos confirmando tu pago',
          message: 'Volviste desde Wompi, pero no pudimos actualizar tu cuenta todavia. Intenta entrar de nuevo en unos minutos.',
          tone: 'warning'
        });
      }
    };

    refreshPaymentState();
  }, [apiToken]);


  // Derived financial metrics
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = totalIncome - totalExpense;

  // Add Transaction Handler
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDesc || !txAmount) return;
    const newTx: Transaction = {
      id: Date.now().toString(),
      description: txDesc,
      amount: parseFloat(txAmount),
      type: txType,
      category: txCat,
      date: new Date().toISOString().split('T')[0]
    };
    setTransactions([newTx, ...transactions]);
    // Reset & Close
    setTxDesc('');
    setTxAmount('');
    setTxType('expense');
    setTxCat('Otros');
    setIsTxModalOpen(false);
  };

  // Delete Transaction Handler
  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !accountEmail) return;
    if (!accountPassword || accountPassword.length < 8) {
      setNotice({
        title: 'Contrasena requerida',
        message: 'Ingresa una contrasena de al menos 8 caracteres para proteger tu cuenta.',
        tone: 'warning'
      });
      return;
    }

    if (accountMode === 'register' && !acceptedTerms) {
      setNotice({
        title: 'Aceptacion requerida',
        message: 'Debes aceptar los terminos y condiciones para crear o actualizar tu cuenta.',
        tone: 'warning'
      });
      return;
    }

    try {
      setIsAccountLoading(true);
      const profile = accountMode === 'register'
        ? await registerAccount({
          name: accountName.trim(),
          email: accountEmail.trim().toLowerCase(),
          phone: accountPhone.trim(),
          password: accountPassword,
          acceptedTerms,
        })
        : await loginAccount(accountEmail.trim().toLowerCase(), accountPassword);

      setApiTokenState(getApiToken());
      setAccountProfile(profile);
      setAccountName(profile.name);
      setAccountEmail(profile.email);
      setAccountPhone(profile.phone);
      setAcceptedTerms(true);
      setAccountPassword('');
      setIsAccountModalOpen(false);
      setNotice({
        title: accountMode === 'register' ? 'Cuenta creada' : 'Sesion iniciada',
        message: 'Tu cuenta quedo lista. Tus movimientos se guardaran para que puedas consultarlos despues.',
        tone: 'success'
      });
    } catch (error) {
      setNotice({
        title: 'No se pudo conectar la cuenta',
        message: error instanceof Error ? error.message : 'Revisa los datos e intenta de nuevo.',
        tone: 'error'
      });
    } finally {
      setIsAccountLoading(false);
    }
  };

  const handleLogoutAccount = async () => {
    try {
      await logoutAccount();
    } catch {
      clearApiToken();
    }

    localStorage.removeItem('salvaquincena_account');
    localStorage.removeItem('salvaquincena_payments');
    localStorage.removeItem('salvaquincena_ispro');
    localStorage.removeItem('salvaquincena_tx_id');
    localStorage.removeItem('salvaquincena_pending_payment_reference');
    localStorage.removeItem('salvaquincena_pending_payment_plan');
    setApiTokenState('');
    setIsSyncReady(false);
    setAccountProfile(null);
    setPaymentRecords([]);
    setIsPro(false);
    setAccountName('');
    setAccountEmail('');
    setAccountPhone('');
    setAccountPassword('');
    setAcceptedTerms(false);
    setAccountMode('login');
    setIsAccountModalOpen(false);
    setNotice({
      title: 'Sesion cerrada',
      message: 'Saliste de tu cuenta. Tus movimientos guardados se conservan.',
      tone: 'info'
    });
  };

  // Add Savings Goal Handler
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName || !goalTarget || !goalDate) return;
    const newGoal: SavingsGoal = {
      id: Date.now().toString(),
      name: goalName,
      targetAmount: parseFloat(goalTarget),
      currentAmount: 0,
      targetDate: goalDate
    };
    setSavingsGoals([...savingsGoals, newGoal]);
    // Reset & Close
    setGoalName('');
    setGoalTarget('');
    setGoalDate('');
    setIsGoalModalOpen(false);
  };

  // Add funds to saving goal
  const handleAddSavingsFunds = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !goalAddAmount) return;
    setSavingsGoals(savingsGoals.map(g => {
      if (g.id === selectedGoalId) {
        return {
          ...g,
          currentAmount: Math.min(g.targetAmount, g.currentAmount + parseFloat(goalAddAmount))
        };
      }
      return g;
    }));
    setGoalAddAmount('');
    setIsAddFundsModalOpen(false);
  };

  // Delete Savings Goal
  const handleDeleteGoal = (id: string) => {
    setSavingsGoals(savingsGoals.filter(g => g.id !== id));
  };

  // Add Debt Handler
  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtName || !debtBalance) return;
    const newDebt: Debt = {
      id: Date.now().toString(),
      name: debtName,
      balance: parseFloat(debtBalance),
      interestRate: debtIsAdvanced && debtRate ? parseFloat(debtRate) : 0,
      minimumPayment: debtIsAdvanced && debtMinPayment ? parseFloat(debtMinPayment) : 0,
      isAdvanced: debtIsAdvanced
    };
    setDebts([...debts, newDebt]);
    // Reset & Close
    setDebtName('');
    setDebtBalance('');
    setDebtIsAdvanced(false);
    setDebtRate('');
    setDebtMinPayment('');
    setIsDebtModalOpen(false);
  };

  // Delete Debt
  const handleDeleteDebt = (id: string) => {
    setDebts(debts.filter(d => d.id !== id));
  };

  // Run simulations
  const snowballResult = runDebtSimulation(debts, extraPayment, 'Snowball');
  const avalancheResult = runDebtSimulation(debts, extraPayment, 'Avalanche');

  // Determine the best strategy
  const bestStrategy = snowballResult.totalInterestPaid <= avalancheResult.totalInterestPaid ? snowballResult : avalancheResult;
  const worstStrategy = bestStrategy.strategyName === 'Snowball' ? avalancheResult : snowballResult;
  const interestSaved = worstStrategy.totalInterestPaid - bestStrategy.totalInterestPaid;
  const debtTotal = debts.reduce((sum, d) => sum + d.balance, 0);
  const monthlyDebtMinimum = debts.reduce((sum, d) => sum + (d.minimumPayment || 0), 0);
  const nextQuincena = getNextQuincena();
  const daysToQuincena = getDaysUntil(nextQuincena);
  const dailyAvailable = Math.max(0, Math.floor((currentBalance - monthlyDebtMinimum) / daysToQuincena));
  const debtPressure = getPercent(monthlyDebtMinimum, totalIncome);
  const savingsCapacity = Math.max(0, totalIncome - totalExpense - monthlyDebtMinimum);
  const categoryTotals = transactions
    .filter((t) => t.type === 'expense')
    .reduce<Record<string, number>>((totals, tx) => {
      totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
      return totals;
    }, {});
  const budgetInsights = Object.entries(budgetRates).map(([category, rate]) => {
    const spent = categoryTotals[category] || 0;
    const limit = totalIncome * rate;
    return {
      category,
      spent,
      limit,
      percent: getPercent(spent, limit),
      exceeded: limit > 0 && spent > limit
    };
  });
  const overspentCategories = budgetInsights.filter((item) => item.exceeded);
  const smallExpenseTransactions = transactions.filter((tx) =>
    tx.type === 'expense' &&
    tx.amount <= 50000 &&
    ['Alimentación', 'Transporte', 'Entretenimiento', 'Otros'].includes(tx.category)
  );
  const smallExpenseTotal = smallExpenseTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const fixedExpenseCalendar = Object.entries(categoryTotals)
    .filter(([category]) => ['Vivienda', 'Servicios', 'Salud'].includes(category))
    .map(([category, amount]) => ({
      label: category,
      amount,
      dueText: category === 'Vivienda' ? 'Primeros 5 días' : 'Antes de la quincena'
    }));
  const debtCalendar = debts
    .filter((debt) => debt.minimumPayment > 0)
    .map((debt) => ({
      label: debt.name,
      amount: debt.minimumPayment,
      dueText: 'Próxima quincena'
    }));
  const paymentCalendar = [...debtCalendar, ...fixedExpenseCalendar]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const goalPlans = savingsGoals.map((goal) => {
    const daysLeft = getDaysUntil(new Date(`${goal.targetDate}T23:59:59`));
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    const quincenasLeft = Math.max(1, Math.ceil(daysLeft / 15));
    return {
      ...goal,
      remaining,
      quincenaAmount: Math.ceil(remaining / quincenasLeft),
      percent: getPercent(goal.currentAmount, goal.targetAmount),
      isBehind: getPercent(goal.currentAmount, goal.targetAmount) < Math.max(15, 100 - Math.ceil(daysLeft / 3))
    };
  });
  const reportCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const emergencyReasons = [
    currentBalance < 0 ? 'Balance negativo' : '',
    dailyAvailable < 25000 && totalIncome > 0 ? 'Disponible diario muy bajo' : '',
    debtPressure > 35 ? 'Deudas consumen más del 35% del ingreso' : '',
    totalExpense > totalIncome ? 'Gastos superan ingresos' : ''
  ].filter(Boolean);
  const financialHealthScore = Math.max(0, Math.min(100,
    70
    + (currentBalance > 0 ? 10 : -20)
    + (savingsCapacity > 0 ? 10 : -10)
    - (debtPressure > 35 ? 20 : debtPressure > 20 ? 10 : 0)
    - (overspentCategories.length * 5)
    - (smallExpenseTotal > totalIncome * 0.08 ? 10 : 0)
  ));
  const financialHealthLabel = financialHealthScore >= 75 ? 'Bien' : financialHealthScore >= 50 ? 'Alerta' : 'Crítico';
  const emergencyMode = emergencyReasons.length > 0;
  const hasActiveSession = Boolean(accountProfile && apiToken);

  const renderAccountForm = () => (
    <form onSubmit={handleSaveAccount}>
      <div className="tab-group" style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className={`tab-btn ${accountMode === 'login' ? 'active' : ''}`}
          onClick={() => setAccountMode('login')}
        >
          Entrar
        </button>
        <button
          type="button"
          className={`tab-btn ${accountMode === 'register' ? 'active' : ''}`}
          onClick={() => setAccountMode('register')}
        >
          Crear cuenta
        </button>
      </div>

      {accountMode === 'register' && (
        <div className="form-group">
          <label className="form-label">Nombre</label>
          <input
            type="text"
            className="form-input"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Ej. Juan Perez"
            required={accountMode === 'register'}
          />
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Correo</label>
        <input
          type="email"
          className="form-input"
          value={accountEmail}
          onChange={(e) => setAccountEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Contrasena</label>
        <input
          type="password"
          className="form-input"
          value={accountPassword}
          onChange={(e) => setAccountPassword(e.target.value)}
          placeholder="Minimo 8 caracteres"
          minLength={8}
          required
        />
      </div>

      {accountMode === 'register' && (
        <>
          <div className="form-group">
            <label className="form-label">Celular</label>
            <input
              type="tel"
              className="form-input"
              value={accountPhone}
              onChange={(e) => setAccountPhone(e.target.value)}
              placeholder="3001234567"
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <input
              type="checkbox"
              id="account-terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--primary-orange)' }}
            />
            <label htmlFor="account-terms" style={{ fontSize: '0.78rem', color: 'var(--text-medium)', lineHeight: 1.35, cursor: 'pointer' }}>
              Acepto los terminos y condiciones, y autorizo guardar mis datos para conservar mi historial y asociar mis pagos.
            </label>
          </div>
        </>
      )}

      <button type="submit" className="btn" disabled={isAccountLoading}>
        {isAccountLoading ? 'Procesando...' : accountMode === 'register' ? 'Crear Cuenta' : 'Entrar'}
      </button>
    </form>
  );

  const renderAccountProfile = () => (
    <div style={{ borderLeft: '4px solid #2ecc71', background: 'linear-gradient(135deg, #F5FCF8, #FFFFFF)', borderRadius: '8px', padding: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <div className="item-icon-wrapper icon-income">
          <User size={20} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)' }}>
            {accountProfile?.name || 'Mi cuenta'}
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-medium)', overflowWrap: 'anywhere' }}>
            {accountProfile?.email}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        <div className="sim-box highlight">
          <p>Plan</p>
          <h4>{isPro ? 'PRO' : 'Gratis'}</h4>
        </div>
        <div className="sim-box">
          <p>Pagos</p>
          <h4>{paymentRecords.length}</h4>
        </div>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-medium)', marginBottom: '14px' }}>
        Tus movimientos se guardan en tu cuenta y puedes consultarlos despues.
      </p>

      <button className="btn btn-outline" onClick={handleLogoutAccount}>
        Cerrar sesion
      </button>
    </div>
  );

  return (
    <>
      <header className="app-header">
        <a href="https://cafeysoftware.com/" target="_blank" rel="noopener noreferrer" className="logo-container" style={{ textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="Logo Cafe y Software" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
          <div>
            <span className="app-title" style={{ display: 'block', lineHeight: 1.1 }}>SalvaQuincena</span>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-light)', display: 'block', fontWeight: 500, textDecoration: 'underline' }}>Auspiciado por Cafe y Software</span>
          </div>
        </a>
        <span className="badge badge-orange">Colombia</span>
      </header>

      {/* Screen Content Area */}
      <main className="screen-container">

        
        {/* TAB 1: INICIO (HOME) */}
        {activeTab === 'home' && (
          <>
            <div className="balance-card">
              <span className="balance-card-label">Mi Balance General</span>
              <h2 className="balance-card-val">{formatCOP(currentBalance)}</h2>
              
              <div className="balance-grid">
                <div className="balance-grid-item">
                  <div className="balance-grid-icon">
                    <ArrowUpRight size={18} />
                  </div>
                  <div className="balance-grid-info">
                    <p>Ingresos</p>
                    <h4>{formatCOP(totalIncome)}</h4>
                  </div>
                </div>

                <div className="balance-grid-item">
                  <div className="balance-grid-icon">
                    <ArrowDownLeft size={18} />
                  </div>
                  <div className="balance-grid-info">
                    <p>Gastos</p>
                    <h4>{formatCOP(totalExpense)}</h4>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                <Zap size={18} className="amount-income" /> Acciones Rápidas
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button className="btn" onClick={() => { setTxType('expense'); setIsTxModalOpen(true); }}>
                  <Plus size={16} /> Registrar Gasto
                </button>
                <button className="btn btn-secondary" onClick={() => { setTxType('income'); setIsTxModalOpen(true); }}>
                  <Plus size={16} /> Registrar Ingreso
                </button>
              </div>
            </div>

            {/* Quick Summary of Debt Calculator */}
            <div className="card" onClick={() => setActiveTab('debts')} style={{ cursor: 'pointer' }}>
              <div className="card-title">
                <CreditCard size={18} style={{ color: 'var(--primary-orange)' }} /> Estado de Deudas
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Total por Pagar</p>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '4px' }}>
                    {formatCOP(debts.reduce((sum, d) => sum + d.balance, 0))}
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-orange">{debts.length} Deudas</span>
                  <p style={{ fontSize: '0.7rem', color: 'var(--primary-orange)', marginTop: '6px', fontWeight: 600 }}>
                    {debts.length > 0 ? 'Ver plan de pagos' : 'Registrar deuda'}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="card">
              <div className="card-title">Transacciones Recientes</div>
              <div className="list-container">
                {transactions.slice(0, 3).map((tx) => (
                  <div key={tx.id} className="item-row">
                    <div className="item-left">
                      <div className={`item-icon-wrapper ${tx.type === 'income' ? 'icon-income' : 'icon-expense'}`}>
                        {tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                      </div>
                      <div className="item-details">
                        <h4>{tx.description}</h4>
                        <p>{tx.category} • {tx.date}</p>
                      </div>
                    </div>
                    <span className={`item-amount ${tx.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCOP(tx.amount)}
                    </span>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem', padding: '20px 0' }}>
                    Aun no has registrado movimientos. Agrega tu primer ingreso o gasto para ver tu balance real.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Mis movimientos</h2>
              <button className="btn" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setIsTxModalOpen(true)}>
                <Plus size={16} /> Añadir
              </button>
            </div>

            {isPro && (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '8px 12px', fontSize: '0.78rem', width: 'auto', alignSelf: 'flex-start', margin: '4px 0 10px 0' }}
                onClick={() => {
                  const csvHeaders = "Descripcion,Monto,Tipo,Categoria,Fecha\n";
                  const csvRows = transactions.map(t => `"${t.description.replace(/"/g, '""')}",${t.amount},"${t.type}","${t.category}","${t.date}"`).join("\n");
                  const blob = new Blob([csvHeaders + csvRows], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute("download", "reporte_salvaquincena.csv");
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                📥 Descargar Excel (CSV)
              </button>
            )}


            <div className="list-container">
              {transactions.map((tx) => (
                <div key={tx.id} className="item-row">
                  <div className="item-left">
                    <div className={`item-icon-wrapper ${tx.type === 'income' ? 'icon-income' : 'icon-expense'}`}>
                      {tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                    </div>
                    <div className="item-details">
                      <h4>{tx.description}</h4>
                      <p>{tx.category} • {tx.date}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`item-amount ${tx.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCOP(tx.amount)}
                    </span>
                    <button 
                      onClick={() => handleDeleteTransaction(tx.id)}
                      style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem', padding: '40px 0' }}>
                  Empieza registrando tu primer ingreso o gasto.
                </p>
              )}
            </div>
          </>
        )}

        {/* TAB 3: SAVINGS (AHORROS) */}
        {activeTab === 'savings' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Metas de Ahorro</h2>
              <button className="btn" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setIsGoalModalOpen(true)}>
                <Plus size={16} /> Crear Meta
              </button>
            </div>

            <div className="list-container">
              {savingsGoals.map((goal) => {
                const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                return (
                  <div key={goal.id} className="card" style={{ marginBottom: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-dark)' }}>{goal.name}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                          Meta: {goal.targetDate}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleDeleteGoal(goal.id)}
                        style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div style={{ margin: '16px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--primary-orange)' }}>
                          {formatCOP(goal.currentAmount)}
                        </span>
                        <span style={{ color: 'var(--text-light)' }}>
                          de {formatCOP(goal.targetAmount)} ({percent}%)
                        </span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-fill" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>

                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '8px' }}
                      onClick={() => {
                        setSelectedGoalId(goal.id);
                        setIsAddFundsModalOpen(true);
                      }}
                    >
                      Aportar a la Meta
                    </button>
                  </div>
                );
              })}
              {savingsGoals.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem', padding: '40px 0' }}>
                  Crea una meta y mira cuanto necesitas ahorrar en cada quincena.
                </p>
              )}
            </div>
          </>
        )}

        {/* TAB 4: DEBTS (DEUDAS) */}
        {activeTab === 'debts' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Mis Deudas</h2>
              <button className="btn" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setIsDebtModalOpen(true)}>
                <Plus size={16} /> Agregar Deuda
              </button>
            </div>

            <div className="list-container">
              {debts.map((debt) => (
                <div key={debt.id} className="card debt-card">
                  <div className="debt-header">
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{debt.name}</h4>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-dark)', marginTop: '4px' }}>
                        {formatCOP(debt.balance)}
                      </h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${debt.isAdvanced ? 'badge-orange' : 'badge-green'}`}>
                        {debt.isAdvanced ? 'Avanzado' : 'Global'}
                      </span>
                      <button 
                        onClick={() => handleDeleteDebt(debt.id)}
                        style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {debt.isAdvanced && (
                    <div className="debt-details-grid">
                      <div className="debt-detail-item">
                        <p>Interes anual</p>
                        <h5>{debt.interestRate}%</h5>
                      </div>
                      <div className="debt-detail-item">
                        <p>Pago Mínimo</p>
                        <h5>{formatCOP(debt.minimumPayment)}</h5>
                      </div>
                      <div className="debt-detail-item">
                        <p>Tasa Mensual</p>
                        <h5>{(teaToTem(debt.interestRate) * 100).toFixed(2)}%</h5>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {debts.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem', padding: '20px 0' }}>
                  Si tienes deudas, registralas para organizar un plan de pago.
                </p>
              )}
            </div>

            {/* Simulación e Inteligencia de Pagos */}
            {debts.length > 0 && (
              <div className="card" style={{ borderTop: '4px solid var(--primary-orange)' }}>
                <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Percent size={18} style={{ color: 'var(--primary-orange)' }} />
                    <span>Simulador Bola de Nieve vs Avalancha</span>
                  </div>
                  <HelpCircle size={16} style={{ color: 'var(--text-light)' }} />
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-medium)', marginBottom: '16px' }}>
                  Compara cómo cambia el pago de tus deudas si aplicas un "pago extra" cada mes.
                </p>

                <div className="form-group">
                  <label className="form-label">Aporte Mensual Extra (COP)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={extraPayment} 
                    onChange={(e) => setExtraPayment(parseFloat(e.target.value) || 0)}
                    placeholder="Ej. 200000"
                  />
                </div>

                <div className="simulator-summary-grid">
                  <div className={`sim-box ${bestStrategy.strategyName === 'Snowball' ? 'highlight' : ''}`}>
                    <p>🔵 Bola de Nieve</p>
                    <h4>{snowballResult.monthsToPayoff} meses</h4>
                    <p style={{ marginTop: '4px', fontSize: '0.65rem' }}>
                      Interés: {formatCOP(snowballResult.totalInterestPaid)}
                    </p>
                  </div>

                  <div className={`sim-box ${bestStrategy.strategyName === 'Avalanche' ? 'highlight' : ''}`}>
                    <p>⚡ Avalancha (Cascada)</p>
                    <h4>{avalancheResult.monthsToPayoff} meses</h4>
                    <p style={{ marginTop: '4px', fontSize: '0.65rem' }}>
                      Interés: {formatCOP(avalancheResult.totalInterestPaid)}
                    </p>
                  </div>
                </div>

                {interestSaved > 0 && (
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    backgroundColor: 'rgba(46, 204, 113, 0.08)',
                    border: '1px solid rgba(46, 204, 113, 0.2)',
                    fontSize: '0.8rem',
                    color: '#27ae60',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Info size={16} />
                    <div>
                      <strong>¡Estrategia Recomendada!</strong> El método de{' '}
                      {bestStrategy.strategyName === 'Snowball' ? 'Bola de Nieve' : 'Avalancha'} te ahorra{' '}
                      <strong>{formatCOP(interestSaved)}</strong> en intereses.
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* TAB 5: ACCOUNT */}
        {activeTab === 'account' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Mi Cuenta</h2>
              {accountProfile && (
                <span className="badge badge-orange">{paymentRecords.length} pagos</span>
              )}
            </div>

            {!isPro ? (
              <div className="card" style={{ border: '1px solid var(--primary-orange-light)', background: 'linear-gradient(135deg, #FFF8F3, #FFFFFF)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <div>
                    <span className="badge badge-orange" style={{ marginBottom: '6px' }}>PLAN PRO</span>
                    <h4 style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-dark)' }}>Desbloquea SalvaQuincena PRO</h4>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-medium)', marginTop: '2px' }}>
                      Plan mensual <strong>$15.000 COP</strong> o anual <strong>$165.000 COP</strong>.
                    </p>
                  </div>
                  <button className="btn" style={{ width: 'auto', fontSize: '0.75rem', padding: '8px 12px', whiteSpace: 'nowrap' }} onClick={() => setIsProModalOpen(true)}>
                    Obtener
                  </button>
                </div>
              </div>
            ) : (
              <div className="card" style={{ borderLeft: '4px solid #2ecc71', background: 'linear-gradient(135deg, #F5FCF8, #FFFFFF)' }}>
                <div className="card-title" style={{ fontSize: '0.95rem', color: '#27ae60', marginBottom: '8px', fontWeight: 700 }}>
                  🌟 SalvaQuincena PRO Activo
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-medium)', marginBottom: '12px' }}>
                  Tu planeador inteligente de ingresos basado en el presupuesto ideal (50/30/20):
                </p>
                <div style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center', fontSize: '0.7rem' }}>
                    <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '4px' }}>
                      <p style={{ color: 'var(--text-light)', marginBottom: '2px' }}>Necesidades (50%)</p>
                      <strong style={{ color: 'var(--text-dark)', fontSize: '0.8rem' }}>{formatCOP(totalIncome * 0.5)}</strong>
                    </div>
                    <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '4px' }}>
                      <p style={{ color: 'var(--text-light)', marginBottom: '2px' }}>Deseos (30%)</p>
                      <strong style={{ color: 'var(--text-dark)', fontSize: '0.8rem' }}>{formatCOP(totalIncome * 0.3)}</strong>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-light)', marginBottom: '2px' }}>Ahorros/Deudas (20%)</p>
                      <strong style={{ color: 'var(--text-dark)', fontSize: '0.8rem' }}>{formatCOP(totalIncome * 0.2)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isPro && (
              <>
                <div className="card" style={{ borderTop: `4px solid ${financialHealthScore >= 75 ? '#2ecc71' : financialHealthScore >= 50 ? 'var(--primary-orange)' : '#e74c3c'}` }}>
                  <div className="card-title">
                    <ShieldCheck size={18} style={{ color: financialHealthScore >= 75 ? '#2ecc71' : 'var(--primary-orange)' }} /> Diagnóstico financiero
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="sim-box highlight">
                      <p>Salud financiera</p>
                      <h4>{financialHealthScore}/100</h4>
                      <p>{financialHealthLabel}</p>
                    </div>
                    <div className="sim-box">
                      <p>Deuda / ingreso</p>
                      <h4>{debtPressure}%</h4>
                      <p>{formatCOP(monthlyDebtMinimum)} mensual</p>
                    </div>
                  </div>
                  <div style={{ marginTop: '14px', background: 'var(--bg-color)', borderRadius: '8px', padding: '12px', fontSize: '0.78rem', color: 'var(--text-medium)', border: '1px solid var(--border-color)' }}>
                    {financialHealthScore >= 75
                      ? 'Vas bien. Mantén controlados los gastos variables y usa excedentes para metas o deuda cara.'
                      : financialHealthScore >= 50
                        ? 'Hay presión financiera. Revisa categorías excedidas y evita nuevas cuotas hasta liberar flujo.'
                        : 'Prioridad alta: protege pagos obligatorios, recorta gastos no esenciales y evita mora.'}
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">
                    <CalendarDays size={18} style={{ color: 'var(--primary-orange)' }} /> Flujo quincenal
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="sim-box highlight">
                      <p>Gasto diario seguro</p>
                      <h4>{formatCOP(dailyAvailable)}</h4>
                      <p>{daysToQuincena} días restantes</p>
                    </div>
                    <div className="sim-box">
                      <p>Capacidad libre</p>
                      <h4>{formatCOP(savingsCapacity)}</h4>
                      <p>después de gastos y mínimos</p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">
                    <AlertTriangle size={18} style={{ color: 'var(--primary-orange)' }} /> Presupuesto inteligente
                  </div>
                  <div className="list-container">
                    {budgetInsights.map((item) => (
                      <div key={item.category} className="item-row">
                        <div className="item-details">
                          <h4>{item.category}</h4>
                          <p>Límite sugerido: {formatCOP(item.limit)}</p>
                        </div>
                        <span className={`badge ${item.exceeded ? 'badge-orange' : 'badge-green'}`}>
                          {item.percent}%
                        </span>
                      </div>
                    ))}
                    {overspentCategories.length === 0 && (
                      <p style={{ color: 'var(--text-light)', fontSize: '0.8rem', textAlign: 'center', padding: '8px 0' }}>
                        No hay categorías excedidas con los datos actuales.
                      </p>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">
                    <CalendarDays size={18} style={{ color: 'var(--primary-orange)' }} /> Calendario de pagos
                  </div>
                  <div className="list-container">
                    {paymentCalendar.map((item) => (
                      <div key={`${item.label}-${item.dueText}`} className="item-row">
                        <div className="item-details">
                          <h4>{item.label}</h4>
                          <p>{item.dueText}</p>
                        </div>
                        <span className="item-amount amount-expense">{formatCOP(item.amount)}</span>
                      </div>
                    ))}
                    {paymentCalendar.length === 0 && (
                      <p style={{ color: 'var(--text-light)', fontSize: '0.8rem', textAlign: 'center', padding: '8px 0' }}>
                        Registra deudas o gastos fijos para ver próximos pagos.
                      </p>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">
                    <CreditCard size={18} style={{ color: 'var(--primary-orange)' }} /> Plan anti-deudas
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="sim-box highlight">
                      <p>Estrategia</p>
                      <h4>{bestStrategy.strategyName === 'Snowball' ? 'Bola de Nieve' : 'Avalancha'}</h4>
                      <p>{bestStrategy.monthsToPayoff} meses</p>
                    </div>
                    <div className="sim-box">
                      <p>Ahorro potencial</p>
                      <h4>{formatCOP(Math.max(0, interestSaved))}</h4>
                      <p>en intereses</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-medium)', marginTop: '12px' }}>
                    Total de deuda: <strong>{formatCOP(debtTotal)}</strong>. Pago mínimo mensual: <strong>{formatCOP(monthlyDebtMinimum)}</strong>.
                  </p>
                </div>

                <div className="card">
                  <div className="card-title">
                    <Target size={18} style={{ color: 'var(--primary-orange)' }} /> Metas con plan automático
                  </div>
                  <div className="list-container">
                    {goalPlans.map((goal) => (
                      <div key={goal.id} className="item-row">
                        <div className="item-details">
                          <h4>{goal.name}</h4>
                          <p>Ahorra {formatCOP(goal.quincenaAmount)} por quincena · {goal.percent}%</p>
                        </div>
                        <span className={`badge ${goal.isBehind ? 'badge-orange' : 'badge-green'}`}>
                          {goal.isBehind ? 'Ajustar' : 'En ruta'}
                        </span>
                      </div>
                    ))}
                    {goalPlans.length === 0 && (
                      <p style={{ color: 'var(--text-light)', fontSize: '0.8rem', textAlign: 'center', padding: '8px 0' }}>
                        Crea una meta para calcular aportes por quincena.
                      </p>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">
                    <BarChart3 size={18} style={{ color: 'var(--primary-orange)' }} /> Reportes premium
                  </div>
                  <div className="list-container">
                    {reportCategories.map(([category, amount]) => (
                      <div key={category}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '5px' }}>
                          <span>{category}</span>
                          <strong>{formatCOP(amount)}</strong>
                        </div>
                        <div className="progress-container">
                          <div className="progress-fill" style={{ width: `${Math.min(100, getPercent(amount, totalExpense))}%` }}></div>
                        </div>
                      </div>
                    ))}
                    {reportCategories.length === 0 && (
                      <p style={{ color: 'var(--text-light)', fontSize: '0.8rem', textAlign: 'center', padding: '8px 0' }}>
                        Aún no hay gastos para graficar.
                      </p>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">
                    <Zap size={18} style={{ color: 'var(--primary-orange)' }} /> Gastos hormiga
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="sim-box">
                      <p>Total detectado</p>
                      <h4>{formatCOP(smallExpenseTotal)}</h4>
                      <p>{smallExpenseTransactions.length} movimientos</p>
                    </div>
                    <div className="sim-box highlight">
                      <p>Impacto</p>
                      <h4>{getPercent(smallExpenseTotal, totalIncome)}%</h4>
                      <p>del ingreso</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-medium)', marginTop: '12px' }}>
                    Si recortas la mitad, liberarías {formatCOP(Math.floor(smallExpenseTotal / 2))} para metas o deudas.
                  </p>
                </div>

                {emergencyMode && (
                  <div className="card" style={{ border: '1px solid rgba(231, 76, 60, 0.25)', background: 'linear-gradient(135deg, #FFF5F4, #FFFFFF)' }}>
                    <div className="card-title" style={{ color: '#e74c3c' }}>
                      <AlertTriangle size={18} /> Modo emergencia
                    </div>
                    <div className="list-container">
                      {emergencyReasons.map((reason) => (
                        <div key={reason} className="item-row">
                          <div className="item-details">
                            <h4>{reason}</h4>
                            <p>Congela entretenimiento, compras no esenciales y nuevos créditos hasta estabilizar flujo.</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="card">
              <div className="card-title">
                <User size={18} style={{ color: 'var(--primary-orange)' }} /> Datos de cuenta
              </div>

              {hasActiveSession ? renderAccountProfile() : renderAccountForm()}

              {!hasActiveSession && (
                <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '10px 14px', marginTop: '16px', fontSize: '0.72rem', color: 'var(--text-medium)', border: '1px solid var(--border-color)' }}>
                  Al entrar con tu cuenta, tus movimientos y pagos quedan disponibles para futuras consultas.
                </div>
              )}
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => {
                const backup = {
                  accountProfile,
                  paymentRecords,
                  transactions,
                  savingsGoals,
                  debts,
                  exportedAt: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `salvaquincena-respaldo-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
            >
              Descargar respaldo
            </button>

            <div className="card">
              <div className="card-title">
                <CreditCard size={18} style={{ color: 'var(--primary-orange)' }} /> Pagos asociados
              </div>
              <div className="list-container">
                {paymentRecords.map((payment) => (
                  <div key={payment.id} className="item-row">
                    <div className="item-left">
                      <div className="item-icon-wrapper icon-expense">
                        <CreditCard size={18} />
                      </div>
                      <div className="item-details">
                        <h4>SalvaQuincena PRO</h4>
                        <p>{payment.planLabel || 'PRO'} • {payment.reference} • {new Date(payment.createdAt).toLocaleDateString('es-CO')}</p>
                      </div>
                    </div>
                    <span className="item-amount amount-expense">-{formatCOP(payment.amount)}</span>
                  </div>
                ))}
                {paymentRecords.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem', padding: '20px 0' }}>
                    Aun no hay pagos asociados a esta cuenta.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <Home />
          <span className="nav-label">Inicio</span>
        </button>
        <button className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
          <ArrowDownLeft />
          <span className="nav-label">Gastos</span>
        </button>
        <button className={`nav-item ${activeTab === 'savings' ? 'active' : ''}`} onClick={() => setActiveTab('savings')}>
          <PiggyBank />
          <span className="nav-label">Metas</span>
        </button>
        <button className={`nav-item ${activeTab === 'debts' ? 'active' : ''}`} onClick={() => setActiveTab('debts')}>
          <CreditCard />
          <span className="nav-label">Deudas</span>
        </button>
        <button className={`nav-item ${activeTab === 'account' ? 'active' : ''}`} onClick={() => setActiveTab('account')}>
          <User />
          <span className="nav-label">Cuenta</span>
        </button>
      </nav>

      {/* MODAL 1: ADD TRANSACTION */}
      {isTxModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTxModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Agregar Transacción</span>
              <button className="close-btn" onClick={() => setIsTxModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction}>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <div className="tab-group" style={{ marginBottom: 0 }}>
                  <button 
                    type="button" 
                    className={`tab-btn ${txType === 'expense' ? 'active' : ''}`}
                    onClick={() => setTxType('expense')}
                  >
                    Gasto
                  </button>
                  <button 
                    type="button" 
                    className={`tab-btn ${txType === 'income' ? 'active' : ''}`}
                    onClick={() => setTxType('income')}
                  >
                    Ingreso
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={txDesc} 
                  onChange={(e) => setTxDesc(e.target.value)} 
                  placeholder="Ej. Supermercado, Salario, etc."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Monto (COP)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={txAmount} 
                  onChange={(e) => setTxAmount(e.target.value)} 
                  placeholder="0"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select 
                  className="form-input" 
                  value={txCat} 
                  onChange={(e) => setTxCat(e.target.value)}
                >
                  <option value="Alimentación">Alimentación</option>
                  <option value="Vivienda">Vivienda</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Salud">Salud</option>
                  <option value="Entretenimiento">Entretenimiento</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Salario">Salario</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <button type="submit" className="btn">Guardar Transacción</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD GOAL */}
      {isGoalModalOpen && (
        <div className="modal-overlay" onClick={() => setIsGoalModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nueva Meta de Ahorro</span>
              <button className="close-btn" onClick={() => setIsGoalModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddGoal}>
              <div className="form-group">
                <label className="form-label">Nombre de la Meta</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={goalName} 
                  onChange={(e) => setGoalName(e.target.value)} 
                  placeholder="Ej. Computador Nuevo"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Monto Objetivo (COP)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={goalTarget} 
                  onChange={(e) => setGoalTarget(e.target.value)} 
                  placeholder="0"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fecha Límite</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={goalDate} 
                  onChange={(e) => setGoalDate(e.target.value)} 
                  required
                />
              </div>

              <button type="submit" className="btn">Crear Meta</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD SAVINGS FUNDS */}
      {isAddFundsModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddFundsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Aportar a la Meta</span>
              <button className="close-btn" onClick={() => setIsAddFundsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSavingsFunds}>
              <div className="form-group">
                <label className="form-label">Monto del Aporte (COP)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={goalAddAmount} 
                  onChange={(e) => setGoalAddAmount(e.target.value)} 
                  placeholder="0"
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="btn">Confirmar Aporte</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD DEBT */}
      {isDebtModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDebtModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Registrar Deuda</span>
              <button className="close-btn" onClick={() => setIsDebtModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddDebt}>
              <div className="form-group">
                <label className="form-label">Nombre de la Deuda</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={debtName} 
                  onChange={(e) => setDebtName(e.target.value)} 
                  placeholder="Ej. Tarjeta Visa, Crédito de Moto"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Monto total adeudado (COP)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={debtBalance} 
                  onChange={(e) => setDebtBalance(e.target.value)} 
                  placeholder="0"
                  required
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '20px 0' }}>
                <input 
                  type="checkbox" 
                  id="advanced-check"
                  checked={debtIsAdvanced} 
                  onChange={(e) => setDebtIsAdvanced(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary-orange)' }}
                />
                <label htmlFor="advanced-check" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-medium)', cursor: 'pointer' }}>
                  Agregar intereses y pago minimo
                </label>
              </div>

              {debtIsAdvanced && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Interes anual (%)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-input" 
                      value={debtRate} 
                      onChange={(e) => setDebtRate(e.target.value)} 
                      placeholder="Ej. 28.5"
                      required={debtIsAdvanced}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pago Mínimo Mensual (COP)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={debtMinPayment} 
                      onChange={(e) => setDebtMinPayment(e.target.value)} 
                      placeholder="Ej. 120000"
                      required={debtIsAdvanced}
                    />
                  </div>
                </div>
              )}

              <button type="submit" className="btn">Agregar Deuda</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: ACCOUNT */}
      {isAccountModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAccountModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} color="var(--primary-orange)" /> Mi cuenta
              </span>
              <button className="close-btn" onClick={() => setIsAccountModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {hasActiveSession ? renderAccountProfile() : renderAccountForm()}

            {!hasActiveSession && (
              <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '10px 14px', margin: '16px 0', fontSize: '0.72rem', color: 'var(--text-medium)', border: '1px solid var(--border-color)' }}>
                Al entrar con tu cuenta, tus movimientos y pagos quedan disponibles para futuras consultas.
              </div>
            )}

            <button
              className="btn btn-secondary"
              style={{ marginBottom: '16px' }}
              onClick={() => {
                const backup = {
                  accountProfile,
                  paymentRecords,
                  transactions,
                  savingsGoals,
                  debts,
                  exportedAt: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `salvaquincena-respaldo-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
            >
              Descargar respaldo
            </button>

            <div className="card-title" style={{ fontSize: '0.95rem' }}>Pagos asociados</div>
            <div className="list-container">
              {paymentRecords.map((payment) => (
                <div key={payment.id} className="item-row">
                  <div className="item-left">
                    <div className="item-icon-wrapper icon-expense">
                      <CreditCard size={18} />
                    </div>
                    <div className="item-details">
                      <h4>SalvaQuincena PRO</h4>
                      <p>{payment.planLabel || 'PRO'} · {payment.reference} · {new Date(payment.createdAt).toLocaleDateString('es-CO')}</p>
                    </div>
                  </div>
                  <span className="item-amount amount-expense">-{formatCOP(payment.amount)}</span>
                </div>
              ))}
              {paymentRecords.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem', padding: '12px 0' }}>
                  Aun no hay pagos asociados a esta cuenta.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: SALVAQUINCENA PRO - PAGO REAL CON WOMPI */}
      {isProModalOpen && (
        <div className="modal-overlay" onClick={() => !isPaymentLoading && setIsProModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                🌟 SalvaQuincena PRO
              </span>
              <button className="close-btn" onClick={() => setIsProModalOpen(false)} disabled={isPaymentLoading}>
                <X size={20} />
              </button>
            </div>

            {/* Price badge */}
            <div style={{ textAlign: 'center', margin: '4px 0 20px 0' }}>
              <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, var(--primary-orange), var(--primary-orange-dark))', color: '#fff', borderRadius: '16px', padding: '8px 24px', marginBottom: '6px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800 }}>${WOMPI_PLANS[selectedProPlan].amountCop.toLocaleString('es-CO')}</span>
                <span style={{ fontSize: '0.95rem', marginLeft: '4px' }}>COP</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-medium)', marginTop: '4px' }}>✅ Plan {WOMPI_PLANS[selectedProPlan].label.toLowerCase()} · Procesado por <strong>Wompi</strong></p>
            </div>

            <div className="tab-group" style={{ marginBottom: '16px' }}>
              <button
                type="button"
                className={`tab-btn ${selectedProPlan === 'monthly' ? 'active' : ''}`}
                onClick={() => setSelectedProPlan('monthly')}
              >
                Mensual $15.000
              </button>
              <button
                type="button"
                className={`tab-btn ${selectedProPlan === 'annual' ? 'active' : ''}`}
                onClick={() => setSelectedProPlan('annual')}
              >
                Anual $165.000
              </button>
            </div>

            <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginBottom: '2px' }}>Cuenta para asociar el pago</p>
                <strong style={{ fontSize: '0.82rem', color: 'var(--text-dark)' }}>
                  {accountProfile ? accountProfile.email : 'Pendiente por registrar'}
                </strong>
              </div>
              <button
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '8px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                onClick={() => {
                  setIsProModalOpen(false);
                  setIsAccountModalOpen(true);
                }}
              >
                {accountProfile ? 'Cambiar' : 'Crear'}
              </button>
            </div>

            {/* Features list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.2rem' }}>📊</span>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 600 }}>Asesor de Presupuesto 50/30/20</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Divide automáticamente tus ingresos: necesidades, deseos y ahorros.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.2rem' }}>📥</span>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 600 }}>Exportar Reportes a Excel / CSV</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Descarga todo tu historial con un clic.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.2rem' }}>✨</span>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 600 }}>Sin Anuncios ni Límites</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Metas y deudas ilimitadas.</p>
                </div>
              </div>
            </div>

            {/* Wompi payment methods info */}
            <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.72rem', color: 'var(--text-medium)', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '1.1rem' }}>🔒</span>
              <span>Pago seguro con <strong>Wompi by Bancolombia</strong>. Acepta tarjetas débito/crédito, PSE y Nequi.</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn"
                disabled={isPaymentLoading}
                style={{ opacity: isPaymentLoading ? 0.7 : 1, cursor: isPaymentLoading ? 'not-allowed' : 'pointer' }}
                onClick={async () => {
                  if (!accountProfile || !apiToken) {
                    setIsProModalOpen(false);
                    setIsAccountModalOpen(true);
                    setNotice({
                      title: 'Cuenta requerida',
                      message: 'Primero entra o crea tu cuenta para asociar el pago y conservar tu historial.',
                      tone: 'warning',
                      actionLabel: 'Completar cuenta',
                      onAction: () => setActiveTab('account')
                    });
                    return;
                  }

                  try {
                    setIsPaymentLoading(true);
                    const checkout = await createProCheckout(selectedProPlan);
                    localStorage.setItem('salvaquincena_pending_payment_reference', checkout.reference);
                    localStorage.setItem('salvaquincena_pending_payment_plan', selectedProPlan);
                    window.location.assign(checkout.checkoutUrl);
                    setIsPaymentLoading(false);
                  } catch (error) {
                    setIsPaymentLoading(false);
                    setNotice({
                      title: 'Error al iniciar pago',
                      message: error instanceof Error
                        ? error.message
                        : 'No pudimos iniciar el pago. Intenta nuevamente en unos segundos.',
                      tone: 'error'
                    });
                  }
                }}
              >
                {isPaymentLoading ? '⏳ Abriendo Wompi...' : `💳 Pagar $${WOMPI_PLANS[selectedProPlan].amountCop.toLocaleString('es-CO')} COP con Wompi`}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setIsProModalOpen(false)}
                disabled={isPaymentLoading}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className="modal-overlay" style={{ zIndex: 220 }} onClick={() => setNotice(null)}>
          <div className="modal-content" style={{ maxHeight: '70%', paddingTop: '22px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info
                  size={20}
                  color={
                    notice.tone === 'success'
                      ? '#27ae60'
                      : notice.tone === 'error'
                        ? '#e74c3c'
                        : 'var(--primary-orange)'
                  }
                />
                {notice.title}
              </span>
              <button className="close-btn" onClick={() => setNotice(null)}>
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                background:
                  notice.tone === 'success'
                    ? 'rgba(46, 204, 113, 0.08)'
                    : notice.tone === 'error'
                      ? 'rgba(231, 76, 60, 0.08)'
                      : 'var(--bg-color)',
                border: `1px solid ${
                  notice.tone === 'success'
                    ? 'rgba(46, 204, 113, 0.2)'
                    : notice.tone === 'error'
                      ? 'rgba(231, 76, 60, 0.2)'
                      : 'var(--border-color)'
                }`,
                borderRadius: '8px',
                padding: '14px',
                color: 'var(--text-medium)',
                fontSize: '0.86rem',
                lineHeight: 1.45,
                marginBottom: '16px'
              }}
            >
              {notice.message}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notice.actionLabel && (
                <button
                  className="btn"
                  onClick={() => {
                    const action = notice.onAction;
                    setNotice(null);
                    action?.();
                  }}
                >
                  {notice.actionLabel}
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setNotice(null)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
