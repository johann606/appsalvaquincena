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
        Schema::create('debts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('external_id')->nullable();
            $table->string('name');
            $table->unsignedBigInteger('balance_cents');
            $table->decimal('annual_rate', 7, 4)->default(0);
            $table->unsignedBigInteger('minimum_payment_cents')->default(0);
            $table->unsignedSmallInteger('term_months')->nullable();
            $table->boolean('is_advanced')->default(false);
            $table->enum('status', ['active', 'paid', 'paused'])->default('active');
            $table->timestamps();

            $table->unique(['user_id', 'external_id']);
            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('debts');
    }
};
