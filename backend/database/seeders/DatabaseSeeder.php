<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::query()->updateOrCreate([
            'email' => 'admin@salvaquincena.local',
        ], [
            'name' => 'Admin SalvaQuincena',
            'password' => Hash::make('SalvaQuincena2026!'),
        ]);

        $admin->profile()->updateOrCreate([], [
            'country' => 'CO',
            'timezone' => 'America/Bogota',
            'payday_one' => 15,
            'payday_two' => 30,
        ]);
    }
}
