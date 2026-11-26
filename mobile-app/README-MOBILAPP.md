# Backstage Wheels – Avancerad Mobilapp (PWA + Native iOS/Android)

Backstage Wheels levereras med en **avancerad mobilapp** som fungerar på två sätt:

## 1. Direktinstallation på iPhone & Android (PWA – ingen App Store-väntetid!)
- Öppna hemsidan i mobilen och gå till fliken **Mobilapp** (eller tryck på *Installera App*-knappen).
- **Android (Chrome/Samsung Internet):** Tryck på **Installera Backstage-appen** så läggs appen direkt på hemskärmen med egen ikon, helskärmsläge (utan adressfält) och offline-cache via `sw.js`.
- **iPhone (Safari):** Tryck på **Dela-ikonen** längst ned i Safari och välj **Lägg till på hemskärmen**.

### Funktioner i Mobilappen:
- **VIP-gästläge:** Snabb-offert, **Backstage Ride Planner** (välj musikstil, stopp & önskemål i baren inför åkturen), helskärms-QR för att dela `@backstagewheels` i baksätet, bläddringsbart foto- & videogalleri med svepgester och direktknappar för samtal/mail.
- **Crew / Admin-läge (när du loggat in i Admin):**
  - **Fota / Filma direkt med mobilkameran** -> optimeras automatiskt på disken -> publiceras på hemsidan och delas till Instagram, Facebook & kopplade sociala kanaler!
  - **Inkomna offerter i fickan:** Se alla bokningsförfrågningar direkt i mobilen med 1-trycks *"Ring kund"* och *"Svara via mail"*.

## 2. Bygga för Google Play / Apple App Store (Valfritt via Capacitor)
Om ni i framtiden även vill publicera appen i Google Play eller App Store ligger en färdig konfiguration i `mobile-app/capacitor.config.json` (`se.backstagewheels.app`).
