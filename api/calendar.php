<?php
/**
 * ============================================================================
 * BACKSTAGE WHEELS — KALENDER & GOOGLE CALENDAR-SYNK FÖR WEBBHOTELL (api/calendar.php)
 * ============================================================================
 */

$dataDir      = __DIR__ . '/../data';
$calendarFile = $dataDir . '/calendar.json';
$vaultFile    = $dataDir . '/social-vault.enc.json';
$vaultKeyFile = $dataDir . '/.vault.key';

function bsw_read_vault_cal($vaultFile, $vaultKeyFile) {
    if (!file_exists($vaultFile) || !file_exists($vaultKeyFile)) return [];
    $keyHex = trim((string) @file_get_contents($vaultKeyFile));
    $raw = json_decode((string) @file_get_contents($vaultFile), true);
    if (!$raw || strlen($keyHex) !== 64 || empty($raw['ciphertext'])) return [];
    $dec = @openssl_decrypt(
        hex2bin($raw['ciphertext']),
        'aes-256-gcm',
        hex2bin($keyHex),
        OPENSSL_RAW_DATA,
        hex2bin($raw['iv']),
        hex2bin($raw['tag'])
    );
    return $dec ? (json_decode($dec, true) ?: []) : [];
}

function bsw_parse_ics($icsText) {
    $unfolded = preg_replace('/\r?\n[ \t]/', '', (string) $icsText);
    $blocks = explode('BEGIN:VEVENT', $unfolded);
    array_shift($blocks);
    $out = [];
    foreach ($blocks as $idx => $blk) {
        $body = explode('END:VEVENT', $blk)[0] ?? '';
        $dtStart = $dtEnd = $summary = $loc = '';
        $uid = 'gcal-' . $idx;
        foreach (preg_split('/\r?\n/', $body) as $line) {
            $pos = strpos($line, ':');
            if ($pos === false) continue;
            $k = strtoupper(substr($line, 0, $pos));
            $v = trim(substr($line, $pos + 1));
            if (str_starts_with($k, 'DTSTART')) $dtStart = $v;
            elseif (str_starts_with($k, 'DTEND')) $dtEnd = $v;
            elseif (str_starts_with($k, 'SUMMARY')) $summary = str_replace(['\\,', '\\n'], [',', ' '], $v);
            elseif (str_starts_with($k, 'LOCATION')) $loc = str_replace('\\,', ',', $v);
            elseif ($k === 'UID') $uid = $v;
        }
        if (!preg_match('/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/', $dtStart, $ms)) continue;
        $sDate = "{$ms[1]}-{$ms[2]}-{$ms[3]}";
        $sTime = (!empty($ms[4]) && !empty($ms[5])) ? "{$ms[4]}:{$ms[5]}" : null;
        $eDate = $sDate;
        $eTime = null;
        if (preg_match('/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/', $dtEnd, $me)) {
            $eDate = "{$me[1]}-{$me[2]}-{$me[3]}";
            $eTime = (!empty($me[4]) && !empty($me[5])) ? "{$me[4]}:{$me[5]}" : null;
        }
        $isPub = (bool) preg_match('/(event|festival|träff|elmia|vallåkra|sweden rock|cruising|mässa)/iu', $summary);
        $isPart = (bool) preg_match('/(delvis|pass|kväll ledig|dag ledig)/iu', $summary);
        $out[] = [
            'id' => 'gcal-' . substr(md5($uid . $dtStart), 0, 10),
            'source' => 'google_calendar',
            'date' => $sDate,
            'endDate' => $eDate,
            'kind' => $isPub ? 'event' : 'booking',
            'availability' => $isPart ? 'partial' : 'booked',
            'timeSlot' => $sTime ? ($sTime . ($eTime ? '–' . $eTime : '') . ' (Google Kalender)') : 'Bokad i Google Kalender',
            'publicTitle' => $isPub ? $summary : 'Upptagen / Bokad körning',
            'location' => $loc
        ];
    }
    return $out;
}

$localItems = file_exists($calendarFile) ? json_decode((string) @file_get_contents($calendarFile), true) : null;
$vault      = bsw_read_vault_cal($vaultFile, $vaultKeyFile);
$gcalItems  = [];

if (!empty($vault['googleCalendarIcsUrl'])) {
    $ctx = stream_context_create(['http' => ['timeout' => 6]]);
    $icsRaw = @file_get_contents($vault['googleCalendarIcsUrl'], false, $ctx);
    if ($icsRaw) {
        $gcalItems = bsw_parse_ics($icsRaw);
    }
}

$all = array_merge(is_array($localItems) ? $localItems : [], $gcalItems);

if (($_GET['format'] ?? '') === 'ics') {
    header('Content-Type: text/calendar; charset=utf-8');
    header('Content-Disposition: inline; filename="backstage-wheels-kalender.ics"');
    $lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Backstage Wheels//Bokningskalender//SV',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Backstage Wheels – Körningar & Evenemang'
    ];
    $stamp = gmdate('Ymd\THis\Z');
    foreach ($all as $ev) {
        if (empty($ev['date'])) continue;
        $ds = str_replace('-', '', $ev['date']);
        $de = date('Ymd', strtotime(($ev['endDate'] ?? $ev['date']) . ' +1 day'));
        $lines[] = 'BEGIN:VEVENT';
        $lines[] = 'UID:' . ($ev['id'] ?? $ds) . '@backstagewheels.se';
        $lines[] = 'DTSTAMP:' . $stamp;
        $lines[] = 'DTSTART;VALUE=DATE:' . $ds;
        $lines[] = 'DTEND;VALUE=DATE:' . $de;
        $lines[] = 'SUMMARY:' . str_replace(["\r", "\n", ","], ' ', $ev['publicTitle'] ?? 'Backstage Wheels');
        $lines[] = 'END:VEVENT';
    }
    $lines[] = 'END:VCALENDAR';
    echo implode("\r\n", $lines);
    exit;
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$sanitized = array_map(fn($it) => [
    'id' => $it['id'] ?? '',
    'source' => $it['source'] ?? 'site',
    'date' => $it['date'] ?? '',
    'endDate' => $it['endDate'] ?? ($it['date'] ?? ''),
    'kind' => $it['kind'] ?? 'booking',
    'availability' => $it['availability'] ?? 'booked',
    'timeSlot' => $it['timeSlot'] ?? '',
    'publicTitle' => $it['publicTitle'] ?? 'Bokad körning',
    'location' => $it['location'] ?? '',
    'description' => $it['description'] ?? ''
], $all);

$proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host  = $_SERVER['HTTP_HOST'] ?? 'backstagewheels.se';

echo json_encode([
    'ok' => true,
    'hasCustomCalendar' => is_array($localItems),
    'googleConnected' => !empty($vault['googleCalendarIcsUrl']),
    'items' => $sanitized,
    'icsSubscribeUrl' => $proto . '://' . $host . '/api/calendar.php?format=ics'
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
