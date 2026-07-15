<?php

namespace App\Filament\Resources\SavingsGoals;

use App\Filament\Resources\SavingsGoals\Pages\CreateSavingsGoal;
use App\Filament\Resources\SavingsGoals\Pages\EditSavingsGoal;
use App\Filament\Resources\SavingsGoals\Pages\ListSavingsGoals;
use App\Filament\Resources\SavingsGoals\Schemas\SavingsGoalForm;
use App\Filament\Resources\SavingsGoals\Tables\SavingsGoalsTable;
use App\Models\SavingsGoal;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class SavingsGoalResource extends Resource
{
    protected static ?string $model = SavingsGoal::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedFlag;

    protected static ?string $navigationLabel = 'Metas';

    protected static string|\UnitEnum|null $navigationGroup = 'Finanzas';

    protected static ?string $modelLabel = 'meta';

    protected static ?string $pluralModelLabel = 'metas';

    public static function form(Schema $schema): Schema
    {
        return SavingsGoalForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return SavingsGoalsTable::configure($table);
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
            'index' => ListSavingsGoals::route('/'),
            'create' => CreateSavingsGoal::route('/create'),
            'edit' => EditSavingsGoal::route('/{record}/edit'),
        ];
    }
}
