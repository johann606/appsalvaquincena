<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class FinancialAdvisorController extends Controller
{
    public function __invoke(Request $request)
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'min:3', 'max:800'],
            'history' => ['array', 'max:8'],
            'history.*.role' => ['required_with:history', 'in:user,assistant'],
            'history.*.content' => ['required_with:history', 'string', 'max:700'],
        ]);

        $user = $request->user()->load(['subscription', 'transactions', 'savingsGoals', 'debts']);

        if (! $this->hasActivePro($user->subscription)) {
            return response()->json([
                'message' => 'El asesor financiero con IA está disponible para usuarios PRO.',
            ], 403);
        }

        $apiKey = config('services.openai.api_key');

        if (! $apiKey) {
            return response()->json([
                'message' => 'El asesor con IA aún no está configurado. Intenta más tarde.',
            ], 503);
        }

        $messages = [
            [
                'role' => 'system',
                'content' => implode("\n", [
                    'Eres el asesor financiero de SalvaQuincena para usuarios en Colombia.',
                    'Responde en español claro, amable y práctico para personas del común.',
                    'Usa pesos colombianos COP y evita lenguaje técnico innecesario.',
                    'Da pasos concretos y breves. No prometas rentabilidades ni aprobación de créditos.',
                    'No des asesoría legal, tributaria o de inversión personalizada de alto riesgo.',
                    'Incluye siempre una nota corta: "Orientación general, no reemplaza asesoría profesional."',
                ]),
            ],
            [
                'role' => 'user',
                'content' => "Resumen financiero guardado del usuario:\n".$this->buildFinancialContext($user),
            ],
        ];

        foreach ($data['history'] ?? [] as $item) {
            $messages[] = [
                'role' => $item['role'],
                'content' => $item['content'],
            ];
        }

        $messages[] = [
            'role' => 'user',
            'content' => $data['message'],
        ];

        try {
            $response = Http::withToken($apiKey)
                ->timeout(25)
                ->post(rtrim(config('services.openai.base_url'), '/').'/chat/completions', [
                    'model' => config('services.openai.model'),
                    'messages' => $messages,
                    'temperature' => 0.35,
                    'max_tokens' => 450,
                ]);
        } catch (ConnectionException) {
            return response()->json([
                'message' => 'No pudimos conectar con el asesor. Intenta de nuevo en unos minutos.',
            ], 503);
        }

        if ($response->failed()) {
            report('OpenAI advisor request failed: '.$response->body());

            return response()->json([
                'message' => 'El asesor no pudo responder en este momento. Intenta de nuevo en unos minutos.',
            ], 503);
        }

        return response()->json([
            'reply' => data_get($response->json(), 'choices.0.message.content')
                ?: 'No pude generar una respuesta clara. Intenta hacer la pregunta de otra forma.',
        ]);
    }

    private function hasActivePro($subscription): bool
    {
        return $subscription
            && $subscription->status === 'active'
            && (! $subscription->ends_at || $subscription->ends_at->isFuture());
    }

    private function buildFinancialContext($user): string
    {
        $income = $user->transactions
            ->where('type', 'income')
            ->sum('amount_cents') / 100;

        $expenses = $user->transactions
            ->where('type', 'expense')
            ->sum('amount_cents') / 100;

        $debtTotal = $user->debts->sum('balance_cents') / 100;
        $minimumDebtPayment = $user->debts->sum('minimum_payment_cents') / 100;
        $goalsTotal = $user->savingsGoals->sum('target_amount_cents') / 100;
        $goalsSaved = $user->savingsGoals->sum('current_amount_cents') / 100;

        $topExpenses = $user->transactions
            ->where('type', 'expense')
            ->groupBy('category')
            ->map(fn ($items) => $items->sum('amount_cents') / 100)
            ->sortDesc()
            ->take(5)
            ->map(fn ($amount, $category) => "{$category}: ".number_format($amount, 0, ',', '.').' COP')
            ->values()
            ->join('; ');

        return implode("\n", [
            'Ingresos registrados: '.number_format($income, 0, ',', '.').' COP',
            'Gastos registrados: '.number_format($expenses, 0, ',', '.').' COP',
            'Balance actual: '.number_format($income - $expenses, 0, ',', '.').' COP',
            'Total deudas: '.number_format($debtTotal, 0, ',', '.').' COP',
            'Pagos mínimos mensuales de deuda: '.number_format($minimumDebtPayment, 0, ',', '.').' COP',
            'Metas: '.number_format($goalsSaved, 0, ',', '.').' COP ahorrados de '.number_format($goalsTotal, 0, ',', '.').' COP',
            'Principales gastos por categoría: '.($topExpenses ?: 'sin gastos suficientes'),
        ]);
    }
}
