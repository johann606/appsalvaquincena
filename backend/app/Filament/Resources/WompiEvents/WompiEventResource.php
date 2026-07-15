<?php

namespace App\Filament\Resources\WompiEvents;

use App\Filament\Resources\WompiEvents\Pages\CreateWompiEvent;
use App\Filament\Resources\WompiEvents\Pages\EditWompiEvent;
use App\Filament\Resources\WompiEvents\Pages\ListWompiEvents;
use App\Filament\Resources\WompiEvents\Schemas\WompiEventForm;
use App\Filament\Resources\WompiEvents\Tables\WompiEventsTable;
use App\Models\WompiEvent;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class WompiEventResource extends Resource
{
    protected static ?string $model = WompiEvent::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBolt;

    protected static ?string $navigationLabel = 'Eventos Wompi';

    protected static string|\UnitEnum|null $navigationGroup = 'Pagos y PRO';

    public static function form(Schema $schema): Schema
    {
        return WompiEventForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return WompiEventsTable::configure($table);
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
            'index' => ListWompiEvents::route('/'),
            'create' => CreateWompiEvent::route('/create'),
            'edit' => EditWompiEvent::route('/{record}/edit'),
        ];
    }
}
