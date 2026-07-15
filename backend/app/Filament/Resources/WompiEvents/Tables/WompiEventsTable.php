<?php

namespace App\Filament\Resources\WompiEvents\Tables;

use Filament\Actions\ViewAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class WompiEventsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('received_at', 'desc')
            ->columns([
                TextColumn::make('received_at')->label('Recibido')->dateTime('Y-m-d H:i')->sortable(),
                TextColumn::make('event_type')->label('Evento')->badge(),
                TextColumn::make('reference')->label('Referencia')->searchable()->limit(30),
                TextColumn::make('transaction_id')->label('Transacción')->searchable()->limit(24),
                TextColumn::make('status')->label('Estado')->badge(),
                TextColumn::make('processed_at')->label('Procesado')->dateTime('Y-m-d H:i')->placeholder('Pendiente'),
            ])
            ->filters([
                SelectFilter::make('status')->label('Estado')->options([
                    'APPROVED' => 'Aprobado',
                    'PENDING' => 'Pendiente',
                    'DECLINED' => 'Declinado',
                    'VOIDED' => 'Anulado',
                ]),
            ])
            ->recordActions([ViewAction::make()]);
    }
}
