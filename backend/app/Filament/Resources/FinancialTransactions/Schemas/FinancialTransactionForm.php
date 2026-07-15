<?php

namespace App\Filament\Resources\FinancialTransactions\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class FinancialTransactionForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Movimiento')
                    ->columns(2)
                    ->schema([
                        Select::make('user_id')
                            ->label('Usuario')
                            ->relationship('user', 'email')
                            ->searchable()
                            ->preload()
                            ->required(),
                        TextInput::make('description')
                            ->label('Descripción')
                            ->required()
                            ->maxLength(255),
                        TextInput::make('amount_cents')
                            ->label('Valor en centavos')
                            ->numeric()
                            ->required(),
                        Select::make('type')
                            ->label('Tipo')
                            ->options([
                                'income' => 'Ingreso',
                                'expense' => 'Gasto',
                            ])
                            ->required(),
                        Select::make('category')
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
                            ])
                            ->searchable()
                            ->required(),
                        DatePicker::make('transaction_date')
                            ->label('Fecha')
                            ->required(),
                    ]),
            ]);
    }
}
