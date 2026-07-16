<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\WompiWebhookController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/wompi/webhook', WompiWebhookController::class)->middleware('throttle:120,1');

Route::middleware(['auth:sanctum', 'throttle:90,1'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/sync', [SyncController::class, 'show']);
    Route::post('/sync', [SyncController::class, 'store']);
    Route::get('/subscription', [SubscriptionController::class, 'show']);
    Route::post('/subscription/checkout', [SubscriptionController::class, 'checkout'])->middleware('throttle:10,1');
});
