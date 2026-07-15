<?php

namespace App\Filament\Resources\WompiPayments\Pages;

use App\Filament\Resources\WompiPayments\WompiPaymentResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditWompiPayment extends EditRecord
{
    protected static string $resource = WompiPaymentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
