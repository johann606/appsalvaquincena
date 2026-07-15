<?php

namespace App\Filament\Resources\Subscriptions\Tables;

use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class SubscriptionsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('ends_at')
            ->columns([
                TextColumn::make('user.email')->label('Usuario')->searchable(),
                TextColumn::make('plan')->label('Plan')->badge()->formatStateUsing(fn (string $state): string => $state === 'annual' ? 'Anual' : 'Mensual'),
                TextColumn::make('status')->label('Estado')->badge()->color(fn (string $state): string => match ($state) {
                    'active' => 'success',
                    'pending' => 'warning',
                    'expired', 'cancelled' => 'danger',
                    default => 'gray',
                }),
                TextColumn::make('starts_at')->label('Inicio')->dateTime('Y-m-d')->sortable(),
                TextColumn::make('ends_at')->label('Vence')->dateTime('Y-m-d')->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')->label('Estado')->options([
                    'active' => 'Activa',
                    'expired' => 'Expirada',
                    'cancelled' => 'Cancelada',
                    'pending' => 'Pendiente',
                ]),
                SelectFilter::make('plan')->label('Plan')->options(['monthly' => 'Mensual', 'annual' => 'Anual']),
            ])
            ->recordActions([EditAction::make()]);
    }
}
