<?php

namespace App\Filament\Resources\WompiPayments\Pages;

use App\Filament\Resources\WompiPayments\WompiPaymentResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListWompiPayments extends ListRecords
{
    protected static string $resource = WompiPaymentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
