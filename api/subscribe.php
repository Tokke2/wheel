<?php
/**
 * BACKSTAGE WHEELS — E-POSTPRENUMERATION & AVREGISTRERING (api/subscribe.php)
 */
$dataDir = __DIR__ . '/../data';
if (!is_dir($dataDir)) @mkdir($dataDir, 0755, true);
$subFile = $dataDir . '/subscribers.json';
$settingsFile = $dataDir . '/site-settings.json';

$load = fn($f, $fb = []) => file_exists($f) ? (json_decode(@file_get_contents($f), true) ?? $fb) : $fb;
$save = fn($f, $d) => @file_put_contents($f, json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'unsubscribe') {
    $token = trim((string) ($_GET['token'] ?? ''));
    $subs = $load($subFile, []);
    foreach ($subs as &$s) {
        if (!empty($s['unsubscribeToken']) && hash_equals($s['unsubscribeToken'], $token)) {
            $s['active'] = false;
            $s['unsubscribedAt'] = date('Y-m-d H:i');
        }
    }
    unset($s);
    $save($subFile, $subs);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Avregistrerad – Backstage Wheels</title></head><body style="background:#090a0f;color:#f8fafc;font-family:sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px;"><div style="max-width:480px;background:#151720;border:1px solid #282c3d;padding:32px;border-radius:12px;text-align:center;"><h1>Du är nu avregistrerad ✓</h1><p style="color:#cbd5e1;">Din e-postadress får inga fler utskick från Backstage Wheels.</p><a href="../" style="display:inline-block;margin-top:16px;padding:12px 22px;background:#f97316;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Tillbaka till hemsidan</a></div></body></html>';
    exit;
}

header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Endast POST']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$email = strtolower(trim((string) ($body['email'] ?? '')));
$name = trim((string) ($body['name'] ?? ''));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Ange en giltig e-postadress.']);
    exit;
}

$subs = $load($subFile, []);
$already = false;
$token = bin2hex(random_bytes(18));

foreach ($subs as &$s) {
    if (strtolower($s['email'] ?? '') === $email) {
        $s['active'] = true;
        if ($name !== '') $s['name'] = $name;
        $token = $s['unsubscribeToken'] ?? $token;
        $s['unsubscribeToken'] = $token;
        $already = true;
        break;
    }
}
unset($s);

if (!$already) {
    array_unshift($subs, [
        'id' => 'sub-' . time() . '-' . bin2hex(random_bytes(2)),
        'email' => $email,
        'name' => $name,
        'source' => 'Hemsidans e-postanmälan',
        'interests' => trim((string) ($body['interests'] ?? 'Nya inlägg, kampanjer & festivalförslag')),
        'active' => true,
        'unsubscribeToken' => $token,
        'createdAt' => date('Y-m-d H:i')
    ]);
}
$save($subFile, $subs);

if (!$already) {
    $cfg = $load($settingsFile, []);
    $from = trim((string) ($cfg['contactEmail'] ?? 'bokning@backstagewheels.se'));
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $origin = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'backstagewheels.se');
    $unsubUrl = $origin . '/api/subscribe.php?action=unsubscribe&token=' . urlencode($token);
    $subj = 'Välkommen till Backstage Wheels VIP-utskick!';
    $html = '<div style="background:#090a0f;color:#f8fafc;font-family:Arial,sans-serif;padding:24px;"><div style="max-width:560px;margin:0 auto;background:#141722;border:1px solid #2e3448;border-radius:10px;padding:24px;"><h2 style="margin-top:0;color:#fff;">Välkommen till Backstage Wheels!</h2><p style="color:#cbd5e1;line-height:1.6;">Du får nu våra nya inlägg, exklusiva kampanjerbjudanden och festivalförslag direkt till din e-post.</p><p style="font-size:12px;color:#94a3b8;margin-top:24px;"><a href="' . htmlspecialchars($unsubUrl, ENT_QUOTES, 'UTF-8') . '" style="color:#fbbf24;">Avregistrera dig när som helst här</a></p></div></div>';
    @mail($email, '=?UTF-8?B?' . base64_encode($subj) . '?=', $html, "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nFrom: Backstage Wheels <{$from}>\r\n");
}

echo json_encode(['ok' => true, 'alreadyExisted' => $already]);
