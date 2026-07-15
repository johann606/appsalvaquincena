<?php

namespace App\Filament\Resources\SavingsGoals\Pages;

use App\Filament\Resources\SavingsGoals\SavingsGoalResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditSavingsGoal extends EditRecord
{
    protected static string $resource = SavingsGoalResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
