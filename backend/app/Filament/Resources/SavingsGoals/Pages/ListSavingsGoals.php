<?php

namespace App\Filament\Resources\SavingsGoals\Pages;

use App\Filament\Resources\SavingsGoals\SavingsGoalResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListSavingsGoals extends ListRecords
{
    protected static string $resource = SavingsGoalResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
