<?php

namespace App\Filament\Resources\WompiEvents\Pages;

use App\Filament\Resources\WompiEvents\WompiEventResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListWompiEvents extends ListRecords
{
    protected static string $resource = WompiEventResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
