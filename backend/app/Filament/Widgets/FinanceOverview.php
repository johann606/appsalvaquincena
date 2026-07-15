<?php

namespace App\Filament\Widgets;

use App\Models\FinancialTransaction;
use App\Models\Subscription;
use App\Models\User;
use App\Models\WompiPayment;
use Filament\Support\Icons\Heroicon;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class FinanceOverview extends StatsOverviewWidget
{
    protected ?string $heading = 'Mi Balance General';

    protected ?string $description = 'Resumen operativo de usuarios, pagos PRO y movimientos financieros.';

    protected function getStats(): array
    {
        $monthStart = now()->startOfMonth();
        $incomeCents = FinancialTransaction::query()
            ->where('type', 'income')
            ->whereDate('transaction_date', '>=', $monthStart)
            ->sum('amount_cents');
        $expenseCents = FinancialTransaction::query()
            ->where('type', 'expense')
            ->whereDate('transaction_date', '>=', $monthStart)
            ->sum('amount_cents');
        $approvedPaymentsCents = WompiPayment::query()
            ->where('status', 'APPROVED')
            ->where('paid_at', '>=', $monthStart)
            ->sum('amount_cents');

        return [
            Stat::make('Usuarios registrados', number_format(User::query()->count(), 0, ',', '.'))
                ->description('Cuentas creadas en la app')
                ->icon(Heroicon::OutlinedUsers)
                ->color('info'),
            Stat::make('PRO activos', number_format(Subscription::query()->where('status', 'active')->count(), 0, ',', '.'))
                ->description('Suscripciones vigentes')
                ->icon(Heroicon::OutlinedSparkles)
                ->color('success'),
            Stat::make('Ingresos Wompi mes', $this->money($approvedPaymentsCents))
                ->description('Pagos aprobados del mes')
                ->icon(Heroicon::OutlinedBanknotes)
                ->color('success'),
            Stat::make('Balance usuarios mes', $this->money($incomeCents - $expenseCents))
                ->description('Ingresos menos gastos reportados')
                ->icon(Heroicon::OutlinedArrowsRightLeft)
                ->color(($incomeCents - $expenseCents) >= 0 ? 'success' : 'danger'),
        ];
    }

    private function money(int|float $cents): string
    {
        return '$' . number_format(((int) $cents) / 100, 0, ',', '.') . ' COP';
    }
}
