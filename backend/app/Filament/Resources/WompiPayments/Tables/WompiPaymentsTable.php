<?php

namespace App\Filament\Resources\WompiPayments\Tables;

use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class WompiPaymentsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                TextColumn::make('created_at')->label('Fecha')->dateTime('Y-m-d H:i')->sortable(),
                TextColumn::make('user.email')->label('Usuario')->searchable(),
                TextColumn::make('reference')->label('Referencia')->searchable()->copyable()->limit(28),
                TextColumn::make('plan_label')->label('Plan')->badge(),
                TextColumn::make('amount_cents')->label('Valor')->formatStateUsing(fn (int $state): string => '$' . number_format($state / 100, 0, ',', '.'))->alignEnd(),
                TextColumn::make('status')->label('Estado')->badge()->color(fn (string $state): string => match ($state) {
                    'APPROVED' => 'success',
                    'PENDING' => 'warning',
                    'DECLINED', 'VOIDED', 'ERROR' => 'danger',
                    default => 'gray',
                }),
            ])
            ->filters([
                SelectFilter::make('status')->label('Estado')->options([
                    'PENDING' => 'Pendiente',
                    'APPROVED' => 'Aprobado',
                    'DECLINED' => 'Declinado',
                    'VOIDED' => 'Anulado',
                ]),
                SelectFilter::make('plan')->label('Plan')->options(['monthly' => 'Mensual', 'annual' => 'Anual']),
            ])
            ->recordActions([EditAction::make()]);
    }
}
