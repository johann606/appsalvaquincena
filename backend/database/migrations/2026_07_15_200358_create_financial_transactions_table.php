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
        Schema::create('financial_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('external_id')->nullable();
            $table->string('description');
            $table->unsignedBigInteger('amount_cents');
            $table->enum('type', ['income', 'expense']);
            $table->string('category', 80)->default('Otros');
            $table->date('transaction_date');
            $table->string('source')->default('mobile');
            $table->unsignedBigInteger('wompi_payment_id')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'external_id']);
            $table->index(['user_id', 'transaction_date']);
            $table->index(['user_id', 'type', 'category']);
            $table->index('wompi_payment_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('financial_transactions');
    }
};
