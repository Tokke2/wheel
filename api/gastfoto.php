<?php
/**
 * ============================================================================
 * BACKSTAGE WHEELS — GÄSTFOTO VIA QR, WEBBHOTELL-SPEGEL (api/gastfoto.php)
 * ============================================================================
 * Modererat fotoläge: gäster laddar upp bilder från QR-sidan (/gastfoto).
 * POST  = spara bild som "pending" (granskas i kontrollpanelen)
 * GET   = lista godkända bilder (publiceras i gallerimappen gastfoton)
 *
 * Obs: Moderering görs i kontrollpanelen. På webbhotell (PHP) lagras
 * pending-bilder under data/gastfoto-pending/ och godkända under
 * bilder/galleri/gastfoton/ — samma struktur som Node-servern.
 */

header('Content-Type: application/json; charset=utf-8');

$dataDir     = __DIR__ . '/../data';
$pendingDir  = $dataDir . '/gastfoto-pending';
$metaPath    = $dataDir . '/gastfoto-meta.json';
$ratePath    = $dataDir . '/gastfoto-rate.json';
$approvedDir = __DIR__ . '/../bilder/galleri/gastfoton';
$maxBytes    = 8 * 1024 * 1024;
$dailyLimit  = 6;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $meta = [];
    if (file_exists($metaPath)) {
        $decoded = json_decode(@file_get_contents($metaPath), true);
        if (is_array($decoded)) { $meta = $decoded; }
    }
    $photos = [];
    foreach ($meta as $m) {
        if (($m['status'] ?? '') !== 'approved') { continue; }
        $file = $approvedDir . '/' . basename((string) ($m['filename'] ?? ''));
        if (!is_file($file)) { continue; }
        $photos[] = [
            'filename'   => basename((string) $m['filename']),
            'url'        => 'bilder/galleri/gastfoton/' . rawurlencode(basename((string) $m['filename'])),
            'name'       => (string) ($m['name'] ?? ''),
            'caption'    => (string) ($m['caption'] ?? ''),
            'approvedAt' => (string) ($m['approvedAt'] ?? ''),
        ];
    }
    echo json_encode(['ok' => true, 'photos' => $photos], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

// Enkel daglig begränsning per IP
$ip  = $_SERVER['REMOTE_ADDR'] ?? 'okänd';
$day = date('Y-m-d');
$rateKey = $day . '_' . md5($ip);
$rates = [];
if (file_exists($ratePath)) {
    $decoded = json_decode(@file_get_contents($ratePath), true);
    if (is_array($decoded)) { $rates = $decoded; }
}
foreach (array_keys($rates) as $k) {
    if (($rates[$k]['day'] ?? '') !== $day) { unset($rates[$k]); } // städa gamla dagar
}
$count = (int) ($rates[$rateKey]['count'] ?? 0);
if ($count >= $dailyLimit) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'Daglig uppladdningsgräns nådd. Försök igen imorgon.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
$dataUrl = (string) ($data['imageDataUrl'] ?? '');
if (!preg_match('#^data:image/(jpeg|jpg|png|webp);base64,#', $dataUrl)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Ogiltig bild (JPG/PNG/WebP).'], JSON_UNESCAPED_UNICODE);
    exit;
}
$bin = @base64_decode(substr($dataUrl, strpos($dataUrl, ',') + 1), true);
if ($bin === false || strlen($bin) > $maxBytes || strlen($bin) < 128) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Ogiltig eller för stor bild (max 8 MB).'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Magi-byte-kontroll (aldrig filer som låtsas vara bilder)
$ext = '';
$head = substr($bin, 0, 12);
if (substr($head, 0, 3) === "\xFF\xD8\xFF") { $ext = 'jpg'; }
elseif (substr($head, 0, 4) === "\x89PNG") { $ext = 'png'; }
elseif (substr($head, 0, 4) === 'RIFF' && substr($head, 8, 4) === 'WEBP') { $ext = 'webp'; }
if ($ext === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Ogiltigt bildformat.'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!is_dir($pendingDir)) { @mkdir($pendingDir, 0755, true); }
if (!is_dir($dataDir)) { @mkdir($dataDir, 0755, true); }

$id = 'gf-' . time() . '-' . bin2hex(random_bytes(3));
$filename = $id . '.' . $ext;
file_put_contents($pendingDir . '/' . $filename, $bin);

$meta = [];
if (file_exists($metaPath)) {
    $decoded = json_decode(@file_get_contents($metaPath), true);
    if (is_array($decoded)) { $meta = $decoded; }
}
array_unshift($meta, [
    'id'           => $id,
    'filename'     => $filename,
    'status'       => 'pending',
    'name'         => mb_substr(trim((string) ($data['name'] ?? '')), 0, 60),
    'caption'      => mb_substr(trim((string) ($data['caption'] ?? '')), 0, 140),
    'receivedAt'   => date('Y-m-d H:i'),
    'receivedAtIso'=> date('c'),
    'bytes'        => strlen($bin),
]);
$meta = array_slice($meta, 0, 500);
@file_put_contents($metaPath, json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

$rates[$rateKey] = ['day' => $day, 'count' => $count + 1];
@file_put_contents($ratePath, json_encode($rates, JSON_UNESCAPED_UNICODE));

echo json_encode(['ok' => true, 'id' => $id, 'message' => 'Tack! Bilden granskas innan publicering.'], JSON_UNESCAPED_UNICODE);
