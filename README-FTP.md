# Backstage Wheels — FTP & Webbhotell-guide

Alla filer i projektet är helt portabla och fungerar direkt på vanliga webbhotell (Loopia, Oderland, One.com, Inleed m.fl. med Apache + PHP 8+) eller på en VPS med Node.js (`node server.js`).

## 1. Ladda upp via FTP
Ladda upp samtliga filer och mappar till din `public_html`-mapp:
- `index.html` (Publik webbplats – helt fri från länkar eller text om admin/crew)
- `bw-admin.html` (Gömd kontrollpanel – nås på `/bw-admin` eller `/bw-admin.html`)
- `.htaccess` (Aktiverar `/bw-admin`, skyddar `/data/` och kopplar `/api/*` till PHP)
- `css/`, `js/`, `bilder/`, `api/`, `data/`
- `manifest.webmanifest`, `sw.js`, `robots.txt`, `sitemap.xml`

Kontrollera att PHP har skrivrättigheter (`chmod 755` eller `775`) på:
- `data/`
- `bilder/` (inklusive `bilder/galleri/`, `bilder/inlagg/`, `bilder/bilar/`, `bilder/merch/`, `bilder/logo/`)

## 2. Logga in i den gömda kontrollpanelen (`/bw-admin`)
1. Gå till `https://dindomän.se/bw-admin` (rewrite via `.htaccess`) eller `/bw-admin.html`.
2. Första besöket visar **"Välj ditt lösenord"** — skapa ett eget (minst 8 tecken, saltad PBKDF2/bcrypt-hash). Därefter loggar du in med det.
3. Lösenordet roteras automatiskt var **20:e dag** (panelen påminner + visar dagar kvar) och avisering skickas till huvudansvarig (`rl@tadega.com`).

## 3. Allt du styr inifrån `/bw-admin`
- **Inlägg & Social Autopost:** Skriv inlägg, ladda upp och infoga bilder & videoklipp direkt inne i inläggstexten (`[MEDIA:url|bildtext]`), redigera befintliga inlägg, autoposta till Facebook/Instagram/TikTok och **mejla ut nya inlägg automatiskt** till alla e-postprenumeranter.
- **Utskick, Kampanjer & Merförsäljning:** Se alla e-postprenumeranter, importera tidigare offertkunder med ett klick och skicka skräddarsydda **kampanjerbjudanden och festivalförslag** (med färdiga mallar för Sweden Rock/festival, vardags-AW och julbord).
- **Merch-shop (`#merch`):** Lägg upp tröjor, hoodies, kepsar m.m. med produktbild, pris, storlekar och lagerstatus, samt hantera inkomna merch-beställningar.
- **Galleri & Evenemangsmappar:** Skapa mappar per spelning/event och ladda upp obegränsat med bilder & videor direkt från mobil eller dator.
- **Kalender & Google Kalender (.ics):** Ställ in bokade/lediga tider, kommande festivaler och tvåvägs `.ics`-synk.
- **Bilar & Paketpriser:** Uppdatera bilfakta och tim-/paketpriser (Vardag `5 500 kr/h`, Helg `7 500 kr/h`, Heldag 12 h `25 000 kr`, Sponsorevent `från 50 000 kr/dag + lunch och hotell`).
- **Kontakt, Logotyp & QR-skylt:** Uppdatera telefonnummer, e-post, logotyp och QR-kod (t.ex. för baksätes-QR i limousinen).

## 4. Distribution — endast GitHub Pages (v1.0.14)

GitHub Releases är borttagna. Publik & panel distribueras via GitHub Pages (https://tokke2.github.io/wheel/), som byggs från arbetsbranchen vid varje push. Ställ in en gång: repo → Settings → Pages → Source: "Deploy from a branch" → Branch: arbetsbranchen → Save.

Obs: Pages är statiskt — /api/* (Node/PHP) körs ej där; kontrollpanelen klarar det via sitt reservläge (lokal motor). Full backend kräver webbhotell/VPS.

## 5. Färdigt uppladdningspaket (endast HTML + PHP + JavaScript)

`backstage-wheels-webbhotell.zip` (byggs i utvecklingsmiljön) innehåller exakt det som ska upp till `public_html` — inget Node: **endast HTML, PHP och JavaScript**:

- Alla sidor (`index.html`, `bw-admin.html`, `gastfoto.html`, `kvitto.html`, `status.html`) + `css/`, `js/`, `bilder/`
- `api/` — PHP-backend: `admin.php` (panel, valv, utskick), `gallery.php` (GD-webp-cache 1920/680 px), `offert.php`, `subscribe.php`, `gastfoto.php`, `calendar.php`, `merch-order.php`, `merch-interest.php`, `reviews.php`, `public.php`
- `.htaccess` (root) — `/bw-admin`-rewrite, säkerhetsrubriker, cache, blockerar `.json/.key/.enc/server.js` via HTTP
- `data/.htaccess` — nekar ALL direkt webbåtkomst till körningsdata (PHP läser via filsystemet)
- `data/print-svg/` + `data/print-svg-meta.json` + `data/gallery-folders.json` — tryckoriginal & gallerimappar
- `sw.js` + `manifest.webmanifest` — PWA/offline fungerar också på webbhotell

**EXKLUDERAT (Node-only):** `server.js`, `package.json`, `package-lock.json`, `node_modules/`

### Krav på webbhotellet
| Krav | Varför |
|---|---|
| **PHP 8.0+** | Koden använder `str_starts_with`/`str_contains` (12 st) |
| Apache + `mod_rewrite` | För `/bw-admin` utan `.html` (standard på de flesta hotell) |
| Skrivrättighet på `data/` och `bilder/` (755/775) | JSON-lagring, galleri-cache, uppladdningar |
| PHP `mail()` aktiverat | Offertbekräftelser, dubbel opt-in, utskick |
| GD med WebP (`imagewebp`) | Galleri-webp-cache (fallback: originalbilder skickas) |

### Steg-för-steg
1. Öppna din FTP-klient (FileZilla t.ex.) och anslut till webbhotellet (FTP-detaljer finns i kontrollpanelen hos Loopia/Oderland/One.com m.fl.).
2. Zippa upp `backstage-wheels-webbhotell.zip` på din dator och dra innehållet till `public_html/` (eller motsvarande mapp).
3. Sätt skrivrättigheter: `data/` → 755 (eller 775), `bilder/galleri/` → 755.
4. Kontrollera att PHP-versionen är **8.0+** (loopia/oderland: välj i kontrollpanelen).
5. Besök `https://dindomän.se/` — sajten bör se ut som github.io-versionen.
6. Besök `https://dindomän.se/bw-admin` → välj ditt panel-lösenord → klart! Nu styr panelen den RIKTIGA sajten (offerter/prenumeranter/galleri sparas på servern).

### Dubbelkolla efter uppladdning
- `https://dindomän.se/api/public.php` → ska visa JSON (inte 403/404)
- `https://dindomän.se/data/site-settings.json` → ska vara **FORBIDDEN (403)** — så ska det vara!
- `https://dindomän.se/bw-admin` → panelsidan laddas
