<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Debt extends Model
{
    protected $fillable = [
        'user_id',
        'external_id',
        'name',
        'balance_cents',
        'annual_rate',
        'minimum_payment_cents',
        'term_months',
        'is_advanced',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'annual_rate' => 'decimal:4',
            'is_advanced' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
