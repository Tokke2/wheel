# AGENTS.md — Regler för AI-agenter i `Tokke2/wheel` (Backstage Wheels)

> **Denna fil är den enda samlingsplatsen för alla regler.**
> När användaren skriver **`- hård regel`** eller **`regel`** i chatten ska den nya regeln
> **omedelbart** skrivas in i denna fil och committas på arbetsbranchen (R6).
> Reglerna gäller för varje app i repot och anpassas per app i §4 (en app = en egen anpassningssektion).

---

## 1. Hårda regler (gäller alltid — aldrig förhandlingsbara)

### R1 — En enda arbetsbranch
- Det finns exakt **en** arbetsbranch: den branch som sessionen/chatten är öppnad på (standardbranch).
- Arbeta **endast** emot arbetsbranchen. Arbeta **aldrig** emot `main` — inte vid kod, inte vid appuppdateringar, aldrig.
- Gäller även efter byte av chatt: nästa chatt fortsätter enligt samma princip — arbetet läggs på den aktiva arbetsbranchen, aldrig på `main`.
- `main` lämnas orörd som baseline: ingen push, ingen merge, ingen PR mot `main` — någonsin.

### R2 — Aldrig merge, aldrig PR
- Slå aldrig ihop branches (`merge`, `squash`, `rebase`-merge) och öppna aldrig pull requests.
- Allt levereras direkt som commits + push på arbetsbranchen.

### R3 — GitHub Pages alltid uppdaterad (REQ-K4) — endast Pages, inga Releases
- Distribution sker **endast via GitHub Pages** (bygger från arbetsbranchen). **Inga GitHub Releases skapas** — samtliga releaser togs bort 2026-11-26 per användarens beslut (regeln "release + Latest" är ersatt av denna).
- **Varje kodförändring** i appen ska direkt innebära:
  1. Push till arbetsbranchen → Pages byggs om **automatiskt** och publicerar det nya.
  2. Appens versions-/uppdateringsmarkör bumpas så att appen **jämför filer** via updater och hämtar det nya (i Backstage Wheels: `CACHE_NAME` i `sw.js`, t.ex. `v24 → v25`) samt `version` i `package.json`.
- Updater förändrar **aldrig** filer blint: den **jämför filer** (hash/innehåll) före utbyte.
- Req-ID för detta krav är **REQ-K4** (definition i §5).
- OBS: Pages är statisk — Node-/PHP-endpoints (`/api/*`) körs ej där; panelen hanterar detta via reservläget (lokal motor). Full backend-funktion kräver webbhotell/VPS (valfritt).

### R4 — 10-meddelanderegeln
- Efter varje **10:e chattmeddelande** skrivs en **ny förslagslista i chatten**: **10 nya förslag**, aldrig återbrukade från tidigare listor.
- Listan skrivs **alltid i chatten** — aldrig enbart i filer.

### R5 — Förslag skrivs alltid i chatten
- Förslag på funktioner (t.ex. **25 nya förslag som konkurrenter saknar och användare efterfrågar**) skrivs **alltid i chatten**, så att användaren ser dem direkt.

### R6 — Regelinfångning till GitHub
- Skriver användaren **`- hård regel`** eller **`regel`** → nya regeln läggs in i denna fil (rätt sektion), committas på arbetsbranchen och pushas samma tur.

### R7 — Inga tysta brott
- **Inga tysta beroende- eller gränssnittsbrott.** Bryt aldrig tyst ett API, en filväg, ett gränssnitt eller ett beroende.
- Om ett gränssnitt måste ändras (t.ex. `api/*.php`, `js/config.js`, `sw.js` `CORE_ASSETS`, manifest-ikonvägar, `data/print-svg`-vägar): uppdatera **alla** anropare/konsumenter i samma ändring och följ alltid R3 (release + bump).

### R8 — Testkrav innan klar
- Inget arbete är "klart" förrän minst:
  - `node server.js` startar utan fel (vid server-/API-ändring),
  - `node --check` passerar för ändrade JS-filer och `php -l` för ändrade PHP-filer (där verktyg finns),
  - publik sida (`index.html`) och admin (`bw-admin.html`) laddar utan konsolerror,
  - `sw.js`-bump och release är gjorda enligt R3,
  - loggen är kontrollerad (R10) — nya fel har inte introducerats.

### R9 — Uppdateringssäkerhet (updater)
- Uppdateringar i appen ska vara **säkrare och bättre**: backup tas innan uppdatering, **filjämförelse** före utskrift (REQ-K4), verifiering efter.
- **Om uppdateringen lyckas → backupen tas bort.** Misslyckas den → backup återställs.
- **Arkiverade loggar rensas efter 7 dagar** (automatiskt).

### R10 — Loggregler
- Det ska finnas en **komplett fellog** och en **applog** som separata loggar.
- **Felloggen innehåller alla aktiva fel.** När ett fel är åtgärdat **tas det bort** ur felloggen automatiskt.
- Användaren ska alltid kunna **rensa bort åtgärdade fel** från loggen manuellt.
- **Gårdagens loggningar arkiveras** automatiskt, och **arkivet raderas efter 7 dagar**.

### R11 — Inget terminalfönster, alltid minimerat
- Appen ska aldrig öppna ett terminalfönster — varken vid start eller vid skanning/logginsamling. Starta alltid minimerat/i bakgrunden.
- Gäller särskilt desktop-/Node-/Capacitor-kontexter (se §4 för anpassning per app).

### R12 — Minne, hastighet & energi
- Varje ändring ska inte försämra — och när möjligt förbättra — **minneshantering, hastighet och energiförbrukning**:
  - ingen onödig polling/timer (använd händelse/`IntersectionObserver`),
  - ring-buffertar och listor har hårda maxgränser,
  - lyssnare/timers städas bort, media laddas lat,
  - tungt arbete delas upp så UI:t inte blockeras.

---

## 2. Kvalitetsregler — skärpa, layout & design

### K1 — Skärpa / DPI
- Skärpan ska bli **skarpare**: tydligare text, font, bild och kolumner. **Aldrig grumligt/blurigt.**
- Anpassa sig till **olika skärmstorlekar** och enhetens DPI/PPI (`devicePixelRatio`-medveten bild- och ikonleverans, SVG där möjligt, rätt ikonstorlekar i manifest).

### K2 — Layout
- Bättre layout, bättre design, bättre ikoner — **allt ska synas**, **minimera scroll**.
- Fönster/vyer startar i **max höjd-läge** beroende på skärm; **bredden anpassas** efter skärm.
- Anpassa sig till skärm (mobil → desktop, stora som små vyporter).

### K3 — Logotyp & ikoner
- **Bättre logotyp (skarpare) som används överallt** — favicon, PWA-ikoner, apple-touch-icon, admin, tryck, QR-skylt.
- **Redigerbar vektor för tryck** ska finnas (Backstage Wheels: `data/print-svg/*.svg`) och hållas i synk med pixel-logotyperna.
- **Nya bättre ikoner** i samma stil.

### K4 — Kolumner
- Där appen har tabeller/kolumner (t.ex. adminlistor) ska användaren kunna **sortera kolumner** och **flytta dem** (kolumnordning).

### K5 — Profiler (villkorlig regel)
- Appar som **använder profiler** ska ha en **egen underflik i inställningar** för att skapa/profilhantera profiler.
- Appar som inte använder profiler — regeln vilar (se §4).

### K6 — Projekt-skaparens rulvals (villkorlig regel)
- Valet av **ruta i projekt-skaparen** som fanns i TTK-versionen ska finnas med — **gäller enbart appar som hade det** (se §4).

---

## 3. Arbetsflöde (sammanfattning)

1. Läs denna fil först — den gäller före antaganden.
2. Allt arbete sker på **arbetsbranchen** (R1–R2).
3. Ändra kod → kontrollera R7 (inga tysta brott) → kör R8 (tester).
4. Bumpa `sw.js` + `package.json` → commit på arbetsbranchen → push → **Pages byggs om automatiskt** (R3/REQ-K4). Inga Releases.
5. Ny regel från användaren (`- hård regel` / `regel`) → in i denna fil direkt (R6).
6. Var 10:e meddelande: 10 nya förslag i chatten (R4). Förslag skrivs alltid i chatten (R5).

---

## 4. App-anpassning (per app)

> Varje app i repot får en egen sektion här. När en ny app läggs till: kopiera mallen och anpassa.

### App 1 — Backstage Wheels (webb + gömd kontrollpanel + PWA + Capacitor-mobilapp)

| Regel | Anpassning i denna app |
|---|---|
| R1/R2 En branch, ingen merge/PR | Gäller fullt ut. Arbetsbranch = aktiv sessionsbranch. `main` är frusen baseline. |
| R3/REQ-K4 Pages + filjämförelse | `CACHE_NAME` i `sw.js` bumpas vid varje kodändring (t.ex. `v24 → v25`) → PWA-clients jämför och hämtar nya filer. `package.json` `version` bumpas. Pages bygger från arbetsbranchen vid varje push — **inga GitHub Releases**. |
| R9 Updater-säkerhet | PWA-uppdatering: ny cache byggs parallellt, gammal cache raderas först efter lyckad `activate`; data under `data/*.json` backas upp före skrivning och backup tas bort vid lyckad spar. Arkiverade loggar rensas efter 7 dagar. |
| R10 Loggar | `js/logger.js` (ring-buffer, max 200 lokala poster — ändra inte nedåt) + serverlogg via `api/admin.php?action=log_event`. Dela i **fellog** (bara aktiva fel; åtgärdat fel försvinner; manuell rensning av åtgärdade) och **applog**; gårdagens arkiveras, arkiv raderas efter 7 dagar. |
| R11 Inget terminalfönster | Webb/PWA: inga terminalfönster finns naturligt. Vid Node-server/VPS och framtida Capacitor-/desktop-byggen: starta utan synlig konsol (t.ex. `nodew`/`start /min` på Windows) och kör loggning/skanning i bakgrunden, alltid minimerat. |
| Aviseringar (tillägg) | **BW Bot** (egen JS-bot i panelen, `bot_feed`-endpoint + webbläsarnotiser) är **enda aviseringskanalen** — alltid gratis, ingen extern tjänst. SMS (46elks) & Telegram är **borttagna** och ska inte återinföras utan ny order. |
| R12 Minne/hastighet/energi | Behåll ring-buffer-max i `logger.js`, lazy-loading av galleri/media, inga polling-loopar mot `api/`, service workern får inte pre-cacha hela galleriet. |
| K1 Skärpa/DPI | SVG-logotyp & SVG-ikoner där möjligt, ikoner i 192/512 + maskable i manifest, `srcset`/WebP på foton, ingen CSS-skala som förblurar. |
| K2 Layout | Responsiv från små mobiler till stora skärmar; adminvyer i max höjd med minsta möjliga scroll; allt synligt utan dolda menytorngrenar. |
| K3 Logotyp | Pixel-logotyper: `bilder/app-icon-192.png`, `app-icon-512.png`, `apple-touch-icon.png`. Redigerbara tryckvektorer: `data/print-svg/*.svg` (skyddade) + publik kvitto-/tryckkopia `bilder/backstage-wheels-crest.svg` (håll i synk med originalet). Håll alla i samma stil. |
| K4 Kolumner | Adminlistor (merch-beställningar, prenumeranter, offerter, logg) ska få sortering + kolumnflytt. |
| K5 Profiler | **Vilar** — Backstage Wheels använder inte flerprofiler. Aktiveras om profiler läggs till (då: egen underflik i admin-inställningar). |
| K6 TTK projektskapare-ruta | **Gäller ej** — appen hade aldrig TTK:s projekt-skapare. |

---

## 5. REQ-K4 — definition

**REQ-K4 (Publicerings- & uppdateringskrav):**
Varje kodförändring ska omedelbart publiceras via **GitHub Pages** (bygg från arbetsbranchen — auto vid push; **inga Releases**), appens updater ska **jämföra filer** före utbyte (aldrig blint skriva över), och versionsmarkören (`sw.js` `CACHE_NAME` + `package.json` `version`) bumpas i samma ändring.

> Ändrat 2026-11-26: release-kravet ersattes av Pages-kravet på användarens begäran. Utökar användaren REQ-K4 senare uppdateras denna sektion (och R3) enligt R6.

---

## 6. Regellogg

| Datum | Händelse |
|---|---|
| 2026-11-26 | Samtliga hårda regler och kvalitetsregler (R1–R12, K1–K6, REQ-K4) insamlade från användarens chatt och kodifierade i denna fil. |
| 2026-11-26 | Användarbeslut: **endast GitHub Pages** som distribution — samtliga GitHub Releases borttagna; R3/REQ-K4 skrivits om till Pages-krav. |
| 2026-11-27 | Användarbeslut: **release v1.0.22 skapad** (webbhotell-paketet, tagg mot arbetsbranchen, Latest) — Pages fortsätter bygga vid varje push. Release-assets kan ej laddas upp från utvecklingsmiljön (uploads.github.com blockerad) → ZIP:en committed till branchen med direktnedladdningslänk i releasen. |
| 2026-11-26 | 100% JavaScript: all python/PIL/ffmpeg borttagen (sharp + npm-qrcode). Nytt: mörkt/ljust läge i panelen (#1, följer systemet), nyhetsbrev med dubbel opt-in + bekräftelsesida (#2), återkommande bokningar "⧉ +1 år" (#6), tillgänglighetsläge WCAG på web + panel (#9), snabbguide i panelen med ?-hjälp på fält (#10). |
| 2026-11-27 | Release v1.0.22 skapad per användarens begäran (Pages-only-regeln justerad: Pages bygger fortfarande vid varje push; release skapades för webbhotell-paketet). |
