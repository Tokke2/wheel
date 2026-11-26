<?php
/**
 * ============================================================================
 * BACKSTAGE WHEELS — SÄKER ADMIN-BACKEND FÖR WEBBHOTELL (api/admin.php)
 * ============================================================================
 * - AES-256-GCM krypterat valv för Instagram, Facebook, Webhook & Google Kalender
 * - Brute-force-lås (max 5 felaktiga försök / 15 min per IP)
 * - 256-bitars sessionstoken + 20-dagars lösenordsrotation + mail till rl@tadega.com
 * - Automatisk postning till sociala medier vid varje nytt inlägg
 * - Evenemangsmappar i galleriet + Kalenderhantering
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow, noarchive');

define('BSW_MASTER_EMAIL', 'rl@tadega.com');
define('BSW_EXPIRY_DAYS', 20);
define('BSW_EXPIRY_SECONDS', BSW_EXPIRY_DAYS * 86400);
define('BSW_SESSION_TTL', 12 * 3600);

$dataDir      = __DIR__ . '/../data';
$authFile     = $dataDir . '/admin-auth.json';
$settingsFile = $dataDir . '/site-settings.json';
$vaultFile    = $dataDir . '/social-vault.enc.json';
$vaultKeyFile = $dataDir . '/.vault.key';
$postsFile    = $dataDir . '/posts.json';
$merchFile    = $dataDir . '/merch.json';
$merchOrdFile = $dataDir . '/merch-orders.json';
$subsFile     = $dataDir . '/subscribers.json';
$campFile     = $dataDir . '/campaigns.json';
$calendarFile = $dataDir . '/calendar.json';
$foldersFile  = $dataDir . '/gallery-folders.json';
$debugLogFile = $dataDir . '/debug-logs.json';
$quotesFile   = $dataDir . '/offert-logg.json';
$rateFile     = $dataDir . '/rate-limit.json';

if (!is_dir($dataDir)) @mkdir($dataDir, 0755, true);

function bsw_send_broadcast_php($subsFile, $campFile, $settingsFile, $kind, $subject, $title, $text, $offerPrice, $mediaUrl, $ctaLabel, $ctaHash) {
    $subs = array_values(array_filter(bsw_load($subsFile, []), fn($s) => !empty($s['email']) && ($s['active'] ?? true)));
    $cfg = bsw_load($settingsFile, []);
    $from = trim((string) ($cfg['contactEmail'] ?? 'bokning@backstagewheels.se'));
    $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $origin = $proto . '://' . ($_SERVER['HTTP_HOST'] ?? 'backstagewheels.se');
    $targetUrl = $origin . '/' . ($ctaHash ?: '#offert');
    $fullMedia = ($mediaUrl && !str_starts_with($mediaUrl, 'http')) ? $origin . '/' . ltrim($mediaUrl, '/') : $mediaUrl;
    $sentCount = 0;

    foreach ($subs as $sub) {
        $unsubUrl = $origin . '/api/subscribe.php?action=unsubscribe&token=' . urlencode($sub['unsubscribeToken'] ?? '');
        $cleanTxt = nl2br(htmlspecialchars(preg_replace('/\[MEDIA:[^\]]+\]/', '', (string) $text), ENT_QUOTES, 'UTF-8'));
        $offerHtml = $offerPrice ? '<div style="display:inline-block;margin-bottom:14px;padding:8px 14px;background:rgba(249,115,22,0.18);border:1px solid #f97316;border-radius:6px;color:#fbbf24;font-weight:bold;">' . htmlspecialchars($offerPrice, ENT_QUOTES, 'UTF-8') . '</div>' : '';
        $imgHtml = ($fullMedia && !preg_match('/\.(mp4|webm|mov)$/i', $fullMedia)) ? '<div style="margin:12px 0 18px;"><img src="' . htmlspecialchars($fullMedia, ENT_QUOTES, 'UTF-8') . '" style="max-width:100%;border-radius:8px;display:block;" alt="" /></div>' : '';
        $html = '<div style="background:#090a0f;color:#f8fafc;font-family:Arial,sans-serif;padding:24px 16px;"><div style="max-width:600px;margin:0 auto;background:#141722;border:1px solid #2e3448;border-radius:10px;overflow:hidden;"><div style="background:linear-gradient(135deg,#b91c1c,#f97316);padding:16px 22px;color:#fff;"><strong>BACKSTAGE WHEELS · VIP LIMOUSINE</strong></div><div style="padding:24px 22px;line-height:1.65;color:#e2e8f0;"><h2 style="color:#fff;margin-top:0;">' . htmlspecialchars($title ?: $subject, ENT_QUOTES, 'UTF-8') . '</h2>' . $offerHtml . $imgHtml . '<p>' . $cleanTxt . '</p><p style="margin:22px 0;"><a href="' . htmlspecialchars($targetUrl, ENT_QUOTES, 'UTF-8') . '" style="display:inline-block;padding:12px 22px;background:#f97316;color:#fff;text-decoration:none;font-weight:bold;border-radius:6px;">' . htmlspecialchars($ctaLabel ?: 'Öppna på Backstage Wheels', ENT_QUOTES, 'UTF-8') . '</a></p><hr style="border:none;border-top:1px solid #282c3d;margin:22px 0;" /><p style="font-size:12px;color:#94a3b8;margin:0;"><a href="' . htmlspecialchars($unsubUrl, ENT_QUOTES, 'UTF-8') . '" style="color:#fbbf24;">Avregistrera dig här</a></p></div></div></div>';
        if (@mail($sub['email'], '=?UTF-8?B?' . base64_encode($subject) . '?=', $html, "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nFrom: Backstage Wheels <{$from}>\r\n")) {
            $sentCount++;
        }
    }
    $camps = bsw_load($campFile, []);
    $entry = ['id' => 'camp-' . time(), 'kind' => $kind, 'subject' => $subject, 'title' => $title, 'offerPrice' => $offerPrice, 'recipientCount' => count($subs), 'smtpDeliveredCount' => $sentCount, 'sentAt' => date('Y-m-d H:i')];
    array_unshift($camps, $entry);
    bsw_save($campFile, array_slice($camps, 0, 80));
    return $entry;
}

function bsw_load($path, $fallback = null) {
    if (!file_exists($path)) return $fallback;
    $d = json_decode((string) @file_get_contents($path), true);
    return $d !== null ? $d : $fallback;
}

function bsw_save($path, $data) {
    @file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

function bsw_log($file, $level, $cat, $msg, $details = null) {
    $logs = bsw_load($file, []);
    array_unshift($logs, [
        'id' => bin2hex(random_bytes(5)),
        'ts' => gmdate('c'),
        'timeSv' => date('Y-m-d H:i:s'),
        'level' => strtoupper($level),
        'category' => strtoupper($cat),
        'message' => mb_substr((string) $msg, 0, 500),
        'details' => $details
    ]);
    if (count($logs) > 400) $logs = array_slice($logs, 0, 400);
    bsw_save($file, $logs);
}

// AES-256-GCM Valv
function bsw_vault_key($vaultKeyFile) {
    if (file_exists($vaultKeyFile)) {
        $hex = trim((string) @file_get_contents($vaultKeyFile));
        if (strlen($hex) === 64) return hex2bin($hex);
    }
    $k = random_bytes(32);
    @file_put_contents($vaultKeyFile, bin2hex($k));
    @chmod($vaultKeyFile, 0600);
    return $k;
}

function bsw_read_vault($vaultFile, $vaultKeyFile) {
    $defaults = [
        'autoPostEveryEntry' => true,
        'instagramEnabled' => true,
        'instagramAccountId' => '',
        'instagramAccessToken' => '',
        'facebookEnabled' => true,
        'facebookPageId' => '',
        'facebookPageToken' => '',
        'webhookEnabled' => true,
        'webhookUrl' => '',
        'webhookSecret' => '',
        'defaultHashtags' => '#backstagewheels #hyralimousine #hummerlimo #hardrock',
        'googleCalendarIcsUrl' => ''
    ];
    if (!file_exists($vaultFile)) return $defaults;
    $raw = bsw_load($vaultFile, []);
    if (empty($raw['ciphertext']) || empty($raw['iv']) || empty($raw['tag'])) return $defaults;
    $key = bsw_vault_key($vaultKeyFile);
    $dec = @openssl_decrypt(
        hex2bin($raw['ciphertext']),
        'aes-256-gcm',
        $key,
        OPENSSL_RAW_DATA,
        hex2bin($raw['iv']),
        hex2bin($raw['tag'])
    );
    if (!$dec) return $defaults;
    return array_merge($defaults, json_decode($dec, true) ?: []);
}

function bsw_save_vault($vaultFile, $vaultKeyFile, $obj) {
    $key = bsw_vault_key($vaultKeyFile);
    $iv  = random_bytes(12);
    $tag = '';
    $enc = openssl_encrypt(json_encode($obj), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    bsw_save($vaultFile, [
        'alg' => 'AES-256-GCM',
        'iv' => bin2hex($iv),
        'tag' => bin2hex($tag),
        'ciphertext' => bin2hex($enc),
        'updatedAt' => date('Y-m-d H:i:s')
    ]);
}

function bsw_mask($s) {
    $s = trim((string) $s);
    if ($s === '') return '';
    return strlen($s) <= 6 ? '••••••' : ('••••••••••••' . substr($s, -4));
}

function bsw_masked_vault($vaultFile, $vaultKeyFile) {
    $v = bsw_read_vault($vaultFile, $vaultKeyFile);
    $whHost = !empty($v['webhookUrl']) ? (parse_url($v['webhookUrl'], PHP_URL_HOST) ?: '') : '';
    return [
        'encryption' => 'AES-256-GCM',
        'autoPostEveryEntry' => !empty($v['autoPostEveryEntry']),
        'instagramEnabled' => !empty($v['instagramEnabled']),
        'instagramAccountId' => $v['instagramAccountId'] ?? '',
        'instagramTokenMasked' => bsw_mask($v['instagramAccessToken'] ?? ''),
        'instagramConnected' => !empty($v['instagramAccountId']) && !empty($v['instagramAccessToken']),
        'facebookEnabled' => !empty($v['facebookEnabled']),
        'facebookPageId' => $v['facebookPageId'] ?? '',
        'facebookTokenMasked' => bsw_mask($v['facebookPageToken'] ?? ''),
        'facebookConnected' => !empty($v['facebookPageId']) && !empty($v['facebookPageToken']),
        'webhookEnabled' => !empty($v['webhookEnabled']),
        'webhookHost' => $whHost,
        'webhookUrlMasked' => $whHost ? "https://{$whHost}/••••" : '',
        'webhookSecretMasked' => bsw_mask($v['webhookSecret'] ?? ''),
        'webhookConnected' => !empty($v['webhookUrl']),
        'defaultHashtags' => $v['defaultHashtags'] ?? '#backstagewheels',
        'googleCalendarConnected' => !empty($v['googleCalendarIcsUrl']),
        'googleCalendarMasked' => !empty($v['googleCalendarIcsUrl']) ? 'Google iCal (.ics) ansluten ✓' : '',
        'outboundIcsPath' => '/api/calendar.php?format=ics'
    ];
}

// Brute-force skydd
function bsw_check_rate($rateFile, $ip) {
    $map = bsw_load($rateFile, []);
    $now = time();
    if (empty($map[$ip])) return ['blocked' => false];
    if ($now - $map[$ip]['firstAt'] > 900) {
        unset($map[$ip]);
        bsw_save($rateFile, $map);
        return ['blocked' => false];
    }
    if ($map[$ip]['count'] >= 5) {
        $mins = max(1, (int) ceil((900 - ($now - $map[$ip]['firstAt'])) / 60));
        return ['blocked' => true, 'minsLeft' => $mins];
    }
    return ['blocked' => false];
}

function bsw_fail_rate($rateFile, $debugLogFile, $ip) {
    $map = bsw_load($rateFile, []);
    $now = time();
    if (empty($map[$ip]) || ($now - $map[$ip]['firstAt'] > 900)) {
        $map[$ip] = ['count' => 1, 'firstAt' => $now];
    } else {
        $map[$ip]['count']++;
    }
    bsw_save($rateFile, $map);
    bsw_log($debugLogFile, 'SECURITY', 'BRUTEFORCE_GUARD', "Misslyckat inloggningsförsök ({$map[$ip]['count']}/5)", ['ip' => $ip]);
}

function bsw_pw_status($auth) {
    if (!$auth || empty($auth['hash']) || empty($auth['changedAt'])) {
        return ['initialized' => false, 'expired' => false, 'daysLeft' => BSW_EXPIRY_DAYS];
    }
    $elapsed = max(0, time() - (int) $auth['changedAt']);
    $expired = $elapsed >= BSW_EXPIRY_SECONDS;
    return [
        'initialized' => true,
        'expired' => $expired,
        'daysLeft' => $expired ? 0 : (int) ceil((BSW_EXPIRY_SECONDS - $elapsed) / 86400),
        'changedAtIso' => date('Y-m-d H:i', (int) $auth['changedAt']),
        'expiresAtIso' => date('Y-m-d H:i', (int) $auth['changedAt'] + BSW_EXPIRY_SECONDS)
    ];
}

function bsw_is_authed($auth, $token) {
    if (!$auth || empty($auth['sessionToken']) || !$token) return false;
    if (!hash_equals($auth['sessionToken'], (string) $token)) return false;
    if (!empty($auth['sessionIssuedAt']) && (time() - (int) $auth['sessionIssuedAt'] > BSW_SESSION_TTL)) return false;
    $st = bsw_pw_status($auth);
    return $st['initialized'] && !$st['expired'];
}

function bsw_http_post($url, $payload, $headers = []) {
    $json = json_encode($payload);
    $hdrs = array_merge(["Content-Type: application/json", "Content-Length: " . strlen($json)], $headers);
    $ctx = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", $hdrs) . "\r\n",
            'content' => $json,
            'timeout' => 10,
            'ignore_errors' => true
        ]
    ]);
    $resp = @file_get_contents($url, false, $ctx);
    return $resp ?: '';
}

$action = $_GET['action'] ?? '';
$auth   = bsw_load($authFile, null);
$hdrTok = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
$ip     = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'public_settings') {
        $s = bsw_load($settingsFile, new stdClass());
        if (is_array($s)) unset($s['socialAutoShare']);
        echo json_encode(['ok' => true, 'settings' => $s, 'posts' => bsw_load($postsFile, [])]);
        exit;
    }
    if ($action === 'status') {
        $authed = bsw_is_authed($auth, $hdrTok);
        echo json_encode([
            'ok' => true,
            'authenticated' => $authed,
            'masterEmail' => BSW_MASTER_EMAIL,
            'expiryDays' => BSW_EXPIRY_DAYS,
            'passwordStatus' => bsw_pw_status($auth),
            'vault' => $authed ? bsw_masked_vault($vaultFile, $vaultKeyFile) : null,
            'mailLog' => ($authed && !empty($auth['mailLog'])) ? array_slice($auth['mailLog'], 0, 12) : []
        ]);
        exit;
    }
    if ($action === 'admin_data') {
        if (!bsw_is_authed($auth, $hdrTok)) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Ej inloggad']);
            exit;
        }
        $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host  = $_SERVER['HTTP_HOST'] ?? 'backstagewheels.se';
        $safeSettings = bsw_load($settingsFile, []);
        unset($safeSettings['socialAutoShare']);
        $interests = bsw_load($dataDir . '/merch-interest.json', []);
        $interestCounts = [];
        foreach ($interests as $it) {
            $pid = trim((string) ($it['productId'] ?? ''));
            if ($pid !== '') $interestCounts[$pid] = ($interestCounts[$pid] ?? 0) + 1;
        }
        $svgDir = $dataDir . '/print-svg';
        if (!is_dir($svgDir)) @mkdir($svgDir, 0755, true);
        $svgMeta = bsw_load($dataDir . '/print-svg-meta.json', []);
        $printSvgs = [];
        foreach (glob($svgDir . '/*.svg') ?: [] as $svgPath) {
            $fn = basename($svgPath);
            $foundMeta = [];
            foreach ($svgMeta as $sm) {
                if (($sm['filename'] ?? '') === $fn) { $foundMeta = $sm; break; }
            }
            $printSvgs[] = [
                'filename' => $fn,
                'title' => $foundMeta['title'] ?? preg_replace('/\.svg$/i', '', $fn),
                'usage' => $foundMeta['usage'] ?? 'Tryckoriginal (Vektoriserad SVG)',
                'dimensions' => $foundMeta['dimensions'] ?? '100% skalbar vektor',
                'updatedAt' => date('Y-m-d H:i', @filemtime($svgPath) ?: time()),
                'svgContent' => (string) @file_get_contents($svgPath)
            ];
        }
        echo json_encode([
            'ok' => true,
            'vault' => bsw_masked_vault($vaultFile, $vaultKeyFile),
            'settings' => $safeSettings,
            'calendar' => bsw_load($calendarFile, null),
            'googleItems' => [],
            'folders' => bsw_load($foldersFile, []),
            'merch' => bsw_load($merchFile, null),
            'merchShopMode' => $safeSettings['merchShopMode'] ?? 'coming_soon',
            'merchOrders' => array_slice(bsw_load($merchOrdFile, []), 0, 100),
            'merchInterests' => array_slice($interests, 0, 200),
            'merchInterestCounts' => $interestCounts,
            'printSvgs' => $printSvgs,
            'subscribers' => bsw_load($subsFile, []),
            'campaigns' => array_slice(bsw_load($campFile, []), 0, 50),
            'quotes' => array_slice(bsw_load($quotesFile, []), 0, 100),
            'logs' => bsw_load($debugLogFile, []),
            'health' => ['phpVersion' => PHP_VERSION, 'vaultEncryption' => 'AES-256-GCM'],
            'icsSubscribeUrl' => "{$proto}://{$host}/api/calendar.php?format=ics"
        ]);
        exit;
    }
}

// Filuppladdning i Admin
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'upload_asset') {
    $tok = $_POST['token'] ?? $hdrTok;
    if (!bsw_is_authed($auth, $tok) || empty($_FILES['file']['tmp_name'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Ej behörig eller fil saknas']);
        exit;
    }
    $folderType = $_POST['folder'] ?? 'gallery';
    $eventSlug  = preg_replace('/[^a-z0-9-_]/', '', strtolower((string) ($_POST['eventSlug'] ?? '')));
    $sub = 'bilder/galleri';
    if ($folderType === 'logo') $sub = 'bilder/logo';
    elseif ($folderType === 'car') $sub = 'bilder/bilar';
    elseif ($folderType === 'post') $sub = 'bilder/inlagg';
    elseif ($folderType === 'merch') $sub = 'bilder/merch';
    elseif ($folderType === 'gallery' && $eventSlug && $eventSlug !== 'ovrigt') $sub = 'bilder/galleri/' . $eventSlug;

    $dir = __DIR__ . '/../' . $sub;
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $safe = time() . '-' . preg_replace('/[^a-zA-Z0-9._-]/', '-', basename($_FILES['file']['name']));
    $dest = $dir . '/' . $safe;
    if (move_uploaded_file($_FILES['file']['tmp_name'], $dest)) {
        $ext = strtolower(pathinfo($dest, PATHINFO_EXTENSION));
        $isVid = in_array($ext, ['mp4', 'webm', 'mov', 'm4v', 'ogv'], true);
        echo json_encode(['ok' => true, 'path' => $sub . '/' . $safe, 'thumb' => $sub . '/' . $safe, 'type' => $isVid ? 'video' : 'image', 'savedPercent' => 0]);
        exit;
    }
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Kunde ej spara fil']);
    exit;
}

$body = json_decode((string) file_get_contents('php://input'), true) ?: [];
$act  = $body['action'] ?? $action;

if ($act === 'log_event') {
    bsw_log($debugLogFile, $body['level'] ?? 'INFO', $body['category'] ?? 'CLIENT', $body['message'] ?? '', $body['details'] ?? null);
    echo json_encode(['ok' => true]);
    exit;
}

if ($act === 'setup_password') {
    if ($auth && !empty($auth['hash'])) { http_response_code(403); echo json_encode(['ok' => false, 'error' => 'Redan inställt']); exit; }
    $np = trim((string) ($body['newPassword'] ?? ''));
    if (strlen($np) < 8) { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'Minst 8 tecken krävs.']); exit; }
    $tok = bin2hex(random_bytes(32));
    $now = time();
    $subj = '[Backstage Wheels Admin] Lösenord valt';
    $mailBody = "Hej Rickard,\n\nNytt adminlösenord har valts.\nTid: " . date('Y-m-d H:i', $now) . "\nNytt lösenord: {$np}\n";
    $sent = @mail(BSW_MASTER_EMAIL, '=?UTF-8?B?' . base64_encode($subj) . '?=', $mailBody, "Content-Type: text/plain; charset=UTF-8\r\n");
    $auth = [
        'hash' => password_hash($np, PASSWORD_DEFAULT),
        'changedAt' => $now,
        'sessionToken' => $tok,
        'sessionIssuedAt' => $now,
        'mailLog' => [['to' => BSW_MASTER_EMAIL, 'reason' => 'Första inloggning', 'sentAt' => date('Y-m-d H:i', $now), 'mailSent' => (bool) $sent]]
    ];
    bsw_save($authFile, $auth);
    echo json_encode(['ok' => true, 'token' => $tok, 'passwordStatus' => bsw_pw_status($auth), 'vault' => bsw_masked_vault($vaultFile, $vaultKeyFile), 'mailNotification' => ['mailSent' => (bool) $sent, 'subject' => $subj, 'body' => $mailBody]]);
    exit;
}

if ($act === 'login') {
    $rl = bsw_check_rate($rateFile, $ip);
    if ($rl['blocked']) { http_response_code(429); echo json_encode(['ok' => false, 'error' => "Låst i {$rl['minsLeft']} min p.g.a. upprepade fel."]); exit; }
    if (!$auth || empty($auth['hash'])) { echo json_encode(['ok' => false, 'requireSetup' => true]); exit; }
    if (!password_verify((string) ($body['password'] ?? ''), $auth['hash'])) {
        bsw_fail_rate($rateFile, $debugLogFile, $ip);
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Felaktigt lösenord.']);
        exit;
    }
    $st = bsw_pw_status($auth);
    if ($st['expired']) { echo json_encode(['ok' => false, 'requireChange' => true, 'passwordStatus' => $st]); exit; }
    $auth['sessionToken'] = bin2hex(random_bytes(32));
    $auth['sessionIssuedAt'] = time();
    bsw_save($authFile, $auth);
    echo json_encode(['ok' => true, 'token' => $auth['sessionToken'], 'passwordStatus' => $st, 'vault' => bsw_masked_vault($vaultFile, $vaultKeyFile), 'mailLog' => $auth['mailLog'] ?? []]);
    exit;
}

if ($act === 'change_password') {
    if (!$auth || empty($auth['hash']) || !password_verify((string) ($body['currentPassword'] ?? ''), $auth['hash'])) {
        bsw_fail_rate($rateFile, $debugLogFile, $ip);
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Nuvarande lösenord stämmer ej.']);
        exit;
    }
    $np = trim((string) ($body['newPassword'] ?? ''));
    if (strlen($np) < 8 || $np === ($body['currentPassword'] ?? '')) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Minst 8 tecken och nytt lösenord krävs.']);
        exit;
    }
    $now = time();
    $tok = bin2hex(random_bytes(32));
    $subj = '[Backstage Wheels Admin] Lösenord bytt';
    $mailBody = "Hej Rickard,\n\nAdminlösenordet har bytts.\nTid: " . date('Y-m-d H:i', $now) . "\nNytt lösenord: {$np}\n";
    $sent = @mail(BSW_MASTER_EMAIL, '=?UTF-8?B?' . base64_encode($subj) . '?=', $mailBody, "Content-Type: text/plain; charset=UTF-8\r\n");
    $auth['hash'] = password_hash($np, PASSWORD_DEFAULT);
    $auth['changedAt'] = $now;
    $auth['sessionToken'] = $tok;
    $auth['sessionIssuedAt'] = $now;
    array_unshift($auth['mailLog'], ['to' => BSW_MASTER_EMAIL, 'reason' => 'Lösenordsbyte', 'sentAt' => date('Y-m-d H:i', $now), 'mailSent' => (bool) $sent]);
    bsw_save($authFile, $auth);
    echo json_encode(['ok' => true, 'token' => $tok, 'passwordStatus' => bsw_pw_status($auth), 'mailNotification' => ['mailSent' => (bool) $sent, 'subject' => $subj, 'body' => $mailBody], 'mailLog' => $auth['mailLog']]);
    exit;
}

$tok = $body['token'] ?? $hdrTok;
if (!bsw_is_authed($auth, $tok)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Ej inloggad']);
    exit;
}

if ($act === 'save_vault') {
    $cur = bsw_read_vault($vaultFile, $vaultKeyFile);
    $inp = $body['vault'] ?? [];
    $cur['autoPostEveryEntry'] = !empty($inp['autoPostEveryEntry']);
    $cur['instagramEnabled']   = !empty($inp['instagramEnabled']);
    $cur['facebookEnabled']    = !empty($inp['facebookEnabled']);
    $cur['webhookEnabled']     = !empty($inp['webhookEnabled']);
    if (isset($inp['instagramAccountId'])) $cur['instagramAccountId'] = trim((string) $inp['instagramAccountId']);
    if (!empty($inp['clearInstagramToken'])) $cur['instagramAccessToken'] = '';
    elseif (!empty($inp['instagramAccessToken']) && !str_contains($inp['instagramAccessToken'], '••••')) $cur['instagramAccessToken'] = trim($inp['instagramAccessToken']);
    if (isset($inp['facebookPageId'])) $cur['facebookPageId'] = trim((string) $inp['facebookPageId']);
    if (!empty($inp['clearFacebookToken'])) $cur['facebookPageToken'] = '';
    elseif (!empty($inp['facebookPageToken']) && !str_contains($inp['facebookPageToken'], '••••')) $cur['facebookPageToken'] = trim($inp['facebookPageToken']);
    if (!empty($inp['clearWebhook'])) { $cur['webhookUrl'] = ''; $cur['webhookSecret'] = ''; }
    else {
        if (!empty($inp['webhookUrl']) && !str_contains($inp['webhookUrl'], '••••')) $cur['webhookUrl'] = trim($inp['webhookUrl']);
        if (!empty($inp['webhookSecret']) && !str_contains($inp['webhookSecret'], '••••')) $cur['webhookSecret'] = trim($inp['webhookSecret']);
    }
    if (isset($inp['defaultHashtags'])) $cur['defaultHashtags'] = trim((string) $inp['defaultHashtags']);
    if (!empty($inp['clearGoogleCalendar'])) $cur['googleCalendarIcsUrl'] = '';
    elseif (!empty($inp['googleCalendarIcsUrl']) && !str_contains($inp['googleCalendarIcsUrl'], 'ansluten')) $cur['googleCalendarIcsUrl'] = trim($inp['googleCalendarIcsUrl']);
    bsw_save_vault($vaultFile, $vaultKeyFile, $cur);
    echo json_encode(['ok' => true, 'vault' => bsw_masked_vault($vaultFile, $vaultKeyFile)]);
    exit;
}

if ($act === 'create_post') {
    $p = $body['post'] ?? [];
    $v = bsw_read_vault($vaultFile, $vaultKeyFile);
    $channels = [];
    if (!empty($v['instagramEnabled'])) $channels[] = 'Instagram';
    if (!empty($v['facebookEnabled'])) $channels[] = 'Facebook';
    if (!empty($v['webhookEnabled']) && !empty($v['webhookUrl'])) $channels[] = 'TikTok / Webhook';
    if (empty($channels)) $channels[] = 'Hemsidan';

    $newP = [
        'id' => 'post-' . round(microtime(true) * 1000),
        'createdAt' => date('Y-m-d H:i'),
        'title' => trim((string) ($p['title'] ?? '')),
        'text' => trim((string) ($p['text'] ?? '')),
        'hashtags' => trim((string) ($p['hashtags'] ?? ($v['defaultHashtags'] ?? ''))),
        'media' => is_array($p['media'] ?? null) ? $p['media'] : [],
        'sharedTo' => $channels
    ];

    $caption = implode("\n\n", array_filter([$newP['title'], $newP['text'], $newP['hashtags']]));
    $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $origin = $proto . '://' . ($_SERVER['HTTP_HOST'] ?? 'backstagewheels.se');
    $firstM = $newP['media'][0]['src'] ?? null;
    $mediaUrl = $firstM ? (str_starts_with($firstM, 'http') ? $firstM : ($origin . '/' . ltrim($firstM, '/'))) : null;

    if (!empty($v['webhookEnabled']) && !empty($v['webhookUrl'])) {
        $whPayload = ['postId' => $newP['id'], 'title' => $newP['title'], 'caption' => $caption, 'mediaUrl' => $mediaUrl];
        $hdrs = [];
        if (!empty($v['webhookSecret'])) {
            $hdrs[] = 'X-Backstage-Signature: sha256=' . hash_hmac('sha256', json_encode($whPayload), $v['webhookSecret']);
        }
        bsw_http_post($v['webhookUrl'], $whPayload, $hdrs);
    }
    if (!empty($v['instagramEnabled']) && !empty($v['instagramAccountId']) && !empty($v['instagramAccessToken']) && $mediaUrl) {
        $res = json_decode(bsw_http_post("https://graph.facebook.com/v20.0/{$v['instagramAccountId']}/media", ['image_url' => $mediaUrl, 'caption' => $caption, 'access_token' => $v['instagramAccessToken']]), true);
        if (!empty($res['id'])) {
            bsw_http_post("https://graph.facebook.com/v20.0/{$v['instagramAccountId']}/media_publish", ['creation_id' => $res['id'], 'access_token' => $v['instagramAccessToken']]);
        }
    }
    if (!empty($v['facebookEnabled']) && !empty($v['facebookPageId']) && !empty($v['facebookPageToken'])) {
        bsw_http_post("https://graph.facebook.com/v20.0/{$v['facebookPageId']}/feed", ['message' => $caption, 'access_token' => $v['facebookPageToken']]);
    }

    $firstMedia = (!empty($newP['media'][0]['src'])) ? $newP['media'][0]['src'] : '';
    $nlInfo = bsw_send_broadcast_php($subsFile, $campFile, $settingsFile, 'new_post', 'Nytt inlägg från Backstage Wheels: ' . ($newP['title'] ?: 'Ny uppdatering!'), $newP['title'] ?: 'Nytt inlägg', $newP['text'] ?: '', '', $firstMedia, 'Läs inlägget & se bilder/video →', '#inlagg');
    $newP['newsletterSentTo'] = $nlInfo['recipientCount'];

    $posts = bsw_load($postsFile, []);
    array_unshift($posts, $newP);
    bsw_save($postsFile, $posts);
    echo json_encode(['ok' => true, 'post' => $newP, 'posts' => $posts, 'newsletterInfo' => $nlInfo, 'campaigns' => array_slice(bsw_load($campFile, []), 0, 50)]);
    exit;
}

if ($act === 'update_post') {
    $p = $body['post'] ?? [];
    $posts = bsw_load($postsFile, []);
    foreach ($posts as &$item) {
        if (($item['id'] ?? '') === ($p['id'] ?? '')) {
            $item['title'] = trim((string) ($p['title'] ?? ''));
            $item['text'] = trim((string) ($p['text'] ?? ''));
            $item['hashtags'] = trim((string) ($p['hashtags'] ?? ''));
            $item['media'] = is_array($p['media'] ?? null) ? $p['media'] : [];
            break;
        }
    }
    unset($item);
    bsw_save($postsFile, $posts);
    echo json_encode(['ok' => true, 'posts' => $posts]);
    exit;
}

if ($act === 'delete_post') {
    $posts = array_values(array_filter(bsw_load($postsFile, []), fn($x) => ($x['id'] ?? '') !== ($body['postId'] ?? '')));
    bsw_save($postsFile, $posts);
    echo json_encode(['ok' => true, 'posts' => $posts]);
    exit;
}

if ($act === 'save_merch') {
    if (is_array($body['merch'] ?? null)) {
        bsw_save($merchFile, $body['merch']);
        echo json_encode(['ok' => true, 'merch' => $body['merch']]);
        exit;
    }
}

if ($act === 'add_subscriber') {
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'Ogiltig e-post']); exit; }
    $subs = bsw_load($subsFile, []);
    $found = false;
    foreach ($subs as &$s) {
        if (strtolower($s['email'] ?? '') === $email) { $s['active'] = true; $found = true; break; }
    }
    unset($s);
    if (!$found) {
        array_unshift($subs, ['id' => 'sub-' . time(), 'email' => $email, 'name' => trim((string) ($body['name'] ?? '')), 'source' => 'Manuellt tillagd', 'interests' => 'Nya inlägg & kampanjer', 'active' => true, 'unsubscribeToken' => bin2hex(random_bytes(18)), 'createdAt' => date('Y-m-d H:i')]);
    }
    bsw_save($subsFile, $subs);
    echo json_encode(['ok' => true, 'subscribers' => $subs]);
    exit;
}

if ($act === 'delete_subscriber') {
    $id = (string) ($body['subscriberId'] ?? '');
    $subs = array_values(array_filter(bsw_load($subsFile, []), fn($s) => ($s['id'] ?? '') !== $id && ($s['email'] ?? '') !== $id));
    bsw_save($subsFile, $subs);
    echo json_encode(['ok' => true, 'subscribers' => $subs]);
    exit;
}

if ($act === 'import_customers_to_subscribers') {
    $subs = bsw_load($subsFile, []);
    $seen = array_map(fn($s) => strtolower($s['email'] ?? ''), $subs);
    $added = 0;
    foreach (bsw_load($quotesFile, []) as $q) {
        $em = strtolower(trim((string) ($q['epost'] ?? '')));
        if (filter_var($em, FILTER_VALIDATE_EMAIL) && !in_array($em, $seen, true)) {
            $seen[] = $em;
            array_unshift($subs, ['id' => 'sub-' . time() . '-' . $added, 'email' => $em, 'name' => $q['namn'] ?? '', 'source' => 'Offertkund', 'active' => true, 'unsubscribeToken' => bin2hex(random_bytes(18)), 'createdAt' => date('Y-m-d H:i')]);
            $added++;
        }
    }
    foreach (bsw_load($merchOrdFile, []) as $o) {
        $em = strtolower(trim((string) ($o['email'] ?? '')));
        if (filter_var($em, FILTER_VALIDATE_EMAIL) && !in_array($em, $seen, true)) {
            $seen[] = $em;
            array_unshift($subs, ['id' => 'sub-' . time() . '-' . $added, 'email' => $em, 'name' => $o['customerName'] ?? '', 'source' => 'Merch-kund', 'active' => true, 'unsubscribeToken' => bin2hex(random_bytes(18)), 'createdAt' => date('Y-m-d H:i')]);
            $added++;
        }
    }
    bsw_save($subsFile, $subs);
    echo json_encode(['ok' => true, 'added' => $added, 'subscribers' => $subs]);
    exit;
}

if ($act === 'send_campaign') {
    $c = $body['campaign'] ?? [];
    if (empty($c['subject']) || empty($c['text'])) { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'Ämne och text krävs']); exit; }
    $info = bsw_send_broadcast_php($subsFile, $campFile, $settingsFile, $c['kind'] ?? 'campaign', trim($c['subject']), trim($c['title'] ?? $c['subject']), trim($c['text']), trim($c['offerPrice'] ?? ''), trim($c['mediaUrl'] ?? ''), trim($c['ctaLabel'] ?? 'Boka nu →'), trim($c['ctaHash'] ?? '#offert'));
    echo json_encode(['ok' => true, 'sentInfo' => $info, 'campaigns' => array_slice(bsw_load($campFile, []), 0, 50)]);
    exit;
}

if ($act === 'delete_gallery_media') {
    $rel = ltrim((string) ($body['src'] ?? ''), '/');
    $abs = realpath(__DIR__ . '/../' . $rel);
    $galRoot = realpath(__DIR__ . '/../bilder/galleri');
    if ($abs && $galRoot && str_starts_with($abs, $galRoot) && is_file($abs)) @unlink($abs);
    echo json_encode(['ok' => true]);
    exit;
}

if ($act === 'delete_gallery_folder') {
    $slug = preg_replace('/[^a-z0-9-_]/', '', strtolower((string) ($body['slug'] ?? '')));
    $meta = array_values(array_filter(bsw_load($foldersFile, []), fn($m) => ($m['slug'] ?? '') !== $slug));
    bsw_save($foldersFile, $meta);
    echo json_encode(['ok' => true, 'folders' => $meta]);
    exit;
}

if ($act === 'create_gallery_folder') {
    $name = trim((string) ($body['name'] ?? ''));
    $slug = preg_replace('/^-+|-+$/', '', preg_replace('/[^a-z0-9-_]+/', '-', str_replace(['å', 'ä', 'ö'], ['a', 'a', 'o'], mb_strtolower($name))));
    if (!$slug) { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'Ogiltigt namn']); exit; }
    $dir = __DIR__ . '/../bilder/galleri/' . $slug;
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $meta = bsw_load($foldersFile, []);
    array_unshift($meta, ['slug' => $slug, 'name' => $name, 'date' => trim((string) ($body['date'] ?? '')), 'description' => trim((string) ($body['description'] ?? ''))]);
    bsw_save($foldersFile, $meta);
    echo json_encode(['ok' => true, 'folders' => $meta]);
    exit;
}

if ($act === 'save_calendar_list') {
    if (is_array($body['calendar'] ?? null)) {
        bsw_save($calendarFile, $body['calendar']);
        echo json_encode(['ok' => true, 'calendar' => $body['calendar']]);
        exit;
    }
}

if ($act === 'sync_google_calendar') {
    $v = bsw_read_vault($vaultFile, $vaultKeyFile);
    $icsUrl = trim((string) ($v['googleCalendarIcsUrl'] ?? ''));
    if (!$icsUrl) {
        echo json_encode(['ok' => false, 'error' => 'Ingen Google Kalender .ics-länk sparad ännu.']);
        exit;
    }
    $ctx = stream_context_create(['http' => ['timeout' => 8, 'user_agent' => 'BackstageWheels-CalendarSync/4.0']]);
    $raw = @file_get_contents($icsUrl, false, $ctx);
    if ($raw === false) {
        echo json_encode(['ok' => false, 'error' => 'Kunde inte hämta .ics-flödet från Google Kalender.']);
        exit;
    }
    preg_match_all('/BEGIN:VEVENT(.*?)END:VEVENT/si', $raw, $m);
    echo json_encode(['ok' => true, 'count' => count($m[1] ?? []), 'googleItems' => []]);
    exit;
}

if ($act === 'simulate_20_days') {
    $auth['changedAt'] = time() - (21 * 86400);
    $auth['sessionToken'] = null;
    bsw_save($authFile, $auth);
    echo json_encode(['ok' => true, 'passwordStatus' => bsw_pw_status($auth)]);
    exit;
}

if ($act === 'save_merch_mode') {
    $mode = (($body['mode'] ?? '') === 'live') ? 'live' : 'coming_soon';
    $cur = bsw_load($settingsFile, []);
    $cur['merchShopMode'] = $mode;
    bsw_save($settingsFile, $cur);
    echo json_encode(['ok' => true, 'mode' => $mode]);
    exit;
}

if ($act === 'save_print_svg') {
    $rawName = preg_replace('/[^a-zA-Z0-9._-]/', '-', trim((string) ($body['filename'] ?? 'tryckoriginal.svg')));
    $fname = str_ends_with(strtolower($rawName), '.svg') ? $rawName : ($rawName . '.svg');
    $svgContent = trim((string) ($body['svgContent'] ?? ''));
    if (strpos($svgContent, '<svg') === false || strpos($svgContent, '</svg>') === false) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Innehållet måste vara giltig <svg>...</svg>-kod.']);
        exit;
    }
    $svgDir = $dataDir . '/print-svg';
    if (!is_dir($svgDir)) @mkdir($svgDir, 0755, true);
    @file_put_contents($svgDir . '/' . $fname, $svgContent);

    $metaFile = $dataDir . '/print-svg-meta.json';
    $meta = bsw_load($metaFile, []);
    $metaObj = [
        'filename' => $fname,
        'title' => trim((string) ($body['title'] ?? preg_replace('/\.svg$/i', '', $fname))),
        'usage' => trim((string) ($body['usage'] ?? 'Tryckoriginal (Vektoriserad SVG)')),
        'dimensions' => trim((string) ($body['dimensions'] ?? '100% skalbar vektor'))
    ];
    $updated = false;
    foreach ($meta as &$m) {
        if (($m['filename'] ?? '') === $fname) { $m = $metaObj; $updated = true; break; }
    }
    if (!$updated) array_unshift($meta, $metaObj);
    bsw_save($metaFile, $meta);
    echo json_encode(['ok' => true, 'filename' => $fname]);
    exit;
}

if ($act === 'delete_print_svg') {
    $fname = basename((string) ($body['filename'] ?? ''));
    $full = $dataDir . '/print-svg/' . $fname;
    if ($fname !== '' && file_exists($full)) @unlink($full);
    $metaFile = $dataDir . '/print-svg-meta.json';
    $meta = array_values(array_filter(bsw_load($metaFile, []), fn($m) => ($m['filename'] ?? '') !== $fname));
    bsw_save($metaFile, $meta);
    echo json_encode(['ok' => true]);
    exit;
}

if ($act === 'save_settings') {
    $s = $body['settings'] ?? [];
    unset($s['socialAutoShare']);
    bsw_save($settingsFile, $s);
    echo json_encode(['ok' => true, 'savedAt' => date('Y-m-d H:i')]);
    exit;
}

if ($act === 'clear_logs') {
    bsw_save($debugLogFile, []);
    echo json_encode(['ok' => true]);
    exit;
}

echo json_encode(['ok' => false, 'error' => 'Okänd åtgärd']);
