<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WompiEvent extends Model
{
    protected $fillable = [
        'event_id',
        'event_type',
        'transaction_id',
        'reference',
        'status',
        'payload',
        'received_at',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'received_at' => 'datetime',
            'processed_at' => 'datetime',
        ];
    }
}
