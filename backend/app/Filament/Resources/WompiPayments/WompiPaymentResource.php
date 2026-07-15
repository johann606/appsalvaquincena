<?php

namespace App\Filament\Resources\WompiPayments;

use App\Filament\Resources\WompiPayments\Pages\CreateWompiPayment;
use App\Filament\Resources\WompiPayments\Pages\EditWompiPayment;
use App\Filament\Resources\WompiPayments\Pages\ListWompiPayments;
use App\Filament\Resources\WompiPayments\Schemas\WompiPaymentForm;
use App\Filament\Resources\WompiPayments\Tables\WompiPaymentsTable;
use App\Models\WompiPayment;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class WompiPaymentResource extends Resource
{
    protected static ?string $model = WompiPayment::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBanknotes;

    protected static ?string $navigationLabel = 'Pagos Wompi';

    protected static string|\UnitEnum|null $navigationGroup = 'Pagos y PRO';

    public static function form(Schema $schema): Schema
    {
        return WompiPaymentForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return WompiPaymentsTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListWompiPayments::route('/'),
            'create' => CreateWompiPayment::route('/create'),
            'edit' => EditWompiPayment::route('/{record}/edit'),
        ];
    }
}
