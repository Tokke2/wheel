<?php
/**
 * ============================================================================
 * BACKSTAGE WHEELS — OFFERTMOTTAGARE FÖR WEBBHOTELL (api/offert.php)
 * ============================================================================
 * Läser automatiskt den eller de e-postadresser som ställts in i Adminpanelen
 * (data/site-settings.json), sparar i offert-loggen för Admin/Mobilapp och
 * skickar mail till rätt mottagare.
 */

header('Content-Type: application/json; charset=utf-8');

$defaultEmail = 'bokning@backstagewheels.se';
$recipients   = [$defaultEmail];
$dataDir      = __DIR__ . '/../data';
$settingsPath = $dataDir . '/site-settings.json';
$quotesPath   = $dataDir . '/offert-logg.json';

if (file_exists($settingsPath)) {
    $cfg = json_decode(@file_get_contents($settingsPath), true);
    if (!empty($cfg['contactEmail'])) {
        $parts = preg_split('/[\/,;\s]+/', (string) $cfg['contactEmail']);
        $valid = [];
        foreach ($parts as $part) {
            $clean = trim($part, " \t\n\r\0\x0B<>\"'");
            if ($clean !== '' && filter_var($clean, FILTER_VALIDATE_EMAIL)) {
                $valid[] = $clean;
            }
        }
        if (!empty($valid)) {
            $recipients = array_values(array_unique($valid));
        }
    }
}

$toEmail = implode(', ', $recipients);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data || empty($data['namn']) || empty($data['epost'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Obligatoriska fält saknas']);
    exit;
}

if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

// Spara i skyddad offertlogg så Admin & Mobilappens Crew-läge kan ringa/maila kunden med 1 tryck
$existing = [];
if (file_exists($quotesPath)) {
    $decoded = json_decode(@file_get_contents($quotesPath), true);
    if (is_array($decoded)) {
        $existing = $decoded;
    }
}
array_unshift($existing, array_merge(['receivedAt' => date('Y-m-d H:i')], $data));
$existing = array_slice($existing, 0, 200);
@file_put_contents($quotesPath, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

$subject = 'Ny offertförfrågan – Backstage Wheels (' . ($data['datum'] ?? '') . ')';
$body = "NY OFFERTFÖRFRÅGAN VIA HEMSIDAN\n"
      . "====================================\n"
      . "Fordon: " . ($data['bil'] ?? '-') . "\n"
      . "Typ av körning: " . ($data['eventTyp'] ?? '-') . "\n"
      . "Datum & starttid: " . ($data['datum'] ?? '-') . " kl. " . ($data['starttid'] ?? '-') . "\n"
      . "Upplägg/körtid: " . ($data['kortid'] ?? '-') . "\n"
      . "Passagerare: " . ($data['passagerare'] ?? '-') . " st\n"
      . "Från: " . ($data['fran'] ?? '-') . "\n"
      . "Till: " . ($data['till'] ?? '-') . "\n\n"
      . "KONTAKT\n"
      . "Namn: " . ($data['namn'] ?? '-') . "\n"
      . "Telefon: " . ($data['telefon'] ?? '-') . "\n"
      . "E-post: " . ($data['epost'] ?? '-') . "\n\n"
      . "ÖVRIGT:\n" . ($data['meddelande'] ?? '-') . "\n";

$headers = "From: noreply@" . ($_SERVER['HTTP_HOST'] ?? 'backstagewheels.se') . "\r\n"
         . "Reply-To: " . filter_var($data['epost'], FILTER_SANITIZE_EMAIL) . "\r\n"
         . "Content-Type: text/plain; charset=UTF-8\r\n";

$sent = @mail($toEmail, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);

echo json_encode(['ok' => true, 'mailSent' => (bool) $sent, 'recipient' => $toEmail]);
