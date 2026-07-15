<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WompiPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SubscriptionController extends Controller
{
    public function show(Request $request)
    {
        $subscription = $request->user()->subscription;

        return response()->json([
            'is_pro' => $subscription?->status === 'active' && (! $subscription->ends_at || $subscription->ends_at->isFuture()),
            'subscription' => $subscription,
        ]);
    }

    public function checkout(Request $request)
    {
        $data = $request->validate([
            'plan' => ['required', 'in:monthly,annual'],
            'redirect_url' => ['nullable', 'url'],
        ]);

        $plans = [
            'monthly' => ['label' => 'Mensual', 'amount_cents' => 1500000],
            'annual' => ['label' => 'Anual', 'amount_cents' => 16500000],
        ];

        $plan = $plans[$data['plan']];
        $reference = sprintf('SQ-PRO-%s-%s-%s', strtoupper($data['plan']), now()->timestamp, Str::upper(Str::random(6)));
        $currency = config('services.wompi.currency', 'COP');
        $integritySecret = config('services.wompi.integrity_secret');
        $publicKey = config('services.wompi.public_key');

        abort_unless($integritySecret && $publicKey, 422, 'Wompi no está configurado.');

        $signature = hash('sha256', $reference . $plan['amount_cents'] . $currency . $integritySecret);

        WompiPayment::create([
            'user_id' => $request->user()->id,
            'reference' => $reference,
            'plan' => $data['plan'],
            'plan_label' => $plan['label'],
            'amount_cents' => $plan['amount_cents'],
            'currency' => $currency,
            'status' => 'PENDING',
        ]);

        $params = [
            'public-key=' . urlencode($publicKey),
            'currency=' . urlencode($currency),
            'amount-in-cents=' . $plan['amount_cents'],
            'reference=' . urlencode($reference),
            'signature:integrity=' . urlencode($signature),
        ];

        if ($data['redirect_url'] ?? null) {
            $params[] = 'redirect-url=' . urlencode($data['redirect_url']);
        } elseif ($request->getScheme() === 'https') {
            $params[] = 'redirect-url=' . urlencode(config('app.url'));
        }

        return response()->json([
            'reference' => $reference,
            'checkout_url' => rtrim(config('services.wompi.checkout_url'), '/') . '/?' . implode('&', $params),
        ]);
    }
}
