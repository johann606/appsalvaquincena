<?php

namespace App\Filament\Resources\SavingsGoals\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class SavingsGoalForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Meta')
                ->columns(2)
                ->schema([
                    Select::make('user_id')->label('Usuario')->relationship('user', 'email')->searchable()->preload()->required(),
                    TextInput::make('name')->label('Nombre')->required()->maxLength(255),
                    TextInput::make('target_amount_cents')->label('Objetivo en centavos')->numeric()->required(),
                    TextInput::make('current_amount_cents')->label('Actual en centavos')->numeric()->default(0)->required(),
                    DatePicker::make('target_date')->label('Fecha objetivo'),
                    Select::make('status')->label('Estado')->options([
                        'active' => 'Activa',
                        'completed' => 'Completada',
                        'paused' => 'Pausada',
                    ])->required(),
                ]),
        ]);
    }
}
