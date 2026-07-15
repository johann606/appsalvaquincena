<?php

namespace App\Filament\Resources\FinancialTransactions;

use App\Filament\Resources\FinancialTransactions\Pages\CreateFinancialTransaction;
use App\Filament\Resources\FinancialTransactions\Pages\EditFinancialTransaction;
use App\Filament\Resources\FinancialTransactions\Pages\ListFinancialTransactions;
use App\Filament\Resources\FinancialTransactions\Schemas\FinancialTransactionForm;
use App\Filament\Resources\FinancialTransactions\Tables\FinancialTransactionsTable;
use App\Models\FinancialTransaction;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class FinancialTransactionResource extends Resource
{
    protected static ?string $model = FinancialTransaction::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedArrowsRightLeft;

    protected static ?string $navigationLabel = 'Movimientos';

    protected static ?string $modelLabel = 'movimiento';

    protected static ?string $pluralModelLabel = 'movimientos';

    protected static string|\UnitEnum|null $navigationGroup = 'Finanzas';

    public static function form(Schema $schema): Schema
    {
        return FinancialTransactionForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return FinancialTransactionsTable::configure($table);
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
            'index' => ListFinancialTransactions::route('/'),
            'create' => CreateFinancialTransaction::route('/create'),
            'edit' => EditFinancialTransaction::route('/{record}/edit'),
        ];
    }
}
