<?php

namespace App\Filament\Resources\WompiEvents\Pages;

use App\Filament\Resources\WompiEvents\WompiEventResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditWompiEvent extends EditRecord
{
    protected static string $resource = WompiEventResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
