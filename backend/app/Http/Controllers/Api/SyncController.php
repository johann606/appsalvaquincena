<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Debt;
use App\Models\FinancialTransaction;
use App\Models\SavingsGoal;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'transactions' => $user->transactions()->latest('transaction_date')->get(),
            'savings_goals' => $user->savingsGoals()->latest()->get(),
            'debts' => $user->debts()->latest()->get(),
            'subscription' => $user->subscription,
            'payments' => $user->payments()->latest()->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'transactions' => ['array'],
            'transactions.*.external_id' => ['required_with:transactions', 'string', 'max:100'],
            'transactions.*.description' => ['required_with:transactions', 'string', 'max:255'],
            'transactions.*.amount_cents' => ['required_with:transactions', 'integer', 'min:0'],
            'transactions.*.type' => ['required_with:transactions', 'in:income,expense'],
            'transactions.*.category' => ['nullable', 'string', 'max:80'],
            'transactions.*.transaction_date' => ['required_with:transactions', 'date'],
            'savings_goals' => ['array'],
            'savings_goals.*.external_id' => ['required_with:savings_goals', 'string', 'max:100'],
            'savings_goals.*.name' => ['required_with:savings_goals', 'string', 'max:255'],
            'savings_goals.*.target_amount_cents' => ['required_with:savings_goals', 'integer', 'min:0'],
            'savings_goals.*.current_amount_cents' => ['nullable', 'integer', 'min:0'],
            'savings_goals.*.target_date' => ['nullable', 'date'],
            'debts' => ['array'],
            'debts.*.external_id' => ['required_with:debts', 'string', 'max:100'],
            'debts.*.name' => ['required_with:debts', 'string', 'max:255'],
            'debts.*.balance_cents' => ['required_with:debts', 'integer', 'min:0'],
            'debts.*.annual_rate' => ['nullable', 'numeric', 'min:0'],
            'debts.*.minimum_payment_cents' => ['nullable', 'integer', 'min:0'],
            'debts.*.term_months' => ['nullable', 'integer', 'min:1'],
            'debts.*.is_advanced' => ['boolean'],
        ]);

        $user = $request->user();

        foreach ($data['transactions'] ?? [] as $item) {
            FinancialTransaction::updateOrCreate(
                ['user_id' => $user->id, 'external_id' => $item['external_id']],
                [
                    'description' => $item['description'],
                    'amount_cents' => $item['amount_cents'],
                    'type' => $item['type'],
                    'category' => $item['category'] ?? 'Otros',
                    'transaction_date' => $item['transaction_date'],
                    'source' => 'mobile',
                ]
            );
        }

        foreach ($data['savings_goals'] ?? [] as $item) {
            SavingsGoal::updateOrCreate(
                ['user_id' => $user->id, 'external_id' => $item['external_id']],
                [
                    'name' => $item['name'],
                    'target_amount_cents' => $item['target_amount_cents'],
                    'current_amount_cents' => $item['current_amount_cents'] ?? 0,
                    'target_date' => $item['target_date'] ?? null,
                    'status' => 'active',
                ]
            );
        }

        foreach ($data['debts'] ?? [] as $item) {
            Debt::updateOrCreate(
                ['user_id' => $user->id, 'external_id' => $item['external_id']],
                [
                    'name' => $item['name'],
                    'balance_cents' => $item['balance_cents'],
                    'annual_rate' => $item['annual_rate'] ?? 0,
                    'minimum_payment_cents' => $item['minimum_payment_cents'] ?? 0,
                    'term_months' => $item['term_months'] ?? null,
                    'is_advanced' => $item['is_advanced'] ?? false,
                    'status' => 'active',
                ]
            );
        }

        return $this->show($request);
    }
}
