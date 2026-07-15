<?php

namespace App\Filament\Resources\Debts\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class DebtForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Deuda')
                ->columns(2)
                ->schema([
                    Select::make('user_id')->label('Usuario')->relationship('user', 'email')->searchable()->preload()->required(),
                    TextInput::make('name')->label('Nombre')->required()->maxLength(255),
                    TextInput::make('balance_cents')->label('Saldo en centavos')->numeric()->required(),
                    TextInput::make('annual_rate')->label('TEA %')->numeric()->default(0)->required(),
                    TextInput::make('minimum_payment_cents')->label('Pago mínimo en centavos')->numeric()->default(0)->required(),
                    TextInput::make('term_months')->label('Plazo meses')->numeric(),
                    Toggle::make('is_advanced')->label('Avanzada'),
                    Select::make('status')->label('Estado')->options([
                        'active' => 'Activa',
                        'paid' => 'Pagada',
                        'paused' => 'Pausada',
                    ])->required(),
                ]),
        ]);
    }
}
