<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinancialAdvisorTest extends TestCase
{
    use RefreshDatabase;

    public function test_free_user_cannot_use_financial_advisor(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/advisor/chat', [
            'message' => 'Que deuda pago primero?',
        ])->assertForbidden();
    }

    public function test_pro_user_can_use_financial_advisor(): void
    {
        config()->set('services.openai.api_key', 'test-key');

        Http::fake([
            'api.openai.com/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'Paga primero la deuda con mayor interes.']],
                ],
            ]),
        ]);

        $user = User::factory()->create();

        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'monthly',
            'status' => 'active',
            'starts_at' => now(),
            'ends_at' => now()->addMonth(),
        ]);

        Sanctum::actingAs($user);

        $this->postJson('/api/advisor/chat', [
            'message' => 'Que deuda pago primero?',
        ])
            ->assertOk()
            ->assertJson([
                'reply' => 'Paga primero la deuda con mayor interes.',
            ]);

        Http::assertSentCount(1);
    }
}
