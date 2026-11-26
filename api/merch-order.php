<?php
/**
 * BACKSTAGE WHEELS — MERCH-BESTÄLLNINGAR (api/merch-order.php)
 */
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Endast POST']);
    exit;
}

$dataDir = __DIR__ . '/../data';
if (!is_dir($dataDir)) @mkdir($dataDir, 0755, true);
$ordersFile = $dataDir . '/merch-orders.json';
$settingsFile = $dataDir . '/site-settings.json';
$subFile = $dataDir . '/subscribers.json';

$load = fn($f, $fb = []) => file_exists($f) ? (json_decode(@file_get_contents($f), true) ?? $fb) : $fb;
$save = fn($f, $d) => @file_put_contents($f, json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$productName = trim((string) ($body['productName'] ?? ''));
$customerName = trim((string) ($body['customerName'] ?? ''));
$email = trim((string) ($body['email'] ?? ''));

if ($productName === '' || $customerName === '' || $email === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Fyll i produkt, namn och e-post.']);
    exit;
}

$qty = max(1, (int) ($body['quantity'] ?? 1));
$unitPrice = (float) ($body['unitPrice'] ?? 0);
$order = [
    'id' => 'order-' . time(),
    'receivedAt' => date('Y-m-d H:i'),
    'productName' => $productName,
    'size' => trim((string) ($body['size'] ?? '-')),
    'quantity' => $qty,
    'unitPrice' => $unitPrice,
    'totalPrice' => $qty * $unitPrice,
    'customerName' => $customerName,
    'phone' => trim((string) ($body['phone'] ?? '')),
    'email' => $email,
    'address' => trim((string) ($body['address'] ?? '')),
    'message' => trim((string) ($body['message'] ?? ''))
];

$orders = $load($ordersFile, []);
array_unshift($orders, $order);
$save($ordersFile, $orders);

if (!empty($body['subscribeNewsletter']) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $subs = $load($subFile, []);
    $exists = false;
    foreach ($subs as $s) {
        if (strtolower($s['email'] ?? '') === strtolower($email)) { $exists = true; break; }
    }
    if (!$exists) {
        array_unshift($subs, [
            'id' => 'sub-' . time(),
            'email' => strtolower($email),
            'name' => $customerName,
            'source' => 'Merch-beställning',
            'interests' => 'Nya inlägg, kampanjer & festivalförslag',
            'active' => true,
            'unsubscribeToken' => bin2hex(random_bytes(18)),
            'createdAt' => date('Y-m-d H:i')
        ]);
        $save($subFile, $subs);
    }
}

$cfg = $load($settingsFile, []);
$recipient = trim((string) ($cfg['contactEmail'] ?? 'bokning@backstagewheels.se'));
$subj = "[Backstage Wheels Merch] Ny beställning: {$qty}x {$productName}";
$txt = "Ny merch-beställning!\n\nProdukt: {$productName}\nStorlek: {$order['size']}\nAntal: {$qty} st\nSumma: {$order['totalPrice']} kr\n\nKund: {$customerName}\nTelefon: {$order['phone']}\nE-post: {$email}\nLeveransadress: {$order['address']}\nMeddelande: {$order['message']}\n";
@mail($recipient, '=?UTF-8?B?' . base64_encode($subj) . '?=', $txt, "Content-Type: text/plain; charset=UTF-8\r\nReply-To: {$email}\r\n");

echo json_encode(['ok' => true, 'order' => $order, 'recipient' => $recipient]);
