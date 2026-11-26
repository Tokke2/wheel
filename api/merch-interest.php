<?php
/**
 * BACKSTAGE WHEELS — MERCH INTRESSEANMÄLAN & RÖSTNING (api/merch-interest.php)
 */
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Endast POST']);
    exit;
}

$dataDir = __DIR__ . '/../data';
if (!is_dir($dataDir)) @mkdir($dataDir, 0755, true);
$intFile = $dataDir . '/merch-interest.json';
$subFile = $dataDir . '/subscribers.json';

$load = fn($f, $fb = []) => file_exists($f) ? (json_decode(@file_get_contents($f), true) ?? $fb) : $fb;
$save = fn($f, $d) => @file_put_contents($f, json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$productId = trim((string) ($body['productId'] ?? ''));
$productName = trim((string) ($body['productName'] ?? ''));

if ($productId === '' && $productName === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Välj vilken vara/design du är intresserad av.']);
    exit;
}

$list = $load($intFile, []);
$entry = [
    'id' => 'interest-' . time() . '-' . substr(bin2hex(random_bytes(3)), 0, 5),
    'createdAt' => date('Y-m-d H:i'),
    'productId' => $productId ?: 'allman',
    'productName' => $productName ?: 'Valfri design',
    'size' => trim((string) ($body['size'] ?? '-')),
    'quickVote' => !empty($body['quickVote']),
    'customerName' => trim((string) ($body['customerName'] ?? '')),
    'email' => strtolower(trim((string) ($body['email'] ?? ''))),
    'phone' => trim((string) ($body['phone'] ?? '')),
    'comment' => trim((string) ($body['comment'] ?? ''))
];
array_unshift($list, $entry);
$save($intFile, $list);

if ($entry['email'] !== '' && strpos($entry['email'], '@') !== false && ($body['subscribeNewsletter'] ?? true) !== false) {
    $subs = $load($subFile, []);
    $exists = false;
    foreach ($subs as &$s) {
        if (strtolower($s['email'] ?? '') === $entry['email']) {
            $s['active'] = true;
            $exists = true;
            break;
        }
    }
    if (!$exists) {
        array_unshift($subs, [
            'id' => 'sub-' . time(),
            'email' => $entry['email'],
            'name' => $entry['customerName'],
            'source' => 'Merch-intresseanmälan',
            'interests' => 'Merch (' . $entry['productName'] . ') + Nya inlägg',
            'active' => true,
            'subscribedAt' => date('Y-m-d H:i'),
            'unsubscribeToken' => bin2hex(random_bytes(16))
        ]);
    }
    $save($subFile, $subs);
}

$counts = [];
foreach ($list as $it) {
    $pid = trim((string) ($it['productId'] ?? ''));
    if ($pid !== '') $counts[$pid] = ($counts[$pid] ?? 0) + 1;
}

echo json_encode(['ok' => true, 'interestCounts' => $counts]);
