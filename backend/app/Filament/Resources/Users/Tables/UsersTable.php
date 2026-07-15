<?php

namespace App\Filament\Resources\Users\Tables;

use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class UsersTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                TextColumn::make('name')->label('Nombre')->searchable()->sortable(),
                TextColumn::make('email')->label('Correo')->searchable()->sortable(),
                TextColumn::make('subscription.status')->label('PRO')->badge()->placeholder('Sin PRO')->color(fn (?string $state): string => $state === 'active' ? 'success' : 'gray'),
                TextColumn::make('subscription.plan')->label('Plan')->badge()->placeholder('-'),
                TextColumn::make('transactions_count')->label('Movs.')->counts('transactions')->sortable(),
                TextColumn::make('created_at')->label('Registro')->dateTime('Y-m-d H:i')->sortable(),
            ])
            ->filters([
                SelectFilter::make('subscription_status')
                    ->label('Estado PRO')
                    ->relationship('subscription', 'status')
                    ->options([
                        'active' => 'Activo',
                        'expired' => 'Expirado',
                        'cancelled' => 'Cancelado',
                        'pending' => 'Pendiente',
                    ]),
            ])
            ->recordActions([EditAction::make()]);
    }
}
