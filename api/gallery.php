<?php
/**
 * ============================================================================
 * BACKSTAGE WHEELS — MAPPBASERAT GALLERI & BILDOPTIMERING (api/gallery.php)
 * ============================================================================
 * Skannar automatiskt bilder/galleri/ och samtliga evenemangsmappar inuti den!
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$galleryDir = realpath(__DIR__ . '/../bilder/galleri');
$dataDir    = __DIR__ . '/../data';
$metaFile   = $dataDir . '/gallery-folders.json';

if (!$galleryDir || !is_dir($galleryDir)) {
    echo json_encode(['mode' => 'php-empty', 'count' => 0, 'folders' => [], 'images' => []]);
    exit;
}

$cacheDir = $galleryDir . '/_cache';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}

$folderMetaList = file_exists($metaFile) ? (json_decode(@file_get_contents($metaFile), true) ?: []) : [];
$folderMetaMap  = [];
foreach ($folderMetaList as $m) {
    if (!empty($m['slug'])) $folderMetaMap[$m['slug']] = $m;
}

$subDirs = [];
foreach (scandir($galleryDir) as $entry) {
    if ($entry[0] === '.' || $entry === '_cache') continue;
    if (is_dir($galleryDir . '/' . $entry)) $subDirs[] = $entry;
}

$orderedSlugs = [];
foreach ($folderMetaList as $m) {
    if (!empty($m['slug']) && in_array($m['slug'], $subDirs, true)) $orderedSlugs[] = $m['slug'];
}
foreach ($subDirs as $sd) {
    if (!in_array($sd, $orderedSlugs, true)) $orderedSlugs[] = $sd;
}

$imgExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
$vidExts = ['mp4', 'webm', 'mov', 'm4v', 'ogv'];
$hasGd   = extension_loaded('gd');
$hasWebp = $hasGd && function_exists('imagewebp');

function bsw_pretty($raw) {
    $s = preg_replace('/\.[^.]+$/', '', (string) $raw);
    $s = preg_replace('/^\d+[-_\s]+/', '', $s);
    $s = str_replace(['-', '_'], ' ', $s);
    return ucwords(trim($s));
}

$tasks = [];
foreach ($orderedSlugs as $slug) {
    $fName = $folderMetaMap[$slug]['name'] ?? bsw_pretty($slug);
    $dirP  = $galleryDir . '/' . $slug;
    foreach (scandir($dirP) as $f) {
        if ($f[0] === '.' || str_ends_with($f, '-poster.webp')) continue;
        $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
        if (in_array($ext, $imgExts, true) || in_array($ext, $vidExts, true)) {
            $tasks[] = [
                'abs' => $dirP . '/' . $f,
                'rel' => 'bilder/galleri/' . $slug . '/' . $f,
                'file' => $f,
                'slug' => $slug,
                'folderName' => $fName,
                'ext' => $ext
            ];
        }
    }
}

foreach (scandir($galleryDir) as $f) {
    if ($f[0] === '.' || $f === '_cache' || str_ends_with($f, '-poster.webp')) continue;
    $p = $galleryDir . '/' . $f;
    if (!is_file($p)) continue;
    $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
    if (in_array($ext, $imgExts, true) || in_array($ext, $vidExts, true)) {
        $tasks[] = [
            'abs' => $p,
            'rel' => 'bilder/galleri/' . $f,
            'file' => $f,
            'slug' => 'ovrigt',
            'folderName' => 'Övriga bilder & klipp',
            'ext' => $ext
        ];
    }
}

$items = [];
$origSum = 0;
$optSum  = 0;

foreach ($tasks as $t) {
    $origBytes = @filesize($t['abs']) ?: 0;
    $uid = substr(md5($t['rel']), 0, 10);

    if (in_array($t['ext'], $vidExts, true)) {
        $poster = preg_replace('/\.[^.]+$/', '-poster.webp', $t['abs']);
        $thumbUrl = file_exists($poster)
            ? preg_replace('/\.[^.]+$/', '-poster.webp', $t['rel'])
            : 'bilder/bilar/hummer-legends-sida.jpg';
        $items[] = [
            'filename' => $t['file'],
            'src' => $t['rel'],
            'full' => $t['rel'],
            'thumb' => $thumbUrl,
            'type' => 'video',
            'folderSlug' => $t['slug'],
            'folderName' => $t['folderName'],
            'sizeKb' => (int) round($origBytes / 1024)
        ];
        continue;
    }

    $extOut = $hasWebp ? 'webp' : 'jpg';
    $thumbRel = 'bilder/galleri/_cache/thumb_' . $uid . '.' . $extOut;
    $fullRel  = 'bilder/galleri/_cache/full_' . $uid . '.' . $extOut;
    $thumbAbs = $cacheDir . '/thumb_' . $uid . '.' . $extOut;
    $fullAbs  = $cacheDir . '/full_' . $uid . '.' . $extOut;

    if ($hasGd && (!file_exists($fullAbs) || filemtime($fullAbs) < filemtime($t['abs']))) {
        $raw = @file_get_contents($t['abs']);
        $im  = $raw ? @imagecreatefromstring($raw) : false;
        if ($im) {
            $w = imagesx($im);
            $h = imagesy($im);
            foreach ([[$fullAbs, 1920, 86], [$thumbAbs, 680, 82]] as $cfg) {
                [$dest, $maxD, $q] = $cfg;
                $sc = max($w, $h) > $maxD ? ($maxD / max($w, $h)) : 1.0;
                $nw = max(1, (int) round($w * $sc));
                $nh = max(1, (int) round($h * $sc));
                $dst = imagecreatetruecolor($nw, $nh);
                imagecopyresampled($dst, $im, 0, 0, 0, 0, $nw, $nh, $w, $h);
                if ($hasWebp) @imagewebp($dst, $dest, $q);
                else { imageinterlace($dst, true); @imagejpeg($dst, $dest, $q); }
                imagedestroy($dst);
            }
            imagedestroy($im);
        }
    }

    $finalFull = file_exists($fullAbs) ? $fullRel : $t['rel'];
    $finalThumb = file_exists($thumbAbs) ? $thumbRel : $t['rel'];
    $optBytes = file_exists($fullAbs) ? (@filesize($fullAbs) ?: $origBytes) : $origBytes;
    $origSum += $origBytes;
    $optSum  += $optBytes;

    $items[] = [
        'filename' => $t['file'],
        'src' => $t['rel'],
        'full' => $finalFull,
        'thumb' => $finalThumb,
        'type' => 'image',
        'folderSlug' => $t['slug'],
        'folderName' => $t['folderName'],
        'sizeKb' => (int) round($optBytes / 1024)
    ];
}

$foldersSummary = [];
foreach ($orderedSlugs as $slug) {
    $inF = array_values(array_filter($items, fn($i) => $i['folderSlug'] === $slug));
    $m   = $folderMetaMap[$slug] ?? [];
    $foldersSummary[] = [
        'slug' => $slug,
        'name' => $m['name'] ?? bsw_pretty($slug),
        'date' => $m['date'] ?? '',
        'description' => $m['description'] ?? '',
        'count' => count($inF),
        'coverThumb' => $inF[0]['thumb'] ?? 'bilder/bilar/hummer-legends-sida.jpg'
    ];
}
$ovr = array_values(array_filter($items, fn($i) => $i['folderSlug'] === 'ovrigt'));
if (!empty($ovr)) {
    $foldersSummary[] = [
        'slug' => 'ovrigt',
        'name' => 'Övriga bilder & klipp',
        'date' => '',
        'description' => '',
        'count' => count($ovr),
        'coverThumb' => $ovr[0]['thumb']
    ];
}

$savedPct = ($origSum > 0 && $optSum < $origSum) ? (int) round((1 - $optSum / $origSum) * 100) : 0;

echo json_encode([
    'mode' => 'php-gd-auto',
    'count' => count($items),
    'savedPercent' => $savedPct,
    'folders' => $foldersSummary,
    'images' => $items
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
