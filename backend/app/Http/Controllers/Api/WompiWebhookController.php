<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\User;
use App\Models\WompiEvent;
use App\Models\WompiPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class WompiWebhookController extends Controller
{
    public function __invoke(Request $request)
    {
        $payload = $request->all();
        $transaction = Arr::get($payload, 'data.transaction', []);
        $reference = Arr::get($transaction, 'reference');
        $status = Arr::get($transaction, 'status');
        $transactionId = Arr::get($transaction, 'id');

        $event = WompiEvent::create([
            'event_id' => Arr::get($payload, 'id'),
            'event_type' => Arr::get($payload, 'event'),
            'transaction_id' => $transactionId,
            'reference' => $reference,
            'status' => $status,
            'payload' => $payload,
            'received_at' => now(),
        ]);

        if (! $this->isValidSignature($payload)) {
            return response()->json(['message' => 'Invalid signature'], 401);
        }

        if (! $reference) {
            $event->update(['processed_at' => now()]);
            return response()->json(['message' => 'Ignored event without reference']);
        }

        $plan = str_contains($reference, 'ANNUAL') ? 'annual' : 'monthly';
        $amountCents = (int) (Arr::get($transaction, 'amount_in_cents') ?? Arr::get($transaction, 'amountInCents') ?? 0);
        $user = $this->findUserFromReference($reference);

        $payment = WompiPayment::updateOrCreate(
            ['reference' => $reference],
            [
                'user_id' => $user?->id,
                'transaction_id' => $transactionId,
                'plan' => $plan,
                'plan_label' => $plan === 'annual' ? 'Anual' : 'Mensual',
                'amount_cents' => $amountCents,
                'currency' => Arr::get($transaction, 'currency', 'COP'),
                'status' => $status ?: 'UNKNOWN',
                'payload' => $payload,
                'paid_at' => $status === 'APPROVED' ? now() : null,
            ]
        );

        if ($user && $status === 'APPROVED') {
            $startsAt = now();
            Subscription::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'wompi_payment_id' => $payment->id,
                    'plan' => $plan,
                    'status' => 'active',
                    'starts_at' => $startsAt,
                    'ends_at' => $plan === 'annual' ? $startsAt->copy()->addYear() : $startsAt->copy()->addMonth(),
                    'cancelled_at' => null,
                ]
            );
        }

        $event->update(['processed_at' => now()]);

        return response()->json(['message' => 'ok']);
    }

    private function isValidSignature(array $payload): bool
    {
        $secret = config('services.wompi.events_secret');
        $properties = Arr::get($payload, 'signature.properties', []);
        $checksum = Arr::get($payload, 'signature.checksum');
        $timestamp = Arr::get($payload, 'timestamp');

        if (! $secret || ! $checksum || ! $timestamp || ! is_array($properties)) {
            return false;
        }

        $plain = '';
        foreach ($properties as $property) {
            $plain .= (string) (Arr::get($payload, "data.{$property}") ?? Arr::get($payload, $property) ?? '');
        }

        $plain .= $timestamp . $secret;

        return hash_equals(hash('sha256', $plain), $checksum);
    }

    private function findUserFromReference(string $reference): ?User
    {
        $payment = WompiPayment::where('reference', $reference)->first();

        return $payment?->user;
    }
}
