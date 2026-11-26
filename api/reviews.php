<?php
/**
 * ============================================================================
 * BACKSTAGE WHEELS — PUBLIKA RECENSIONER (api/reviews.php)
 * ============================================================================
 * Returnerar synliga kundomdömen + Google-recensionslänk för widgeten
 * på hemsidan. Samma JSON-struktur som Node-endpointen /api/reviews.
 */

header('Content-Type: application/json; charset=utf-8');

$dataDir   = __DIR__ . '/../data';
$revPath   = $dataDir . '/reviews.json';
$setupPath = $dataDir . '/site-settings.json';

$reviews = [];
if (file_exists($revPath)) {
    $decoded = json_decode(@file_get_contents($revPath), true);
    if (is_array($decoded)) {
        foreach ($decoded as $r) {
            if (!is_array($r) || ($r['status'] ?? '') === 'hidden') { continue; }
            $reviews[] = [
                'id'     => (string) ($r['id'] ?? ''),
                'name'   => (string) ($r['name'] ?? ''),
                'stars'  => max(1, min(5, (int) ($r['stars'] ?? 5))),
                'text'   => (string) ($r['text'] ?? ''),
                'date'   => (string) ($r['date'] ?? ''),
                'source' => (string) ($r['source'] ?? 'Google'),
            ];
            if (count($reviews) >= 24) { break; }
        }
    }
}

$googleReviewUrl = '';
if (file_exists($setupPath)) {
    $cfg = json_decode(@file_get_contents($setupPath), true);
    if (is_array($cfg) && !empty($cfg['googleReviewUrl'])) {
        $googleReviewUrl = (string) $cfg['googleReviewUrl'];
    }
}

echo json_encode(['ok' => true, 'reviews' => $reviews, 'googleReviewUrl' => $googleReviewUrl], JSON_UNESCAPED_UNICODE);
