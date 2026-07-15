<?php

namespace App\Filament\Resources\Debts\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class DebtsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('balance_cents', 'desc')
            ->columns([
                TextColumn::make('user.email')->label('Usuario')->searchable(),
                TextColumn::make('name')->label('Deuda')->searchable(),
                TextColumn::make('balance_cents')->label('Saldo')->formatStateUsing(fn (int $state): string => '$' . number_format($state / 100, 0, ',', '.'))->alignEnd()->sortable(),
                TextColumn::make('annual_rate')->label('TEA')->suffix('%')->sortable(),
                TextColumn::make('minimum_payment_cents')->label('Mínimo')->formatStateUsing(fn (int $state): string => '$' . number_format($state / 100, 0, ',', '.'))->alignEnd(),
                IconColumn::make('is_advanced')->label('Adv.')->boolean(),
                TextColumn::make('status')->label('Estado')->badge()->color(fn (string $state): string => $state === 'active' ? 'warning' : 'success'),
            ])
            ->filters([
                SelectFilter::make('status')->label('Estado')->options([
                    'active' => 'Activa',
                    'paid' => 'Pagada',
                    'paused' => 'Pausada',
                ]),
            ])
            ->recordActions([EditAction::make()])
            ->toolbarActions([BulkActionGroup::make([DeleteBulkAction::make()])]);
    }
}
