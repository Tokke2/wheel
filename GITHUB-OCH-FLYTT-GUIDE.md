# Provkör på GitHub & Flytta till Webbhotell – Backstage Wheels

Arena har ingen direkt GitHub-koppling som laddar upp åt dig automatiskt, men jag har nu **GitHub-anpassat hela projektet** (inklusive `.nojekyll`, `.gitignore`, `package.json` och relativ sökvägshantering) samt packat allt i **`backstage-wheels-github-och-webbhotell.zip`** så att du kan provköra allt på GitHub på några minuter!

---

## Viktigt tips innan du skapar repot på GitHub
- Välj gärna **Private repository** på GitHub om du laddar upp mappen `data/print-svg/` (så att era tryckoriginal i vektor-SVG inte kan laddas ner av utomstående direkt ur källkodsträdet på GitHub).
- OBS: För att använda gratis **GitHub Pages** på ett gratiskonto kräver GitHub oftast att repot är *Public* (eller *GitHub Pro* för privat Pages). Även om `data/print-svg/` inte skulle ligga på ett publikt repo har `js/admin.js` originalen inbäddade i kontrollpanelen bakom lösenordsskyddet!
- `.gitignore` är redan inställd så att lösenordsfiler, krypterade API-nycklar och kundmejl aldrig råkar checkas in i Git.

---

## Sätt 1: Snabbaste provkörningen via GitHub Pages (Statisk testkörning)
Perfekt för att testa layout, mörkt/ljust tema, mobilvy, PWA på mobilen, prisdelaren, kalendern, bildgalleriet och kontrollpanelen i webbläsaren:

1. Ladda ner **`backstage-wheels-github-och-webbhotell.zip`** härifrån arbetsytan och packa upp den på datorn.
2. Skapa ett nytt repository på [github.com/new](https://github.com/new) (t.ex. `backstage-wheels-test`) och ladda upp filerna (eller kör `git init`, `git add .`, `git commit -m "Initial"`, `git push`).
3. Gå in på **Settings → Pages** i ditt GitHub-repo:
   - Under **Build and deployment → Source**, välj **Deploy from a branch**.
   - Välj branchen **`main`** och mappen **`/ (root)`** → klicka **Save**.
4. Efter ca 1 minut ligger sidan live på:
   - **Hemsidan:** `https://<ditt-namn>.github.io/<repo-namn>/`
   - **Kontrollpanelen:** `https://<ditt-namn>.github.io/<repo-namn>/bw-admin.html` *(eller klicka 5 ggr snabbt på `2026` i sidfoten / tryck `Ctrl + Shift + K`)*

> **Bra att veta om GitHub Pages:** GitHub Pages är en rent statisk webbserver (den kör varken PHP eller Node.js). Tack vare sidans inbyggda lokala testmotor fungerar ändå lösenordsvalet, inlägg, merch-röstning, SVG-redigering och bilduppladdning fullt ut **i din egen webbläsare** under provkörningen!

---

## Sätt 2: Provkör med RIKTIG server inne på GitHub (GitHub Codespaces – 1 klick!)
Vill du testa **exakt som på riktigt webbhotell/server** (där uppladdade bilder sparas som filer på disken, lösenordet sparas i `data/admin-auth.json` och sociala medier-valvet krypteras på servern)?

1. Öppna ditt uppladdade repo på GitHub (kan vara **100 % Private**!).
2. Klicka på den gröna knappen **`<> Code`** → fliken **`Codespaces`** → **`Create codespace on main`**.
3. Skriv i terminalen som öppnas:
   ```bash
   npm start
   ```
4. Klicka på popup-rutan **Open in Browser (port 3000)** – nu körs hela fullstack-servern live i molnet!

---

## Steg 3: När du är nöjd och flyttar över till ert riktiga webbhotell
När allt känns hundra procent rätt laddar du bara upp exakt samma filer via FTP/SFTP (t.ex. FileZilla) till `public_html/` på ert webbhotell (Loopia, One.com, Oderland, Inleed m.fl. med PHP 8+):
- `api/*.php` + `.htaccess` aktiveras då helt automatiskt!
- `data/`-mappen (och era vektor-SVG-tryckoriginal) spärras med `403 Forbidden` för alla utomstående.
- Kontrollpanelen nås på `https://erdomän.se/bw-admin` (eller via `Ctrl + Shift + K` / 5 klick på årtalet i sidfoten).
