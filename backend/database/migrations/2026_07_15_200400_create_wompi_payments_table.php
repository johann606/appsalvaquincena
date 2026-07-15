<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('wompi_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('transaction_id')->nullable()->unique();
            $table->string('reference')->unique();
            $table->enum('plan', ['monthly', 'annual']);
            $table->string('plan_label');
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency', 3)->default('COP');
            $table->string('status', 40)->default('PENDING');
            $table->json('payload')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['plan', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wompi_payments');
    }
};
