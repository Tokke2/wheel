<?php
/**
 * BACKSTAGE WHEELS — PUBLIK DATA-ENDPOINT (api/public.php)
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$dataDir = __DIR__ . '/../data';
$load = function ($file, $fallback) {
    if (!file_exists($file)) return $fallback;
    $d = json_decode(@file_get_contents($file), true);
    return is_array($d) ? $d : $fallback;
};

$settings = $load($dataDir . '/site-settings.json', []);
unset($settings['socialAutoShare']);

$interests = $load($dataDir . '/merch-interest.json', []);
$counts = [];
foreach ($interests as $it) {
    $pid = trim((string) ($it['productId'] ?? ''));
    if ($pid !== '') $counts[$pid] = ($counts[$pid] ?? 0) + 1;
}

echo json_encode([
    'ok' => true,
    'settings' => $settings,
    'posts' => $load($dataDir . '/posts.json', []),
    'merch' => file_exists($dataDir . '/merch.json') ? $load($dataDir . '/merch.json', null) : null,
    'merchShopMode' => $settings['merchShopMode'] ?? 'coming_soon',
    'merchInterestCounts' => $counts
]);
