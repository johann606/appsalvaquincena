<?php

namespace App\Filament\Resources\FinancialTransactions\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class FinancialTransactionsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('transaction_date', 'desc')
            ->columns([
                TextColumn::make('transaction_date')
                    ->label('Fecha')
                    ->date('Y-m-d')
                    ->sortable(),
                TextColumn::make('user.email')
                    ->label('Usuario')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('description')
                    ->label('Descripción')
                    ->searchable()
                    ->limit(40),
                TextColumn::make('category')
                    ->label('Categoría')
                    ->badge()
                    ->searchable(),
                TextColumn::make('type')
                    ->label('Tipo')
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => $state === 'income' ? 'Ingreso' : 'Gasto')
                    ->color(fn (string $state): string => $state === 'income' ? 'success' : 'danger'),
                TextColumn::make('amount_cents')
                    ->label('Valor')
                    ->alignEnd()
                    ->formatStateUsing(fn (int $state): string => '$' . number_format($state / 100, 0, ',', '.')),
            ])
            ->filters([
                SelectFilter::make('type')
                    ->label('Tipo')
                    ->options([
                        'income' => 'Ingreso',
                        'expense' => 'Gasto',
                    ]),
                SelectFilter::make('category')
                    ->label('Categoría')
                    ->options([
                        'Salario' => 'Salario',
                        'Vivienda' => 'Vivienda',
                        'Alimentación' => 'Alimentación',
                        'Transporte' => 'Transporte',
                        'Salud' => 'Salud',
                        'Servicios' => 'Servicios',
                        'Entretenimiento' => 'Entretenimiento',
                        'Otros' => 'Otros',
                    ]),
                Filter::make('transaction_date')
                    ->label('Rango de fechas')
                    ->schema([
                        \Filament\Forms\Components\DatePicker::make('from')->label('Desde'),
                        \Filament\Forms\Components\DatePicker::make('until')->label('Hasta'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when($data['from'] ?? null, fn (Builder $query, $date) => $query->whereDate('transaction_date', '>=', $date))
                            ->when($data['until'] ?? null, fn (Builder $query, $date) => $query->whereDate('transaction_date', '<=', $date));
                    }),
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
