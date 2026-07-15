<?php

namespace App\Filament\Resources\Subscriptions\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class SubscriptionForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Suscripción')
                ->columns(2)
                ->schema([
                    Select::make('user_id')->label('Usuario')->relationship('user', 'email')->searchable()->preload()->required(),
                    Select::make('plan')->label('Plan')->options(['monthly' => 'Mensual', 'annual' => 'Anual'])->required(),
                    Select::make('status')->label('Estado')->options([
                        'active' => 'Activa',
                        'expired' => 'Expirada',
                        'cancelled' => 'Cancelada',
                        'pending' => 'Pendiente',
                    ])->required(),
                    DateTimePicker::make('starts_at')->label('Inicio'),
                    DateTimePicker::make('ends_at')->label('Fin'),
                    DateTimePicker::make('cancelled_at')->label('Cancelada en'),
                ]),
        ]);
    }
}
