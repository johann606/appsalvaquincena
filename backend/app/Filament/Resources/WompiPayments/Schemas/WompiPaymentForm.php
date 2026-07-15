<?php

namespace App\Filament\Resources\WompiPayments\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class WompiPaymentForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Pago')
                ->columns(2)
                ->schema([
                    Select::make('user_id')->label('Usuario')->relationship('user', 'email')->searchable()->preload(),
                    TextInput::make('reference')->label('Referencia')->required()->maxLength(255),
                    TextInput::make('transaction_id')->label('ID transacción')->maxLength(255),
                    Select::make('plan')->label('Plan')->options(['monthly' => 'Mensual', 'annual' => 'Anual'])->required(),
                    TextInput::make('amount_cents')->label('Valor en centavos')->numeric()->required(),
                    Select::make('status')->label('Estado')->options([
                        'PENDING' => 'Pendiente',
                        'APPROVED' => 'Aprobado',
                        'DECLINED' => 'Declinado',
                        'VOIDED' => 'Anulado',
                        'ERROR' => 'Error',
                    ])->required(),
                ]),
        ]);
    }
}
