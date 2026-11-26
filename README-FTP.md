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
1. Gå till `https://dindomän.se/bw-admin`
2. Första inloggning sker med engångslösenordet **`BackstageStart2026!`**, varefter du tvingas välja ett eget lösenord (minst 8 tecken).
3. Lösenordet roteras automatiskt var **20:e dag** och kopia skickas till huvudansvarig (`rl@tadega.com`).

## 3. Allt du styr inifrån `/bw-admin`
- **Inlägg & Social Autopost:** Skriv inlägg, ladda upp och infoga bilder & videoklipp direkt inne i inläggstexten (`[MEDIA:url|bildtext]`), redigera befintliga inlägg, autoposta till Facebook/Instagram/TikTok och **mejla ut nya inlägg automatiskt** till alla e-postprenumeranter.
- **Utskick, Kampanjer & Merförsäljning:** Se alla e-postprenumeranter, importera tidigare offertkunder med ett klick och skicka skräddarsydda **kampanjerbjudanden och festivalförslag** (med färdiga mallar för Sweden Rock/festival, vardags-AW och julbord).
- **Merch-shop (`#merch`):** Lägg upp tröjor, hoodies, kepsar m.m. med produktbild, pris, storlekar och lagerstatus, samt hantera inkomna merch-beställningar.
- **Galleri & Evenemangsmappar:** Skapa mappar per spelning/event och ladda upp obegränsat med bilder & videor direkt från mobil eller dator.
- **Kalender & Google Kalender (.ics):** Ställ in bokade/lediga tider, kommande festivaler och tvåvägs `.ics`-synk.
- **Bilar & Paketpriser:** Uppdatera bilfakta och tim-/paketpriser (Vardag `5 500 kr/h`, Helg `7 500 kr/h`, Heldag 12 h `25 000 kr`, Sponsorevent `från 50 000 kr/dag + lunch och hotell`).
- **Kontakt, Logotyp & QR-skylt:** Uppdatera telefonnummer, e-post, logotyp och QR-kod (t.ex. för baksätes-QR i limousinen).

## 4. Automatisk utrullning från GitHub (#1, v1.0.9)

Panelen kan nu rulla ut filerna åt dig vid varje ändring:

**Webbhotell (FTP):**
1. GitHub → repo → Settings → Secrets and variables → Actions → *New repository secret*: `FTP_HOST`, `FTP_USER`, `FTP_PASS` (valfritt `FTP_REMOTE_DIR`, t ex `/public_html`).
2. Variables-fliken → *New repository variable*: `DEPLOY_TARGET` = `ftp`.
3. Actions-fliken → "Deploy webbhotell / VPS" → **Run workflow**. Klart!
4. Vill du ha **helt automatiskt** vid varje push: redigera `.github/workflows/deploy.yml` och ta bort `#` framför `push:`-raderna.

**VPS (SSH):** samma sak men secrets `SSH_HOST`, `SSH_USER`, `SSH_KEY` (+ valfritt `SSH_PORT`, `SSH_REMOTE_DIR`) och variabeln `DEPLOY_TARGET` = `ssh`. Workflowen rsyncar filerna och startar om Node-servern.

**Obs:** körtidsdata (data/*.json, galleribilder) skrivs aldrig över av deployen — bara kod.
