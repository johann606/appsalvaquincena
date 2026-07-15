<?php

namespace App\Filament\Resources\SavingsGoals\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class SavingsGoalsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('target_date')
            ->columns([
                TextColumn::make('user.email')->label('Usuario')->searchable(),
                TextColumn::make('name')->label('Meta')->searchable(),
                TextColumn::make('current_amount_cents')->label('Actual')->formatStateUsing(fn (int $state): string => '$' . number_format($state / 100, 0, ',', '.'))->alignEnd(),
                TextColumn::make('target_amount_cents')->label('Objetivo')->formatStateUsing(fn (int $state): string => '$' . number_format($state / 100, 0, ',', '.'))->alignEnd(),
                TextColumn::make('target_date')->label('Fecha')->date('Y-m-d')->sortable(),
                TextColumn::make('status')->label('Estado')->badge()->color(fn (string $state): string => match ($state) {
                    'completed' => 'success',
                    'paused' => 'warning',
                    default => 'info',
                }),
            ])
            ->filters([
                SelectFilter::make('status')->label('Estado')->options([
                    'active' => 'Activa',
                    'completed' => 'Completada',
                    'paused' => 'Pausada',
                ]),
            ])
            ->recordActions([EditAction::make()])
            ->toolbarActions([BulkActionGroup::make([DeleteBulkAction::make()])]);
    }
}
