/**
 * ============================================================================
 * BACKSTAGE WHEELS — GÖMD KONTROLLPANEL (/bw-admin -> js/admin.js)
 * ============================================================================
 * Komplett kontrollpanel för allt innehåll på hemsidan:
 *  1. Inlägg & Infoga Bilder/Video (inkl. auto-delning & nyhetsbrev)
 *  2. Utskick, Prenumeranter & Kampanjmallar (inkl. Festival, Sponsorevent & Oktoberfest)
 *  3. Merch ("Kommer snart" / Live-shop, kundintresse & Redigerbara Vektor-SVG tryckoriginal)
 *  4. Bilduppladdning & Evenemangsmappar (automatisk WebP-optimering)
 *  5. Kalender & Tvåvägs Google Kalender-synk (.ics)
 *  6. Bilar, Priser & Bokningspaket (inkl. punktlistor, Sponsorevent & Oktoberfest)
 *  7. Krypterat Sociala Medier-valv (AES-256-GCM)
 *  8. Kontaktuppgifter, Logotyp, QR & Inkomna Offerter
 *  9. Säkerhet (20-dagars lösenordsregel med avisering till rl@tadega.com) & Systemlogg
 */

(function () {
  "use strict";

  const MASTER_EMAIL = "rl@tadega.com";
  const EXPIRY_DAYS = 20;
  const TOKEN_STORAGE_KEY = "bsw_wp_admin_token_v7";
  const VIDEO_REGEX = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i;

  let memoryTokenFallback = "";

  function safeGetToken() {
    try {
      const s = window.sessionStorage && sessionStorage.getItem(TOKEN_STORAGE_KEY);
      if (s) return s;
    } catch (_e) {}
    try {
      const l = window.localStorage && localStorage.getItem(TOKEN_STORAGE_KEY);
      if (l) return l;
    } catch (_e) {}
    return memoryTokenFallback || "";
  }

  function safeSetToken(tok) {
    memoryTokenFallback = String(tok || "");
    try {
      if (window.sessionStorage) sessionStorage.setItem(TOKEN_STORAGE_KEY, memoryTokenFallback);
    } catch (_e) {}
    try {
      if (window.localStorage) localStorage.setItem(TOKEN_STORAGE_KEY, memoryTokenFallback);
    } catch (_e) {}
  }

  function safeClearToken() {
    memoryTokenFallback = "";
    try {
      if (window.sessionStorage) sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (_e) {}
    try {
      if (window.localStorage) localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (_e) {}
  }

  const CAMPAIGN_TEMPLATES = {
    festival: {
      subject: "🔥 Boka Hummer H2 Limousinen till Sommarens Festivaler!",
      title: "VIP-körning & Festivalupplägg med Legends of Rock",
      offerPrice: "Heldag 12 h: 25 000 kr · Sponsorevent från 50 000 kr/dag + lunch, hotell & drivmedel",
      text: "Hej!\n\nNu släpper vi tiderna inför sommarens stora festivaler och bilträffar (bl.a. Sweden Rock, Classic Car Week i Rättvik och Dalhalla)!\n\nVill ni anlända med upp till 16 vänner (från under 490 kr/pers vid full bil!), boka en hel 12-timmarsdag eller profilera ert företag med Sveriges mest fotograferade 10-meters Hummer H2 Limousine?\n\nKlicka på knappen nedan och säkra ert datum först!",
      ctaLabel: "Se lediga datum & boka VIP-körning →",
      ctaHash: "#offert"
    },
    vardag: {
      subject: "⚡ Förgyll veckan: Vardags-VIP & Företags-AW i 10m Hummer Limo!",
      title: "Gör er nästa AW, kundmiddag eller födelsedag oförglömlig!",
      offerPrice: "Vardagspris (Mån–Tors): 5 500 kr / timme inkl. chaufför (ca 344 kr/pers vid 16 pers!)",
      text: "Hej!\n\nPlanerar ni en företags-AW, kundmiddag, musikvideo eller födelsedagsöverraskning måndag–torsdag?\n\nKliv in upp till 16 personer i vår 10-meters Hummer H2 'Legends of Rock' med egen Spotify-lista i vårt tunga konsertljudsystem, skinnsoffor och upplyst bar.\n\nKolla lediga datum i kalendern och boka ert kvällspass direkt!",
      ctaLabel: "Kolla kalendern & boka vardagspass →",
      ctaHash: "#kalender"
    },
    heldag: {
      subject: "🎸 Heldagspaket (12 timmar) eller Kvällens 3 Pass i Hårdrocks-Hummern!",
      title: "Hyr hela ekipaget i 12 timmar eller välj ert drömpass på helgen!",
      offerPrice: "Heldag (12 h): 25 000 kr · Helgpass: 7 500 kr / timme (ca 469 kr/pers vid 16 pers!)",
      text: "Hej!\n\nFör bröllop, bal, studentutskott, svensexor och möhippor erbjuder vi både våra populära kvällspass och vårt Heldagspaket där ni har hela 10-meters Hummer H2 Limousinen med egen chaufför i 12 timmar för 25 000 kr!\n\nHör av er så skräddarsyr vi rutten efter era önskemål.",
      ctaLabel: "Begär offert på Heldag / Kvällspass →",
      ctaHash: "#offert"
    },
    sponsor: {
      subject: "🚀 Sponsorevent & Varumärkesdag med Backstage Wheels!",
      title: "Låt 10 meter motivlackad Hummer H2 dra publik till er monter eller lansering",
      offerPrice: "Från 50 000 kr / dag + lunch och hotell och drivmedel",
      text: "Hej!\n\nSöker ert företag Sveriges mest fotograferade blickfång vid företagsevent, lanseringar, mässor, invigningar eller festivaler?\n\nVår motivlackade Hummer H2 'Legends of Rock' (lackerad av Dr H Custom) kan bokas för enstaka dagar eller hela festivalveckor inklusive VIP-visningar och kundåkturer!",
      ctaLabel: "Kontakta oss för Sponsorevent →",
      ctaHash: "#offert"
    },
    oktoberfest: {
      subject: "🍺 VIP-Resa Till & Från Oktoberfest i 10m Hårdrockslimousine!",
      title: "Oktoberfest – Resa Till & Från med hela gänget!",
      offerPrice: "20 000 kr / person (minst 16 st · 18-årsgräns)",
      text: "Hej!\n\nUpplev den ultimata VIP-resan till och från Oktoberfest i vår 10-meters Hummer H2 'Legends of Rock'!\n\n• Pris: 20 000 kr per person (resa till och från Oktoberfest)\n• Minst 16 personer i sällskapet\n• Lunch under resan ingår under färd (ej på plats) · Boende/logi ingår ej\n• Åldersgräns: 18 år (observera att vi ej serverar/bjuder på alkoholhaltiga drycker)\n\nSkicka er intresse-/bokningsförfrågan redan idag!",
      ctaLabel: "Boka Oktoberfest-resan →",
      ctaHash: "#offert"
    }
  };

  const state = {
    backendEndpoint: null,
    authenticated: false,
    token: safeGetToken(),
    passwordStatus: {
      initialized: false,
      expired: false,
      daysLeft: EXPIRY_DAYS,
      changedAtIso: null,
      expiresAtIso: null
    },
    pendingExpiredPassword: "",
    forceChangeMode: false,
    lastMailNotice: null,
    mailLog: [],
    settings: JSON.parse(JSON.stringify(window.BACKSTAGE_DEFAULT_SETTINGS || {})),
    posts: [],
    editingPostId: null,
    postDraftMedia: [],
    showGalleryPickerForPost: false,
    merch: [],
    merchShopMode: "coming_soon",
    merchInterests: [],
    merchInterestCounts: {},
    printSvgs: [],
    editingSvgFilename: null,
    editingMerchIdx: -1,
    merchDraftImage: "",
    merchOrders: [],
    subscribers: [],
    campaigns: [],
    campaignDraftMedia: "",
    calendar: [],
    googleItems: [],
    folders: [],
    galleryImages: [],
    vault: {},
    quotes: [],
    reviews: [],
    gastfoto: { pending: [], approved: [], dailyUploadsToday: 0 },
    debugLogs: [],
    health: {},
    icsSubscribeUrl: "/api/calendar.ics",
    logFilter: "ALL",
    logSearch: "",
    activeSubTab: "posts",
    toast: null
  };

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isVideo(src, explicitType) {
    if (explicitType === "video") return true;
    if (explicitType === "image") return false;
    return VIDEO_REGEX.test(String(src || ""));
  }

  function telHref(rawPhone) {
    let s = String(rawPhone || "").split(/[\/,;]+/)[0].trim();
    s = s.replace(/^(\+|00)(\d{1,3})[\s.-]*\(0\)/, "$1$2").replace(/^00(\d)/, "+$1");
    const hasPlus = s.startsWith("+");
    const digits = s.replace(/\D/g, "");
    return "tel:" + (digits ? (hasPlus ? "+" + digits : digits) : "0701234567");
  }

  function mailtoHref(rawEmail, subject, body) {
    const addrs = String(rawEmail || "")
      .split(/[\/,;\s]+/)
      .map((p) => p.trim())
      .filter((p) => p.includes("@"));
    const target = addrs.length ? addrs.join(",") : "bokning@backstagewheels.se";
    const params = [];
    if (subject) params.push("subject=" + encodeURIComponent(subject));
    if (body) params.push("body=" + encodeURIComponent(body));
    return "mailto:" + target + (params.length ? "?" + params.join("&") : "");
  }

  function showToast(msg, isError = false) {
    state.toast = { msg, isError };
    const el = document.getElementById("bsw-admin-toast-slot");
    if (el) {
      el.innerHTML = `<div class="bsw-adm-toast ${isError ? "is-error" : "is-ok"}" role="alert">${esc(msg)}</div>`;
      try {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (_e) {}
    }
  }

  function bindPasswordToggleButtons(container) {
    (container || document).querySelectorAll("[data-toggle-pw]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-toggle-pw");
        const inp = document.getElementById(targetId);
        if (!inp) return;
        const nextType = inp.type === "password" ? "text" : "password";
        inp.type = nextType;
        btn.textContent = nextType === "password" ? "👁️ Visa" : "🙈 Dölj";
      });
    });
  }

  // Klientoptimering i WebP utan synlig kvalitetsförlust innan uppladdning
  function optimizeImageFile(file, maxDim = 1920, quality = 0.86) {
    return new Promise((resolve) => {
      if (!file.type || !file.type.startsWith("image/") || file.type.includes("svg") || file.type.includes("gif")) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > maxDim || h > maxDim) {
            const r = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * r);
            h = Math.round(h * r);
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              if (!blob) return resolve(file);
              const cleanBase = file.name.replace(/\.[^.]+$/, "");
              resolve(new File([blob], `${cleanBase}.webp`, { type: "image/webp" }));
            },
            "image/webp",
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = ev.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  }

  const LOCAL_AUTH_KEY = "bsw_static_auth_v7";
  const LOCAL_STORE_KEY = "bsw_static_store_v7";
  let memoryAuthFallback = null;
  let memoryStoreFallback = null;

  const DEFAULT_PRINT_SVGS = [
    {
      filename: "backstage-wheels-crest-v2.svg",
      title: "Sköld-emblem v2 \"Legends of Rock\" (Snittig & Rockig)",
      usage: "Huvudlogo/tryck: T-shirt, hoodie, keps, dekal, kvitto, affisch",
      dimensions: "300 × 330 mm (100% skalbar vektor)",
      updatedAt: "2026-11-26 11:53",
      svgContent: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1100" width="300mm" height="330mm">
  <title>Backstage Wheels – Sköld-emblem v2 "Legends of Rock" (Redigerbar Vektor-SVG)</title>
  <desc>Snittig, rockig andra version av sköld-emblemet: vinklad sköld med skarpa vingfjädrar, tvillingblixtar, tung typografi och banderoll. Skalbar vektor med separata lager för tryckeri, screentryck, DTG och dekalskärning.</desc>

  <g id="lager-kicker">
    <text x="500" y="120" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="10" fill="#FFFFFF">SVERIGES MÄKTIGASTE LIMMO</text>
  </g>

  <g id="lager-vingar">
    <polygon points="195,230 55,170 150,290" fill="#B91C1C"/>
    <polygon points="190,300 35,270 155,370" fill="#F97316"/>
    <polygon points="185,370 55,400 160,450" fill="#FACC15"/>
    <polygon points="180,440 90,520 165,520" fill="#B91C1C"/>
    <polygon points="805,230 945,170 850,290" fill="#B91C1C"/>
    <polygon points="810,300 965,270 845,370" fill="#F97316"/>
    <polygon points="815,370 945,400 840,450" fill="#FACC15"/>
    <polygon points="820,440 910,520 835,520" fill="#B91C1C"/>
  </g>

  <g id="lager-skold">
    <polygon points="200,190 800,190 870,330 500,930 130,330" fill="#0B0C10" stroke="#B91C1C" stroke-width="18"/>
    <polygon points="230,225 770,225 830,340 500,880 170,340" fill="none" stroke="#F97316" stroke-width="6"/>
  </g>

  <g id="lager-tvillingblixtar">
    <polygon points="330,230 255,430 310,430 250,640 385,400 320,400 375,230" fill="#FACC15"/>
    <polygon points="670,230 745,430 690,430 750,640 615,400 680,400 625,230" fill="#FACC15"/>
  </g>

  <g id="lager-typografi">
    <text x="500" y="360" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="105" font-weight="800" letter-spacing="6" fill="#FFFFFF">BACKSTAGE</text>
    <text x="500" y="470" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="105" font-weight="800" letter-spacing="14" fill="#F97316">WHEELS</text>
  </g>

  <g id="lager-banderoll">
    <polygon points="180,690 820,690 790,805 210,805" fill="#B91C1C" stroke="#FACC15" stroke-width="6"/>
    <text x="500" y="765" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="54" font-weight="800" letter-spacing="8" fill="#FFFFFF">LEGENDS OF ROCK</text>
  </g>

  <g id="lager-bottentext">
    <text x="500" y="860" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="700" letter-spacing="4" fill="#FACC15">VIP ROCK LIMO · 10 M HUMMER H2</text>
  </g>
</svg>`
    },
    {
      filename: "backstage-wheels-front-crest.svg",
      title: "Bröst- & Frontemblem (Sköld + Vingar + Blixt)",
      usage: "T-shirt bröst/mage, Hoodie front, Jackmärke",
      dimensions: "300 × 300 mm (100% skalbar vektor)",
      updatedAt: "2026-11-26 11:53",
      svgContent: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="300mm" height="300mm">
  <title>Backstage Wheels – Bröst-/Fronttryck (Redigerbar Vektor-SVG)</title>
  <desc>Tryckoriginal i skalbar vektor med separata lager för screenprint, DTG, transfer och brodyr.</desc>

  <!-- LAGER 1: YTTRE SKÖLD & VINGAR -->
  <g id="lager-ram-och-vingar" fill="none" stroke="#F59E0B" stroke-width="14" stroke-linejoin="round">
    <polygon points="500,70 860,210 810,690 500,920 190,690 140,210" fill="#11131B" stroke="#F97316" stroke-width="18"/>
    <polygon points="500,105 822,232 778,668 500,880 222,668 178,232" fill="none" stroke="#F59E0B" stroke-width="6"/>
    <!-- Vänster vinge -->
    <path d="M140,290 L35,250 L75,340 L25,355 L85,425 L48,450 L158,495" fill="#F97316" stroke="#DC2626" stroke-width="8"/>
    <!-- Höger vinge -->
    <path d="M860,290 L965,250 L925,340 L975,355 L915,425 L952,450 L842,495" fill="#F97316" stroke="#DC2626" stroke-width="8"/>
  </g>

  <!-- LAGER 2: CENTRUMBLIXT & HJUL -->
  <g id="lager-blixt-och-hjul">
    <circle cx="500" cy="430" r="165" fill="none" stroke="#38BDF8" stroke-width="12" stroke-dasharray="28 14"/>
    <circle cx="500" cy="430" r="132" fill="#181B26" stroke="#F8FAFC" stroke-width="8"/>
    <polygon points="535,235 395,445 495,445 462,635 615,405 512,405" fill="#FACC15" stroke="#DC2626" stroke-width="10" stroke-linejoin="round"/>
  </g>

  <!-- LAGER 3: BANDEROLL & REDIGERBAR TEXT -->
  <g id="lager-huvudtext">
    <rect x="110" y="610" width="780" height="118" rx="14" fill="#DC2626" stroke="#FACC15" stroke-width="10"/>
    <text x="500" y="692" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="78" font-weight="800" letter-spacing="5" fill="#FFFFFF">BACKSTAGE WHEELS</text>
  </g>

  <g id="lager-undertext">
    <text x="500" y="790" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="42" font-weight="700" letter-spacing="8" fill="#FACC15">LEGENDS OF ROCK · VIP LIMO</text>
    <text x="500" y="842" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" letter-spacing="6" fill="#E2E8F0">10 METER HUMMER H2 · SWEDEN</text>
  </g>
</svg>`
    },
    {
      filename: "backstage-wheels-back-tour-print.svg",
      title: "Stort Ryggtryck – 10M Limo & Turnéstäder",
      usage: "T-shirt helrygg, Zip-Hoodie rygg, Poster",
      dimensions: "320 × 373 mm (100% skalbar vektor)",
      updatedAt: "2026-11-26 11:53",
      svgContent: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1400" width="320mm" height="373mm">
  <title>Backstage Wheels – Stort Ryggtryck T-shirt &amp; Hoodie (Redigerbar Vektor-SVG)</title>
  <desc>Vektoriserat ryggtryck med 10-meters limousin-silhuett, blixtar och redigerbara rubriker.</desc>

  <!-- LAGER 1: DEKORBLIXTAR -->
  <g id="lager-blixtar" fill="#F97316" stroke="#FACC15" stroke-width="6">
    <polygon points="230,110 130,300 215,300 165,470 320,255 228,255"/>
    <polygon points="970,110 870,300 955,300 905,470 1060,255 968,255"/>
  </g>

  <!-- LAGER 2: TOPPRUBRIK -->
  <g id="lager-topprubrik">
    <text x="600" y="215" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="112" font-weight="800" letter-spacing="8" fill="#FFFFFF" stroke="#DC2626" stroke-width="4">BACKSTAGE</text>
    <text x="600" y="335" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="118" font-weight="800" letter-spacing="12" fill="#F97316">WHEELS</text>
    <text x="600" y="405" text-anchor="middle" font-family="Oswald, Impact, sans-serif" font-size="40" font-weight="700" letter-spacing="10" fill="#38BDF8">10 METER REN HÅRDROCK PÅ VÄGEN</text>
  </g>

  <!-- LAGER 3: VEKTORSILHUETT 10M HUMMER H2 STRETCH LIMO -->
  <g id="lager-limo-vektor" transform="translate(80, 490)">
    <rect x="0" y="185" width="1040" height="12" rx="6" fill="#DC2626"/>
    <!-- Kaross -->
    <path d="M45,155 L45,95 L165,90 L225,35 L865,35 L915,85 L995,92 L995,155 Z" fill="#141722" stroke="#F8FAFC" stroke-width="10" stroke-linejoin="round"/>
    <!-- Tonade VIP-rutor -->
    <rect x="245" y="52" width="175" height="42" rx="4" fill="#38BDF8" opacity="0.85"/>
    <rect x="438" y="52" width="195" height="42" rx="4" fill="#38BDF8" opacity="0.85"/>
    <rect x="651" y="52" width="195" height="42" rx="4" fill="#38BDF8" opacity="0.85"/>
    <!-- Eldlinje längs sidan -->
    <path d="M110,122 Q320,96 540,122 T955,118" fill="none" stroke="#F97316" stroke-width="10"/>
    <!-- Hjul -->
    <circle cx="155" cy="160" r="44" fill="#0B0D13" stroke="#FACC15" stroke-width="10"/>
    <circle cx="155" cy="160" r="18" fill="#F97316"/>
    <circle cx="885" cy="160" r="44" fill="#0B0D13" stroke="#FACC15" stroke-width="10"/>
    <circle cx="885" cy="160" r="18" fill="#F97316"/>
  </g>

  <!-- LAGER 4: TURNÉ / STÄDER / BUDKSAP (REDIGERBAR TEXT) -->
  <g id="lager-turnetext">
    <line x1="180" y1="760" x2="1020" y2="760" stroke="#F59E0B" stroke-width="6"/>
    <text x="600" y="845" text-anchor="middle" font-family="Oswald, Impact, sans-serif" font-size="62" font-weight="700" letter-spacing="6" fill="#FACC15">LEGENDS OF ROCK EDITION</text>
    <text x="600" y="930" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" letter-spacing="5" fill="#F8FAFC">DALARNA · STOCKHOLM · UPPSALA · VÄSTERÅS · ÖREBRO · GÄVLE</text>
    <text x="600" y="995" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" letter-spacing="4" fill="#CBD5E1">FESTIVALER · VIP-ENTRÉ · BRÖLLOP · BAL · MUSIKVIDEOR</text>
    <line x1="180" y1="1045" x2="1020" y2="1045" stroke="#F59E0B" stroke-width="6"/>
    <text x="600" y="1145" text-anchor="middle" font-family="Oswald, Impact, sans-serif" font-size="54" font-weight="700" letter-spacing="8" fill="#F97316">@BACKSTAGEWHEELS</text>
    <text x="600" y="1215" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="6" fill="#94A3B8">BACKSTAGEWHEELS.SE</text>
  </g>
</svg>`
    },
    {
      filename: "backstage-wheels-cap-embroidery.svg",
      title: "Keps- & Brodyremblem (Kraftiga linjer)",
      usage: "Truckerkeps, Beanie-mössa, Skuren vinyldekal",
      dimensions: "140 × 73,5 mm (100% skalbar vektor)",
      updatedAt: "2026-11-26 11:53",
      svgContent: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420" width="140mm" height="73.5mm">
  <title>Backstage Wheels – Kepsbrodyr &amp; Vinylskärning (Ren Vektor-SVG)</title>
  <desc>Förenklad distinkt vektor med kraftiga konturer anpassad för 3D-puffbrodyr på keps, mössa och skuren vinyl.</desc>

  <g id="lager-brodyr-ram">
    <rect x="24" y="24" width="752" height="372" rx="44" fill="none" stroke="#FACC15" stroke-width="18"/>
    <rect x="48" y="48" width="704" height="324" rx="30" fill="none" stroke="#F97316" stroke-width="6"/>
  </g>

  <g id="lager-brodyr-blixt">
    <polygon points="155,78 88,215 148,215 122,342 222,188 158,188" fill="#F97316"/>
    <polygon points="645,78 578,215 638,215 612,342 712,188 648,188" fill="#F97316"/>
  </g>

  <g id="lager-brodyr-text">
    <text x="400" y="205" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="86" font-weight="800" letter-spacing="4" fill="#FFFFFF">BACKSTAGE</text>
    <text x="400" y="295" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="76" font-weight="800" letter-spacing="10" fill="#FACC15">WHEELS</text>
    <text x="400" y="346" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="7" fill="#FFFFFF">VIP ROCK LIMO</text>
  </g>
</svg>`
    },
    {
      filename: "backstage-wheels-qr-seat-sign.svg",
      title: "Baksätes-QR Skyltoriginal",
      usage: "Akrylskylt eller dekal vid baren i limousinen",
      dimensions: "140 × 180 mm (100% skalbar vektor)",
      updatedAt: "2026-11-26 11:53",
      svgContent: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 900" width="140mm" height="180mm">
  <title>Backstage Wheels – Baksätes-QR Skylt / Dekal (Redigerbar Vektor-SVG)</title>
  <desc>Tryckfärdig vektorskylt för limousinens baksäte/bar. Placera QR-koden i rutan i mitten.</desc>

  <g id="lager-skylt-bakgrund">
    <rect x="20" y="20" width="660" height="860" rx="36" fill="#0D0F17" stroke="#F97316" stroke-width="14"/>
    <rect x="42" y="42" width="616" height="816" rx="24" fill="none" stroke="#FACC15" stroke-width="4"/>
  </g>

  <g id="lager-skylt-rubrik">
    <text x="350" y="130" text-anchor="middle" font-family="Oswald, Impact, sans-serif" font-size="58" font-weight="800" letter-spacing="4" fill="#FFFFFF">BACKSTAGE WHEELS</text>
    <text x="350" y="182" text-anchor="middle" font-family="Oswald, Impact, sans-serif" font-size="30" font-weight="700" letter-spacing="6" fill="#FACC15">TAGGA KVÄLLENS ÅK!</text>
  </g>

  <g id="lager-qr-ram">
    <rect x="150" y="225" width="400" height="400" rx="22" fill="#FFFFFF" stroke="#F97316" stroke-width="8"/>
    <text x="350" y="435" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#0D0F17">[ PLACERA QR-KOD HÄR ]</text>
  </g>

  <g id="lager-skylt-fot">
    <text x="350" y="705" text-anchor="middle" font-family="Oswald, Impact, sans-serif" font-size="42" font-weight="700" letter-spacing="3" fill="#38BDF8">@BACKSTAGEWHEELS</text>
    <text x="350" y="758" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#E2E8F0">Skanna med mobilkameran för Instagram,</text>
    <text x="350" y="794" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#E2E8F0">kommande Merch &amp; nya VIP-bokningar!</text>
  </g>
</svg>`
    },
    {
      filename: "backstage-wheels-legends-tour-tee.svg",
      title: "\"Legends Tour\" T-Shirt Print (Turnéaffisch-stil)",
      usage: "Legends Tour T-shirt front/mage, Poster, Rollup",
      dimensions: "300 × 383 mm (100% skalbar vektor)",
      updatedAt: "2026-11-26 11:53",
      svgContent: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1150" width="300mm" height="383mm">
  <title>Backstage Wheels – "Legends Tour" T-Shirt Print (Redigerbar Vektor-SVG)</title>
  <desc>Tryckoriginal för "Legends Tour" T-shirten: turnéaffisch-stil med sköld, blixtar, Hummer-siluett och turnéstäder. Skalbar vektor med separata lager för screenprint och DTG.</desc>

  <g id="lager-bakgrund-tourbord">
    <rect x="60" y="60" width="780" height="1030" rx="28" fill="none" stroke="#B91C1C" stroke-width="16"/>
    <rect x="88" y="88" width="724" height="974" rx="16" fill="none" stroke="#F97316" stroke-width="5"/>
  </g>

  <g id="lager-titel-bage">
    <text x="450" y="215" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="96" font-weight="800" letter-spacing="6" fill="#FFFFFF">BACKSTAGE</text>
    <text x="450" y="315" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="88" font-weight="800" letter-spacing="16" fill="#F97316">WHEELS</text>
    <rect x="250" y="345" width="400" height="8" fill="#FACC15"/>
  </g>

  <g id="lager-legends-tour">
    <text x="450" y="475" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="118" font-weight="800" letter-spacing="10" fill="#FACC15">LEGENDS</text>
    <text x="450" y="590" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="118" font-weight="800" letter-spacing="24" fill="#FFFFFF">TOUR</text>
  </g>

  <g id="lager-hummer-siluett">
    <g fill="#FFFFFF" stroke="none">
      <rect x="205" y="700" width="490" height="118" rx="20"/>
      <rect x="235" y="668" width="150" height="48" rx="10"/>
      <rect x="430" y="668" width="150" height="48" rx="10"/>
      <rect x="205" y="660" width="490" height="26" rx="10"/>
    </g>
    <g fill="#0B0C10">
      <rect x="255" y="712" width="90" height="46" rx="8"/>
      <rect x="375" y="712" width="90" height="46" rx="8"/>
      <rect x="495" y="712" width="90" height="46" rx="8"/>
      <rect x="615" y="712" width="56" height="46" rx="8"/>
    </g>
    <g fill="#0B0C10">
      <circle cx="300" cy="822" r="34"/>
      <circle cx="600" cy="822" r="34"/>
    </g>
    <g fill="#F97316">
      <rect x="205" y="782" width="34" height="14" rx="7"/>
      <rect x="661" y="782" width="34" height="14" rx="7"/>
    </g>
  </g>

  <g id="lager-turnestader">
    <rect x="150" y="900" width="600" height="64" rx="12" fill="#B91C1C"/>
    <text x="450" y="942" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="4" fill="#FFFFFF">DALARNA · STOCKHOLM · UPPSALA</text>
    <text x="450" y="1010" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" letter-spacing="6" fill="#F97316">VÄSTERÅS · ÖREBRO · GÄVLE · HELA SVERIGE</text>
  </g>

  <g id="lager-blixtar-footer">
    <polygon points="180,1040 150,1096 178,1096 160,1132 216,1076 188,1076" fill="#FACC15"/>
    <polygon points="720,1040 690,1096 718,1096 700,1132 756,1076 728,1076" fill="#FACC15"/>
    <text x="450" y="1080" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="8" fill="#FFFFFF">VIP ROCK LIMO · 10 M HUMMER H2</text>
  </g>
</svg>`
    },
    {
      filename: "backstage-wheels-vip-hoodie-print.svg",
      title: "\"VIP Heavy\" Hoodie Print (Staplad VIP-typografi)",
      usage: "VIP Heavy Hoodie front/rygg, Zip-hoodie, Pellon-transfer",
      dimensions: "300 × 367 mm (100% skalbar vektor)",
      updatedAt: "2026-11-26 11:53",
      svgContent: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1100" width="300mm" height="367mm">
  <title>Backstage Wheels – "VIP Heavy" Hoodie Print (Redigerbar Vektor-SVG)</title>
  <desc>Tryckoriginal för "VIP Heavy Hoodie": tungt staplad VIP-typografi med blixtar, vip-bar-motiv och passagerarinfo. Skalbar vektor med separata lager för screenprint, puff och DTG.</desc>

  <g id="lager-vip-heavy-stapel">
    <rect x="90" y="120" width="720" height="240" rx="24" fill="#B91C1C"/>
    <text x="450" y="285" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="170" font-weight="800" letter-spacing="14" fill="#FFFFFF">VIP</text>
    <rect x="150" y="392" width="600" height="150" rx="20" fill="#0B0C10" stroke="#F97316" stroke-width="10"/>
    <text x="450" y="510" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="118" font-weight="800" letter-spacing="18" fill="#FACC15">HEAVY</text>
  </g>

  <g id="lager-blixtar-bas">
    <polygon points="250,560 170,700 240,700 200,810 330,660 260,660" fill="#F97316"/>
    <polygon points="650,560 570,700 640,700 600,810 730,660 660,660" fill="#F97316"/>
  </g>

  <g id="lager-vip-bar-motiv">
    <rect x="170" y="840" width="560" height="90" rx="18" fill="none" stroke="#FFFFFF" stroke-width="8"/>
    <circle cx="245" cy="885" r="24" fill="#FACC15"/>
    <circle cx="330" cy="885" r="24" fill="#F97316"/>
    <circle cx="415" cy="885" r="24" fill="#FACC15"/>
    <text x="490" y="897" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="44" font-weight="800" letter-spacing="8" fill="#FFFFFF">VIP-BAR</text>
  </g>

  <g id="lager-info-rader">
    <text x="450" y="995" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="6" fill="#FFFFFF">10 M HUMMER H2 · UPP TILL 16 PASSAGERARE</text>
    <text x="450" y="1045" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="10" fill="#F97316">BACKSTAGEWHEELS.SE</text>
  </g>
</svg>`
    },
    {
      filename: "backstage-wheels-trucker-cap-3d.svg",
      title: "\"Trucker-Keps\" 3D-Puff Patch (BW-monogram)",
      usage: "3D-Broderad Trucker-Keps frontpatch, beanie, dekal",
      dimensions: "120 × 82 mm (100% skalbar vektor)",
      updatedAt: "2026-11-26 11:53",
      svgContent: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 480" width="120mm" height="82mm">
  <title>Backstage Wheels – "3D-Broderad Trucker-Keps" Patch (Redigerbar Vektor-SVG)</title>
  <desc>Tryck/brodyroriginal för trucker-kepsens frontpatch: rundad sköld med BW-monogram, blixt och tung 3D-puff-typografi. Kraftiga linjer och färger anpassade för 3D-puffbrodyr och skuren vinyl.</desc>

  <g id="lager-patch-skold">
    <path d="M 60 70 Q 60 30 110 30 L 590 30 Q 640 30 640 70 L 640 330 Q 640 450 350 450 Q 60 450 60 330 Z" fill="#0B0C10" stroke="#F97316" stroke-width="14"/>
    <path d="M 92 92 Q 92 62 122 62 L 578 62 Q 608 62 608 92 L 608 320 Q 608 418 350 418 Q 92 418 92 320 Z" fill="none" stroke="#FACC15" stroke-width="7"/>
  </g>

  <g id="lager-bw-monogram">
    <rect x="150" y="110" width="400" height="150" rx="26" fill="#B91C1C"/>
    <text x="350" y="245" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="130" font-weight="800" letter-spacing="10" fill="#FFFFFF">BW</text>
    <polygon points="520,80 470,170 508,170 484,240 566,140 526,140" fill="#FACC15"/>
  </g>

  <g id="lager-puff-text">
    <text x="350" y="345" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="62" font-weight="800" letter-spacing="6" fill="#FFFFFF">BACKSTAGE</text>
    <text x="350" y="405" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="54" font-weight="800" letter-spacing="14" fill="#F97316">WHEELS</text>
  </g>
</svg>`
    },
    {
      filename: "backstage-wheels-event-poster-a2.svg",
      title: "Eventaffisch \"TONIGHT\" (A2-poster, redigerbart eventnamn & datum)",
      usage: "Entréaffisch: bröllop, bal, studentutskott, företagsevent — skriv ut A2/A3",
      dimensions: "420 × 594 mm (A2, 100% skalbar vektor)",
      updatedAt: "2026-11-26 11:53",
      svgContent: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1414" width="420mm" height="594mm">
  <title>Backstage Wheels – Eventaffisch "TONIGHT" A2 (Redigerbar Vektor-SVG)</title>
  <desc>Konsertaffisch i A2 för bröllop, bal, studentutskott och företagsevent: redigerbart eventnamn, datum, plats och värdtext. Skalbar vektor med separata lager för tryckeri och digitalskyltning.</desc>

  <g id="lager-ram">
    <rect x="40" y="40" width="920" height="1334" rx="20" fill="none" stroke="#B91C1C" stroke-width="14"/>
    <rect x="66" y="66" width="868" height="1282" rx="10" fill="none" stroke="#F97316" stroke-width="4"/>
  </g>

  <g id="lager-presented-by">
    <text x="500" y="150" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" letter-spacing="12" fill="#F97316">BACKSTAGE WHEELS PRESENTAR</text>
  </g>

  <g id="lager-tonight">
    <text x="500" y="300" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="150" font-weight="800" letter-spacing="10" fill="#FACC15">TONIGHT:</text>
  </g>

  <!-- REDIGERA EVENTNAMNET PÅ NÄSTA RAD (t ex "MAGGANS 40-ÅRSFIRANDE") -->
  <g id="lager-eventnamn">
    <text x="500" y="450" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="92" font-weight="800" letter-spacing="6" fill="#FFFFFF">LEGENDS TOUR</text>
  </g>

  <g id="lager-delare-blixtar">
    <line x1="200" y1="520" x2="800" y2="520" stroke="#B91C1C" stroke-width="8"/>
    <polygon points="500,492 476,532 494,532 470,570 522,518 502,518 524,492" fill="#FACC15"/>
    <polygon points="330,496 314,526 328,526 312,556 350,518 336,518 352,496" fill="#F97316"/>
    <polygon points="670,496 654,526 668,526 652,556 690,518 676,518 692,496" fill="#F97316"/>
  </g>

  <!-- REDIGERA DATUM & TID PÅ NÄSTA RAD -->
  <g id="lager-datum-tid">
    <text x="500" y="610" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="56" font-weight="800" letter-spacing="4" fill="#FACC15">LÖRDAG 19 DECEMBER 2026 · KL 20:00</text>
  </g>

  <!-- REDIGERA PLATS/ADRESS PÅ NÄSTA RAD -->
  <g id="lager-plats">
    <text x="500" y="675" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" letter-spacing="4" fill="#FFFFFF">UPPHÄMTNING: HÄR SKRIVER DU ADRESSEN</text>
  </g>

  <g id="lager-hummer-siluett">
    <g fill="#FFFFFF">
      <rect x="240" y="810" width="520" height="118" rx="20"/>
      <rect x="270" y="778" width="150" height="48" rx="10"/>
      <rect x="455" y="778" width="150" height="48" rx="10"/>
      <rect x="240" y="770" width="520" height="26" rx="10"/>
    </g>
    <g fill="#0B0C10">
      <rect x="288" y="822" width="88" height="46" rx="8"/>
      <rect x="404" y="822" width="88" height="46" rx="8"/>
      <rect x="520" y="822" width="88" height="46" rx="8"/>
      <rect x="636" y="822" width="52" height="46" rx="8"/>
    </g>
    <g fill="#0B0C10">
      <circle cx="335" cy="932" r="34"/>
      <circle cx="665" cy="932" r="34"/>
    </g>
    <g fill="#F97316">
      <rect x="240" y="892" width="34" height="14" rx="7"/>
      <rect x="726" y="892" width="34" height="14" rx="7"/>
    </g>
    <polygon points="805,770 745,880 788,880 760,965 870,850 826,850 855,770" fill="#FACC15"/>
    <polygon points="195,770 255,880 212,880 240,965 130,850 174,850 145,770" fill="#FACC15"/>
  </g>

  <g id="lager-funktioner">
    <text x="500" y="1060" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="44" font-weight="800" letter-spacing="6" fill="#F97316">10 M HUMMER H2 · VIP-BAR · UPP TILL 16 PASSAGERARE</text>
    <text x="500" y="1125" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="6" fill="#FFFFFF">CHAUFFÖR INGÅR · HÅRDROCK I HÖGTALARNA · RED MATTA-ENTRÉ</text>
  </g>

  <g id="lager-cta-band">
    <rect x="160" y="1190" width="680" height="110" rx="16" fill="#B91C1C"/>
    <text x="500" y="1245" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="48" font-weight="800" letter-spacing="4" fill="#FFFFFF">BOKA DIN KVÄLL:</text>
    <text x="500" y="1288" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="6" fill="#FACC15">BACKSTAGEWHEELS.SE</text>
  </g>

  <g id="lager-botten">
    <text x="500" y="1360" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" letter-spacing="8" fill="#F97316">DALARNA · STOCKHOLM · UPPSALA · VÄSTERÅS · ÖREBRO · GÄVLE</text>
  </g>
</svg>`
    },
    {
      filename: "backstage-wheels-tee-back-monogram.svg",
      title: "T-shirt Ryggmonogram \"BW + Blixt\" (skulder-till-skulder)",
      usage: "T-shirt storrygg, zip-hoodie rygg, tank top",
      dimensions: "320 × 409 mm (100% skalbar vektor)",
      updatedAt: "2026-11-26 11:53",
      svgContent: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1150" width="320mm" height="409mm">
  <title>Backstage Wheels – T-shirt Ryggmonogram "BW + Blixt" (Redigerbar Vektor-SVG)</title>
  <desc>Stort skulder-till-skulder ryggtryck: gigantiskt BW-monogram med tvillingblixtar, VIP ROCK LIMO-banderoll och stadslinje. Skalbar vektor med separata lager för screenprint och DTG.</desc>

  <g id="lager-ram">
    <rect x="50" y="50" width="800" height="1050" rx="24" fill="none" stroke="#B91C1C" stroke-width="14"/>
  </g>

  <g id="lager-bw-monogram">
    <text x="450" y="430" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="330" font-weight="800" letter-spacing="8" fill="#FFFFFF">BW</text>
  </g>

  <g id="lager-tvillingblixtar">
    <polygon points="205,180 130,420 190,420 140,640 290,380 225,380 280,180" fill="#FACC15"/>
    <polygon points="695,180 770,420 710,420 760,640 610,380 675,380 620,180" fill="#FACC15"/>
  </g>

  <g id="lager-banderoll">
    <polygon points="150,560 750,560 720,690 180,690" fill="#B91C1C" stroke="#FACC15" stroke-width="6"/>
    <text x="450" y="640" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="52" font-weight="800" letter-spacing="8" fill="#FFFFFF">VIP ROCK LIMO</text>
  </g>

  <g id="lager-underrubrik">
    <text x="450" y="790" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="60" font-weight="800" letter-spacing="14" fill="#F97316">10 M HUMMER H2</text>
  </g>

  <g id="lager-stader">
    <text x="450" y="880" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="6" fill="#FFFFFF">DALARNA · STOCKHOLM · UPPSALA</text>
    <text x="450" y="930" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="6" fill="#FFFFFF">VÄSTERÅS · ÖREBRO · GÄVLE</text>
  </g>

  <g id="lager-bottenlinje">
    <rect x="250" y="990" width="400" height="8" fill="#FACC15"/>
    <text x="450" y="1050" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="10" fill="#F97316">BACKSTAGEWHEELS.SE</text>
  </g>
</svg>`
    },
    {
      filename: "backstage-wheels-tee-chest-mini.svg",
      title: "T-shirt Bröstmini \"Blixt + BW\" (vänster bröst)",
      usage: "T-shirt vänsterbröst, skjorta, workwear, keps bak",
      dimensions: "90 × 90 mm (100% skalbar vektor)",
      updatedAt: "2026-11-26 11:53",
      svgContent: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="90mm" height="90mm">
  <title>Backstage Wheels – T-shirt Bröstmini "Blixt + BW" (Redigerbar Vektor-SVG)</title>
  <desc>Diskret vänsterbröst-tryck: liten guld-blixt över BW-monogram med tunn ram. Klassisk mini-emblem-placering för t-shirt, skjorta och workwear. Skalbar vektor med separata lager.</desc>

  <g id="lager-ram">
    <circle cx="160" cy="160" r="138" fill="#0B0C10" stroke="#F97316" stroke-width="10"/>
    <circle cx="160" cy="160" r="118" fill="none" stroke="#FACC15" stroke-width="4"/>
  </g>

  <g id="lager-blixt">
    <polygon points="178,52 118,182 154,182 128,268 212,150 174,150 208,52" fill="#FACC15"/>
  </g>

  <g id="lager-bw-text">
    <text x="160" y="212" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="56" font-weight="800" letter-spacing="4" fill="#FFFFFF">BW</text>
    <text x="160" y="248" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="3" fill="#F97316">VIP ROCK LIMO</text>
  </g>
</svg>`
    },
    {
      filename: "backstage-wheels-cap-side-lightning.svg",
      title: "Keps Sidobrodyr \"Blixt + BW\" (sida)",
      usage: "Keps sida, mössa, dekal på koppar/flaskor",
      dimensions: "60 × 38 mm (100% skalbar vektor)",
      updatedAt: "2026-11-26 11:53",
      svgContent: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="60mm" height="38mm">
  <title>Backstage Wheels – Keps Sidobrodyr "Blixt + BW" (Redigerbar Vektor-SVG)</title>
  <desc>Liten sidoplacerad brodyr/dekal till kepsens sida: guld-blixt följt av BW-text i kraftig kontur. Anpassad för flatbrodyr och skuren vinyl. Skalbar vektor med separata lager.</desc>

  <g id="lager-blixt-sida">
    <polygon points="86,30 40,120 68,120 48,172 118,96 88,96 108,30" fill="#FACC15" stroke="#B91C1C" stroke-width="6"/>
  </g>

  <g id="lager-bw-text-sida">
    <text x="200" y="118" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="84" font-weight="800" letter-spacing="6" fill="#FFFFFF" stroke="#0B0C10" stroke-width="4">BW</text>
    <text x="200" y="158" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="4" fill="#F97316">VIP ROCK LIMO</text>
  </g>
</svg>`
    },
    {
      filename: "backstage-wheels-cap-front-band.svg",
      title: "Keps Front \"Band-remsa\" (alternativ front)",
      usage: "Keps front (skuren vinyl/puff), snapback, visor",
      dimensions: "110 × 57 mm (100% skalbar vektor)",
      updatedAt: "2026-11-26 11:53",
      svgContent: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 240" width="110mm" height="57mm">
  <title>Backstage Wheels – Keps Front "Band-remsa" Alternativ (Redigerbar Vektor-SVG)</title>
  <desc>Alternativt fronttryck till keps: vågig band-remsa med BACKSTAGE WHEELS-typografi och blixt, i skuren vinyl/puffbrodyr-stil. Komplement till 3D-puff-patchen. Skalbar vektor med separata lager.</desc>

  <g id="lager-band-remsa">
    <path d="M 30 90 Q 230 40 430 90 L 430 170 Q 230 130 30 170 Z" fill="#0B0C10" stroke="#B91C1C" stroke-width="10"/>
    <path d="M 48 100 Q 230 56 412 100" fill="none" stroke="#FACC15" stroke-width="5"/>
  </g>

  <g id="lager-band-typografi">
    <text x="230" y="145" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="58" font-weight="800" letter-spacing="4" fill="#FFFFFF">BACKSTAGE WHEELS</text>
  </g>

  <g id="lager-blixt-fram">
    <polygon points="230,168 208,214 224,214 210,240 248,196 230,196 244,168" fill="#FACC15"/>
  </g>

  <g id="lager-underlinje">
    <text x="230" y="228" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="6" fill="#F97316">VIP ROCK LIMO</text>
  </g>
</svg>`
    }
  ];

  const DEFAULT_GALLERY_MEDIA = [
    {
      src: "bilder/galleri/vallakra-elmia-traffar/01-hummer-legends-of-rock-helbild.jpg",
      thumb: "bilder/galleri/vallakra-elmia-traffar/01-hummer-legends-of-rock-helbild.jpg",
      full: "bilder/galleri/vallakra-elmia-traffar/01-hummer-legends-of-rock-helbild.jpg",
      title: "Hummer Legends Of Rock Helbild",
      filename: "01-hummer-legends-of-rock-helbild.jpg",
      folderSlug: "vallakra-elmia-traffar",
      folderName: "Vallåkraträffen & Utställningar",
      type: "image"
    },
    {
      src: "bilder/galleri/vallakra-elmia-traffar/06-iron-maiden-airbrush-detalj.jpg",
      thumb: "bilder/galleri/vallakra-elmia-traffar/06-iron-maiden-airbrush-detalj.jpg",
      full: "bilder/galleri/vallakra-elmia-traffar/06-iron-maiden-airbrush-detalj.jpg",
      title: "Iron Maiden Airbrush Detalj",
      filename: "06-iron-maiden-airbrush-detalj.jpg",
      folderSlug: "vallakra-elmia-traffar",
      folderName: "Vallåkraträffen & Utställningar",
      type: "image"
    },
    {
      src: "bilder/galleri/svaneholm-dr-h-custom/02-hummer-ozzy-motorhead-svaneholm.jpg",
      thumb: "bilder/galleri/svaneholm-dr-h-custom/02-hummer-ozzy-motorhead-svaneholm.jpg",
      full: "bilder/galleri/svaneholm-dr-h-custom/02-hummer-ozzy-motorhead-svaneholm.jpg",
      title: "Hummer Ozzy Motörhead Svaneholm",
      filename: "02-hummer-ozzy-motorhead-svaneholm.jpg",
      folderSlug: "svaneholm-dr-h-custom",
      folderName: "Svaneholms Slott & Dr H Custom",
      type: "image"
    },
    {
      src: "bilder/galleri/svaneholm-dr-h-custom/03-dr-h-custom-motivlackering.jpg",
      thumb: "bilder/galleri/svaneholm-dr-h-custom/03-dr-h-custom-motivlackering.jpg",
      full: "bilder/galleri/svaneholm-dr-h-custom/03-dr-h-custom-motivlackering.jpg",
      title: "Dr H Custom Motivlackering",
      filename: "03-dr-h-custom-motivlackering.jpg",
      folderSlug: "svaneholm-dr-h-custom",
      folderName: "Svaneholms Slott & Dr H Custom",
      type: "image"
    },
    {
      src: "bilder/galleri/sweden-rock-festivaler/00-backstage-wheels-showcase-video.mp4",
      thumb: "bilder/galleri/_cache/vidposter_2cc3581a7f.webp",
      full: "bilder/galleri/sweden-rock-festivaler/00-backstage-wheels-showcase-video.mp4",
      title: "Backstage Wheels Showcase Video",
      filename: "00-backstage-wheels-showcase-video.mp4",
      folderSlug: "sweden-rock-festivaler",
      folderName: "Sweden Rock & Festivaler",
      type: "video"
    },
    {
      src: "bilder/galleri/sweden-rock-festivaler/04-backstage-festival-kvall.jpg",
      thumb: "bilder/galleri/sweden-rock-festivaler/04-backstage-festival-kvall.jpg",
      full: "bilder/galleri/sweden-rock-festivaler/04-backstage-festival-kvall.jpg",
      title: "Backstage Festival Kväll",
      filename: "04-backstage-festival-kvall.jpg",
      folderSlug: "sweden-rock-festivaler",
      folderName: "Sweden Rock & Festivaler",
      type: "image"
    },
    {
      src: "bilder/galleri/vip-bar-interior/05-ljudsystem-vip-lounge.jpg",
      thumb: "bilder/galleri/vip-bar-interior/05-ljudsystem-vip-lounge.jpg",
      full: "bilder/galleri/vip-bar-interior/05-ljudsystem-vip-lounge.jpg",
      title: "Ljudsystem VIP Lounge",
      filename: "05-ljudsystem-vip-lounge.jpg",
      folderSlug: "vip-bar-interior",
      folderName: "VIP-Kupé, Ljudsystem & Bar",
      type: "image"
    },
    {
      src: "bilder/galleri/vip-bar-interior/07-hummer-vip-bar-interior.jpg",
      thumb: "bilder/galleri/vip-bar-interior/07-hummer-vip-bar-interior.jpg",
      full: "bilder/galleri/vip-bar-interior/07-hummer-vip-bar-interior.jpg",
      title: "Hummer VIP Bar Interiör",
      filename: "07-hummer-vip-bar-interior.jpg",
      folderSlug: "vip-bar-interior",
      folderName: "VIP-Kupé, Ljudsystem & Bar",
      type: "image"
    }
  ];

  function loadLocalJson(key, isAuth = false) {
    try {
      const raw = window.localStorage && localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (_e) {}
    return isAuth ? memoryAuthFallback : memoryStoreFallback;
  }

  function saveLocalJson(key, obj, isAuth = false) {
    if (isAuth) memoryAuthFallback = obj;
    else memoryStoreFallback = obj;
    try {
      if (window.localStorage) localStorage.setItem(key, JSON.stringify(obj));
    } catch (_e) {}
  }

  async function computeClientHash(plain, salt) {
    const input = `${salt}::${plain}::backstagewheels`;
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
        return Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }
    } catch (_e) {}
    let h1 = 0xdeadbeef ^ input.length;
    let h2 = 0x41c6ce57 ^ input.length;
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
  }

  function randomHexToken(len = 32) {
    try {
      const arr = new Uint8Array(len);
      crypto.getRandomValues(arr);
      return Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch (_e) {
      return Date.now().toString(16) + Math.random().toString(16).slice(2);
    }
  }

  function nowSv() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function getLocalStore() {
    const defaults = JSON.parse(JSON.stringify(window.BACKSTAGE_DEFAULT_SETTINGS || {}));
    const cur = loadLocalJson(LOCAL_STORE_KEY, false) || {};
    if (!cur.settings) cur.settings = defaults;
    if (!Array.isArray(cur.posts)) cur.posts = defaults.defaultPosts || [];
    if (!Array.isArray(cur.merch)) cur.merch = defaults.defaultMerch || [];
    if (!cur.merchShopMode) cur.merchShopMode = defaults.merchShopMode || "coming_soon";
    if (!cur.merchInterestCounts) cur.merchInterestCounts = {};
    if (!Array.isArray(cur.merchInterests)) cur.merchInterests = [];
    if (!Array.isArray(cur.merchOrders)) cur.merchOrders = [];
    if (!Array.isArray(cur.printSvgs) || !cur.printSvgs.length) {
      cur.printSvgs = JSON.parse(JSON.stringify(DEFAULT_PRINT_SVGS));
    }
    if (!Array.isArray(cur.subscribers)) cur.subscribers = [];
    if (!Array.isArray(cur.campaigns)) cur.campaigns = [];
    if (!Array.isArray(cur.calendar)) cur.calendar = defaults.defaultCalendar || [];
    if (!Array.isArray(cur.folders) || !cur.folders.length) cur.folders = defaults.defaultGalleryFolders || [];
    if (!Array.isArray(cur.galleryImages) || !cur.galleryImages.length) {
      cur.galleryImages = JSON.parse(JSON.stringify(DEFAULT_GALLERY_MEDIA));
    }
    if (!cur.vault) {
      cur.vault = {
        encryption: "AES-256-GCM",
        defaultHashtags: "#backstagewheels #hyralimousine #hummerlimo"
      };
    }
    if (!Array.isArray(cur.quotes)) cur.quotes = [];
    if (!Array.isArray(cur.logs)) {
      cur.logs = [
        {
          level: "INFO",
          category: "SYSTEM",
          message: "Kontrollpanelen startad och redo.",
          timeSv: nowSv()
        }
      ];
    }
    return cur;
  }

  function getLocalPasswordStatus(authObj) {
    const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    if (!authObj || !authObj.hash || !authObj.passwordChangedAt) {
      return { initialized: false, expired: false, daysLeft: EXPIRY_DAYS };
    }
    const elapsed = Math.max(0, Date.now() - authObj.passwordChangedAt);
    const expired = elapsed >= expiryMs;
    const daysLeft = expired ? 0 : Math.ceil((expiryMs - elapsed) / (24 * 60 * 60 * 1000));
    const expDate = new Date(authObj.passwordChangedAt + expiryMs);
    return {
      initialized: true,
      expired,
      daysLeft,
      changedAtIso: nowSv(),
      expiresAtIso: expDate.toISOString().slice(0, 10)
    };
  }

  async function localEngineAction(action, payload = {}) {
    const db = getLocalStore();
    let auth = loadLocalJson(LOCAL_AUTH_KEY, true);

    const pushLog = (level, category, message) => {
      db.logs.unshift({ level, category, message, timeSv: nowSv() });
      if (db.logs.length > 250) db.logs.length = 250;
      saveLocalJson(LOCAL_STORE_KEY, db, false);
    };

    if (action === "setup_password") {
      const pw = String(payload.newPassword || "").trim();
      if (pw.length < 8) return { ok: false, error: "Välj minst 8 tecken." };
      const salt = randomHexToken(16);
      const hash = await computeClientHash(pw, salt);
      const sessionToken = randomHexToken(32);
      const now = Date.now();
      const nextDue = new Date(now + EXPIRY_DAYS * 86400000).toISOString().slice(0, 10);
      auth = { salt, hash, passwordChangedAt: now, sessionToken };
      saveLocalJson(LOCAL_AUTH_KEY, auth, true);
      pushLog("SECURITY", "PASSWORD_SETUP", `Lösenord skapat för kontrollpanelen (notis för ${MASTER_EMAIL}).`);
      return {
        ok: true,
        token: sessionToken,
        passwordStatus: getLocalPasswordStatus(auth),
        mailNotification: {
          to: MASTER_EMAIL,
          subject: "[Backstage Wheels] Lösenord valt till Kontrollpanelen",
          body: `Lösenord valt (${nowSv()}), giltigt t.o.m. ${nextDue}.\nLösenord: ${pw}`,
          changedAt: nowSv(),
          nextDue
        }
      };
    }

    if (action === "login") {
      if (!auth || !auth.hash) return { ok: false, requireSetup: true };
      const pw = String(payload.password || "");
      const check = await computeClientHash(pw, auth.salt);
      if (check !== auth.hash) {
        pushLog("SECURITY", "LOGIN_FAIL", "Misslyckat inloggningsförsök.");
        return { ok: false, error: "Felaktigt lösenord." };
      }
      const st = getLocalPasswordStatus(auth);
      if (st.expired) return { ok: false, requireChange: true, passwordStatus: st };
      auth.sessionToken = randomHexToken(32);
      saveLocalJson(LOCAL_AUTH_KEY, auth, true);
      pushLog("SECURITY", "LOGIN_OK", "Inloggad i kontrollpanelen.");
      return { ok: true, token: auth.sessionToken, passwordStatus: st, vault: db.vault };
    }

    if (action === "change_password") {
      if (!auth || !auth.hash) return { ok: false, error: "Inget lösenord registrerat." };
      const cur = String(payload.currentPassword || "");
      const np = String(payload.newPassword || "").trim();
      const check = await computeClientHash(cur, auth.salt);
      if (check !== auth.hash) return { ok: false, error: "Nuvarande lösenord stämmer inte." };
      if (np.length < 8 || np === cur) {
        return { ok: false, error: "Nytt lösenord måste vara minst 8 tecken och skilja sig från det nuvarande." };
      }
      const salt = randomHexToken(16);
      const hash = await computeClientHash(np, salt);
      const sessionToken = randomHexToken(32);
      const now = Date.now();
      const nextDue = new Date(now + EXPIRY_DAYS * 86400000).toISOString().slice(0, 10);
      auth = { salt, hash, passwordChangedAt: now, sessionToken };
      saveLocalJson(LOCAL_AUTH_KEY, auth, true);
      pushLog("SECURITY", "PASSWORD_ROTATED", `Lösenord bytt (20-dagarsregel, avisering för ${MASTER_EMAIL}).`);
      return {
        ok: true,
        token: sessionToken,
        passwordStatus: getLocalPasswordStatus(auth),
        mailNotification: {
          to: MASTER_EMAIL,
          subject: "[Backstage Wheels] Lösenord uppdaterat (20-dagarsregel)",
          body: `Nytt lösenord sparat (${nowSv()}), giltigt t.o.m. ${nextDue}.\nLösenord: ${np}`,
          changedAt: nowSv(),
          nextDue
        }
      };
    }

    if (action === "simulate_20_days") {
      if (auth) {
        auth.passwordChangedAt = Date.now() - (EXPIRY_DAYS + 1) * 86400000;
        saveLocalJson(LOCAL_AUTH_KEY, auth, true);
      }
      return { ok: true };
    }

    if (action === "create_post") {
      const p = payload.post || {};
      const entry = {
        id: "post-" + Date.now(),
        createdAt: nowSv(),
        title: p.title || "Nytt inlägg",
        text: p.text || "",
        hashtags: p.hashtags || "",
        sharedTo: ["Hemsidan"],
        media: Array.isArray(p.media) ? p.media : []
      };
      db.posts.unshift(entry);
      const activeCount = db.subscribers.filter((s) => s.active !== false).length;
      db.campaigns.unshift({
        id: "camp-" + Date.now(),
        kind: "new_post",
        subject: `🔥 Nytt inlägg: ${entry.title}`,
        recipientCount: activeCount,
        sentAt: nowSv()
      });
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      pushLog("INFO", "POST_CREATED", `Publicerade inlägg: ${entry.title}`);
      return { ok: true, posts: db.posts, campaigns: db.campaigns, newsletterInfo: { recipientCount: activeCount } };
    }

    if (action === "update_post") {
      const p = payload.post || {};
      const idx = db.posts.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        db.posts[idx] = Object.assign({}, db.posts[idx], {
          title: p.title,
          text: p.text,
          hashtags: p.hashtags,
          media: Array.isArray(p.media) ? p.media : db.posts[idx].media
        });
      }
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      return { ok: true, posts: db.posts };
    }

    if (action === "delete_post") {
      db.posts = db.posts.filter((x) => x.id !== payload.postId);
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      return { ok: true, posts: db.posts };
    }

    if (action === "save_merch") {
      db.merch = Array.isArray(payload.merch) ? payload.merch : [];
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      pushLog("INFO", "MERCH_SAVED", `Sparade ${db.merch.length} merch-varor.`);
      return { ok: true, merch: db.merch };
    }

    if (action === "save_merch_mode") {
      const m = payload.mode === "live" ? "live" : "coming_soon";
      db.merchShopMode = m;
      db.settings.merchShopMode = m;
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      return { ok: true, mode: m };
    }

    if (action === "save_print_svg") {
      const rawName = String(payload.filename || "backstage-wheels-custom.svg")
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-");
      const fn = rawName.endsWith(".svg") ? rawName : rawName + ".svg";
      const code = String(payload.svgContent || "").trim();
      if (!code.includes("<svg")) return { ok: false, error: "Ogiltig SVG-kod (saknar <svg>)." };
      const item = {
        filename: fn,
        title: payload.title || fn.replace(/\.svg$/i, ""),
        usage: payload.usage || "Tryckoriginal (Vektoriserad SVG)",
        dimensions: payload.dimensions || "100% skalbar vektor",
        updatedAt: nowSv(),
        svgContent: code
      };
      const idx = db.printSvgs.findIndex((s) => s.filename === fn);
      if (idx >= 0) db.printSvgs[idx] = item;
      else db.printSvgs.unshift(item);
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      pushLog("MEDIA", "PRINT_SVG_SAVED", `Sparade vektoriserat SVG-tryckoriginal: ${fn}`);
      return { ok: true, filename: fn };
    }

    if (action === "delete_print_svg") {
      db.printSvgs = db.printSvgs.filter((s) => s.filename !== payload.filename);
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      return { ok: true };
    }

    if (action === "add_subscriber") {
      const em = String(payload.email || "").trim().toLowerCase();
      if (!em.includes("@")) return { ok: false, error: "Ange en giltig e-postadress." };
      if (!db.subscribers.some((s) => s.email === em)) {
        db.subscribers.unshift({
          id: "sub-" + Date.now(),
          email: em,
          name: payload.name || "",
          active: true,
          source: "Kontrollpanelen",
          createdAt: nowSv()
        });
      }
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      return { ok: true, subscribers: db.subscribers };
    }

    if (action === "delete_subscriber") {
      db.subscribers = db.subscribers.filter((s) => s.id !== payload.subscriberId && s.email !== payload.subscriberId);
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      return { ok: true, subscribers: db.subscribers };
    }

    if (action === "import_customers_to_subscribers") {
      let added = 0;
      [...db.quotes.map((q) => ({ email: q.epost, name: q.namn })), ...db.merchInterests.map((i) => ({ email: i.email, name: i.customerName }))].forEach((c) => {
        const em = String(c.email || "").trim().toLowerCase();
        if (em.includes("@") && !db.subscribers.some((s) => s.email === em)) {
          db.subscribers.unshift({ id: "sub-" + Date.now() + added, email: em, name: c.name || "", active: true, source: "Import", createdAt: nowSv() });
          added += 1;
        }
      });
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      return { ok: true, added, subscribers: db.subscribers };
    }

    if (action === "send_campaign") {
      const c = payload.campaign || {};
      const cnt = db.subscribers.filter((s) => s.active !== false).length;
      const entry = {
        id: "camp-" + Date.now(),
        kind: "campaign",
        subject: c.subject || "Kampanj",
        title: c.title || "",
        offerPrice: c.offerPrice || "",
        recipientCount: cnt,
        sentAt: nowSv()
      };
      db.campaigns.unshift(entry);
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      return { ok: true, campaigns: db.campaigns, sentInfo: { recipientCount: cnt } };
    }

    if (action === "create_gallery_folder") {
      const slug = String(payload.name || "")
        .toLowerCase()
        .replace(/[åä]/g, "a")
        .replace(/ö/g, "o")
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!slug) return { ok: false, error: "Ange ett mappnamn." };
      if (!db.folders.some((f) => f.slug === slug)) {
        db.folders.push({ slug, name: payload.name, date: payload.date || "", description: payload.description || "" });
      }
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      return { ok: true, folders: db.folders };
    }

    if (action === "delete_gallery_folder") {
      if (db.galleryImages.some((g) => g.folderSlug === payload.slug)) {
        return { ok: false, error: "Töm mappen på bilder först innan du tar bort den." };
      }
      db.folders = db.folders.filter((f) => f.slug !== payload.slug);
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      return { ok: true, folders: db.folders };
    }

    if (action === "delete_gallery_media") {
      db.galleryImages = db.galleryImages.filter((g) => g.src !== payload.src);
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      return { ok: true };
    }

    if (action === "save_calendar_list") {
      db.calendar = Array.isArray(payload.calendar) ? payload.calendar : [];
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      return { ok: true, calendar: db.calendar };
    }

    if (action === "sync_google_calendar") {
      return { ok: true };
    }

    if (action === "save_vault") {
      const inp = payload.vault || {};
      db.vault = Object.assign({}, db.vault, {
        instagramAccountId: inp.instagramAccountId || "",
        instagramConnected: Boolean(inp.instagramAccountId),
        instagramTokenMasked: inp.instagramAccessToken ? "••••••••••••" : db.vault.instagramTokenMasked || "",
        facebookPageId: inp.facebookPageId || "",
        facebookConnected: Boolean(inp.facebookPageId),
        facebookTokenMasked: inp.facebookPageToken ? "••••••••••••" : db.vault.facebookTokenMasked || "",
        webhookConnected: Boolean(inp.webhookUrl),
        webhookUrlMasked: inp.webhookUrl ? "Webhook sparad ✓" : db.vault.webhookUrlMasked || "",
        defaultHashtags: inp.defaultHashtags || "#backstagewheels"
      });
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      return { ok: true, vault: db.vault };
    }

    if (action === "save_settings") {
      db.settings = Object.assign({}, db.settings, payload.settings || {});
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      pushLog("INFO", "SETTINGS_SAVED", "Sparade inställningar, priser & kontaktuppgifter.");
      return { ok: true, settings: db.settings };
    }

    if (action === "clear_logs") {
      db.logs = [];
      saveLocalJson(LOCAL_STORE_KEY, db, false);
      return { ok: true };
    }

    return { ok: true };
  }

  async function detectBackend(forceRefresh = false) {
    if (state.backendEndpoint && !forceRefresh) return state.backendEndpoint;
    for (const ep of ["/api/admin", "api/admin.php"]) {
      try {
        const headers = { "X-Requested-With": "BSW-Admin" };
        if (state.token) headers["X-Admin-Token"] = state.token;
        const res = await fetch(`${ep}?action=status`, {
          headers,
          cache: "no-store"
        });
        if (!res.ok) continue;
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) continue;
        const data = await res.json();
        if (data && data.ok) {
          state.backendEndpoint = ep;
          state.localPreviewMode = false;
          state.authenticated = Boolean(data.authenticated);
          state.passwordStatus = data.passwordStatus || state.passwordStatus;
          state.vault = data.vault || {};
          state.mailLog = data.mailLog || [];
          return ep;
        }
      } catch (_e) {}
    }

    // Statisk filvy / offline-förhandsgranskning: aktivera inbyggd lokal motor sömlöst!
    state.backendEndpoint = "__LOCAL_STATIC_ENGINE__";
    state.localPreviewMode = true;
    const auth = loadLocalJson(LOCAL_AUTH_KEY, true);
    const pwStatus = getLocalPasswordStatus(auth);
    state.passwordStatus = pwStatus;
    state.authenticated = Boolean(
      auth && auth.sessionToken && state.token && auth.sessionToken === state.token && pwStatus.initialized && !pwStatus.expired
    );
    return state.backendEndpoint;
  }

  async function apiPost(action, payload = {}) {
    const ep = await detectBackend();
    if (ep === "__LOCAL_STATIC_ENGINE__" || state.localPreviewMode) {
      return await localEngineAction(action, payload);
    }

    try {
      const headers = {
        "Content-Type": "application/json",
        "X-Requested-With": "BSW-Admin"
      };
      if (state.token) headers["X-Admin-Token"] = state.token;

      const res = await fetch(ep, {
        method: "POST",
        headers,
        body: JSON.stringify(Object.assign({ action, token: state.token }, payload))
      });

      // Om vi körs i statisk filvisare som returnerar 405 Method Not Allowed eller 404 -> växla direkt till inbyggd motor!
      if (res.status === 405 || res.status === 404 || res.status === 501) {
        state.backendEndpoint = "__LOCAL_STATIC_ENGINE__";
        state.localPreviewMode = true;
        return await localEngineAction(action, payload);
      }

      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (_parseErr) {
        state.backendEndpoint = "__LOCAL_STATIC_ENGINE__";
        state.localPreviewMode = true;
        return await localEngineAction(action, payload);
      }
    } catch (_err) {
      state.backendEndpoint = "__LOCAL_STATIC_ENGINE__";
      state.localPreviewMode = true;
      return await localEngineAction(action, payload);
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function uploadSingleFile(file, folderType, eventSlug = "") {
    const readyFile = file.type && file.type.startsWith("image/") ? await optimizeImageFile(file) : file;
    const ep = await detectBackend();

    if (ep !== "__LOCAL_STATIC_ENGINE__" && !state.localPreviewMode) {
      try {
        const fd = new FormData();
        fd.append("token", state.token);
        fd.append("folder", folderType);
        if (eventSlug) fd.append("eventSlug", eventSlug);
        fd.append("file", readyFile);

        const headers = { "X-Requested-With": "BSW-Admin" };
        if (state.token) headers["X-Admin-Token"] = state.token;

        const res = await fetch(`${ep}?action=upload_asset`, {
          method: "POST",
          headers,
          body: fd
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (_e) {}
    }

    // Fallback för statisk filvisare: koda som optimerad DataURL och spara direkt i lokala lagret
    try {
      const dataUrl = await fileToDataUrl(readyFile);
      const isVid = isVideo(file.name, file.type && file.type.startsWith("video/") ? "video" : "image");
      if (folderType === "gallery") {
        const db = getLocalStore();
        const folderObj = db.folders.find((f) => f.slug === eventSlug) || db.folders[0] || { slug: "ovrigt", name: "Galleri" };
        db.galleryImages.unshift({
          src: dataUrl,
          thumb: dataUrl,
          full: dataUrl,
          title: file.name.replace(/\.[^.]+$/, ""),
          filename: file.name,
          folderSlug: folderObj.slug,
          folderName: folderObj.name,
          type: isVid ? "video" : "image"
        });
        saveLocalJson(LOCAL_STORE_KEY, db, false);
      }
      return { ok: true, path: dataUrl, thumb: dataUrl, type: isVid ? "video" : "image" };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : "Uppladdningen misslyckades." };
    }
  }

  async function loadAllAdminData() {
    const defaults = JSON.parse(JSON.stringify(window.BACKSTAGE_DEFAULT_SETTINGS || {}));
    const ep = await detectBackend();

    if (ep === "__LOCAL_STATIC_ENGINE__" || state.localPreviewMode) {
      const db = getLocalStore();
      state.settings = Object.assign({}, defaults, db.settings || {});
      if (!Array.isArray(state.settings.cars) || !state.settings.cars.length) state.settings.cars = defaults.cars || [];
      if (!Array.isArray(state.settings.bookingPackages) || !state.settings.bookingPackages.length) {
        state.settings.bookingPackages = defaults.bookingPackages || [];
      }
      state.posts = db.posts;
      state.merch = db.merch;
      state.merchShopMode = db.merchShopMode;
      state.merchInterests = db.merchInterests;
      state.merchInterestCounts = db.merchInterestCounts;
      state.printSvgs = db.printSvgs;
      state.merchOrders = db.merchOrders;
      state.subscribers = db.subscribers;
      state.campaigns = db.campaigns;
      state.calendar = db.calendar;
      state.folders = db.folders;
      state.galleryImages = db.galleryImages;
      state.vault = db.vault;
      state.quotes = db.quotes;
      state.reviews = db.reviews;
      state.gastfoto = db.gastfoto || { pending: [], approved: [] };
      state.debugLogs = db.logs;
      return;
    }

    for (const url of ["/api/public", "api/public.php", "/api/admin?action=public_settings"]) {
      try {
        const res = await fetch(url, {
          headers: { "X-Requested-With": "BSW-Admin" },
          cache: "no-store"
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.ok) {
            state.settings = Object.assign({}, defaults, json.settings || {});
            if (!Array.isArray(state.settings.cars) || !state.settings.cars.length) {
              state.settings.cars = defaults.cars || [];
            }
            if (!Array.isArray(state.settings.bookingPackages) || !state.settings.bookingPackages.length) {
              state.settings.bookingPackages = defaults.bookingPackages || [];
            }
            state.posts = Array.isArray(json.posts) && json.posts.length ? json.posts : defaults.defaultPosts || [];
            state.merch = Array.isArray(json.merch) ? json.merch : defaults.defaultMerch || [];
            if (json.merchShopMode) state.merchShopMode = json.merchShopMode;
            if (json.merchInterestCounts) state.merchInterestCounts = json.merchInterestCounts;
            break;
          }
        }
      } catch (_e) {}
    }

    if (!state.authenticated) return;

    try {
      const res = await fetch(`${ep}?action=admin_data`, {
        headers: {
          "X-Admin-Token": state.token,
          "X-Requested-With": "BSW-Admin"
        },
        cache: "no-store"
      });
      if (res.ok) {
        const d = await res.json();
        if (d && d.ok) {
          state.vault = d.vault || {};
          state.calendar = Array.isArray(d.calendar) ? d.calendar : defaults.defaultCalendar || [];
          state.googleItems = Array.isArray(d.googleItems) ? d.googleItems : [];
          state.folders = Array.isArray(d.folders) && d.folders.length ? d.folders : defaults.defaultGalleryFolders || [];
          state.galleryImages = Array.isArray(d.galleryImages) ? d.galleryImages : [];
          if (Array.isArray(d.merch) && d.merch.length) state.merch = d.merch;
          if (d.merchShopMode) state.merchShopMode = d.merchShopMode;
          state.merchInterests = Array.isArray(d.merchInterests) ? d.merchInterests : [];
          state.merchInterestCounts = d.merchInterestCounts || state.merchInterestCounts || {};
          state.printSvgs = Array.isArray(d.printSvgs) && d.printSvgs.length ? d.printSvgs : JSON.parse(JSON.stringify(DEFAULT_PRINT_SVGS));
          state.merchOrders = Array.isArray(d.merchOrders) ? d.merchOrders : [];
          state.subscribers = Array.isArray(d.subscribers) ? d.subscribers : [];
          state.campaigns = Array.isArray(d.campaigns) ? d.campaigns : [];
          state.quotes = Array.isArray(d.quotes) ? d.quotes : [];
          state.reviews = Array.isArray(d.reviews) ? d.reviews : [];
          state.gastfoto = d.gastfoto && Array.isArray(d.gastfoto.pending) ? d.gastfoto : { pending: [], approved: [], dailyUploadsToday: 0 };
          state.debugLogs = Array.isArray(d.logs) ? d.logs : [];
          state.health = d.health || {};
          if (d.icsSubscribeUrl) state.icsSubscribeUrl = d.icsSubscribeUrl;
        }
      }
    } catch (_e) {}

    if (!state.galleryImages.length) {
      for (const gUrl of ["/api/gallery", "api/gallery.php"]) {
        try {
          const gRes = await fetch(gUrl, { cache: "no-store" });
          if (gRes.ok) {
            const gData = await gRes.json();
            if (gData && Array.isArray(gData.images)) {
              state.galleryImages = gData.images;
              if (Array.isArray(gData.folders) && gData.folders.length) state.folders = gData.folders;
              break;
            }
          }
        } catch (_e) {}
      }
      if (!state.galleryImages.length) {
        state.galleryImages = JSON.parse(JSON.stringify(DEFAULT_GALLERY_MEDIA));
      }
    }
  }

  // --------------------------------------------------------------------------
  // INLOGGNINGS- / FÖRSTA LÖSENORDSVY (MED DIREKT VALIDERING & LADDNINGSSTATUS)
  // --------------------------------------------------------------------------
  function renderAuthGate(root) {
    const ps = state.passwordStatus || {};
    const needSetup = !ps.initialized;
    const needRotation = ps.expired || state.forceChangeMode;

    const topNavHtml = `
      <div class="bsw-wp-adminbar">
        <div class="bsw-wp-adminbar-left">
          <span class="bsw-wp-brand">⚡ BACKSTAGE WHEELS · KONTROLLPANEL</span>
        </div>
        <div class="bsw-wp-adminbar-right">
          <a href="index.html" class="bsw-wp-top-link">← Tillbaka till hemsidan</a>
        </div>
      </div>`;

    if (needSetup) {
      root.innerHTML = `
        ${topNavHtml}
        <div class="bsw-admin-auth-card">
          <span class="bsw-kicker">FÖRSTA INLOGGNING · SKAPA LÖSENORD</span>
          <h1 style="margin:6px 0 10px;font-family:var(--font-display);text-transform:uppercase;">
            Välj ditt lösenord till Kontrollpanelen
          </h1>
          <div class="bsw-admin-policy-box">
            <strong>Säkerhetsregler:</strong>
            <ul style="margin:8px 0 0;padding-left:18px;line-height:1.6;">
              <li>Minst <strong>8 tecken</strong> – lagras med saltad kryptografisk hash (PBKDF2-SHA256).</li>
              <li>Roteras automatiskt var <strong>20:e dag</strong>.</li>
              <li>Bekräftelse loggas och aviseras till huvudansvarig <strong>${esc(MASTER_EMAIL)}</strong>.</li>
            </ul>
          </div>

          <div id="bsw-admin-toast-slot">
            ${state.toast ? `<div class="bsw-adm-toast ${state.toast.isError ? "is-error" : "is-ok"}">${esc(state.toast.msg)}</div>` : ""}
          </div>

          <form id="adm-setup-form" class="bsw-admin-auth-form" novalidate>
            <div class="bsw-field">
              <label for="adm-setup-p1">Välj nytt lösenord (minst 8 tecken)</label>
              <div class="bsw-pass-wrap">
                <input type="password" id="adm-setup-p1" name="p1" autocomplete="new-password" placeholder="Skriv minst 8 tecken..." style="flex:1;" autofocus />
                <button type="button" class="bsw-eye-btn" data-toggle-pw="adm-setup-p1">👁️ Visa</button>
              </div>
            </div>

            <div class="bsw-field">
              <label for="adm-setup-p2">Bekräfta lösenord</label>
              <div class="bsw-pass-wrap">
                <input type="password" id="adm-setup-p2" name="p2" autocomplete="new-password" placeholder="Upprepa samma lösenord..." style="flex:1;" />
                <button type="button" class="bsw-eye-btn" data-toggle-pw="adm-setup-p2">👁️ Visa</button>
              </div>
            </div>

            <div id="adm-pw-live-check" class="bsw-pass-checklist">
              <div id="chk-len" class="bsw-pass-check-item">○ Minst 8 tecken (0 / 8)</div>
              <div id="chk-match" class="bsw-pass-check-item">○ Båda lösenordsfälten matchar</div>
            </div>

            <button type="submit" id="adm-setup-submit-btn" class="bsw-btn bsw-btn-primary" style="width:100%;">
              <span>🔑 Spara lösenord &amp; öppna Kontrollpanelen</span>
            </button>
          </form>
        </div>`;

      bindPasswordToggleButtons(root);

      const p1El = document.getElementById("adm-setup-p1");
      const p2El = document.getElementById("adm-setup-p2");
      const chkLen = document.getElementById("chk-len");
      const chkMatch = document.getElementById("chk-match");
      const submitBtn = document.getElementById("adm-setup-submit-btn");

      function updateLiveChecklist() {
        const v1 = (p1El.value || "").trim();
        const v2 = (p2El.value || "").trim();
        const lenOk = v1.length >= 8;
        const matchOk = v1.length > 0 && v1 === v2;

        if (chkLen) {
          chkLen.textContent = `${lenOk ? "✓" : "○"} Minst 8 tecken (${v1.length} / 8)`;
          chkLen.className = "bsw-pass-check-item" + (lenOk ? " is-ok" : "");
        }
        if (chkMatch) {
          chkMatch.textContent = `${matchOk ? "✓" : "○"} Båda lösenordsfälten matchar`;
          chkMatch.className = "bsw-pass-check-item" + (matchOk ? " is-ok" : v2.length > 0 ? " is-warn" : "");
        }
      }

      p1El.addEventListener("input", updateLiveChecklist);
      p2El.addEventListener("input", updateLiveChecklist);

      document.getElementById("adm-setup-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        state.toast = null;
        const v1 = (p1El.value || "").trim();
        const v2 = (p2El.value || "").trim();

        if (v1.length < 8) {
          p1El.focus();
          return showToast(`Lösenordet är för kort (${v1.length} tecken). Välj minst 8 tecken!`, true);
        }
        if (v1 !== v2) {
          p2El.focus();
          return showToast("Lösenorden i de två fälten matchar inte. Kontrollera stavningen (klicka gärna 👁️ Visa).", true);
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = "<span>⏳ Sparar lösenord &amp; öppnar kontrollpanelen...</span>";
        }

        try {
          const r = await apiPost("setup_password", { newPassword: v1 });
          if (!r || !r.ok) {
            // Om lösenord redan satts i en annan flik, växla direkt till inloggningen
            await detectBackend(true);
            if (state.passwordStatus && state.passwordStatus.initialized) {
              state.toast = { msg: "Lösenord är redan skapat – logga in med ditt lösenord nedan.", isError: false };
              render();
              return;
            }
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = "<span>🔑 Spara lösenord &amp; öppna Kontrollpanelen</span>";
            }
            return showToast((r && r.error) || "Kunde inte spara lösenordet. Försök igen.", true);
          }

          state.token = r.token;
          safeSetToken(r.token);
          state.authenticated = true;
          state.passwordStatus = r.passwordStatus || { initialized: true, expired: false, daysLeft: EXPIRY_DAYS };
          state.lastMailNotice = r.mailNotification || null;
          state.toast = {
            msg: "Välkommen in i Kontrollpanelen! Ditt lösenord är sparat och krypterat.",
            isError: false
          };
          await loadAllAdminData();
          render();
        } catch (err) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "<span>🔑 Spara lösenord &amp; öppna Kontrollpanelen</span>";
          }
          showToast("Ett oväntat fel uppstod: " + (err && err.message ? err.message : "försök igen."), true);
        }
      });
      return;
    }

    if (needRotation) {
      root.innerHTML = `
        ${topNavHtml}
        <div class="bsw-admin-auth-card">
          <span class="bsw-kicker">20-DAGARS LÖSENORDSBYTE</span>
          <h1 style="margin:6px 0 10px;font-family:var(--font-display);text-transform:uppercase;">
            Välj ett nytt lösenord
          </h1>
          <p style="color:var(--text-soft);margin-bottom:14px;">
            Av säkerhetsskäl roteras lösenordet var 20:e dag (en notis loggas till <strong>${esc(MASTER_EMAIL)}</strong>).
          </p>
          <div id="bsw-admin-toast-slot">
            ${state.toast ? `<div class="bsw-adm-toast ${state.toast.isError ? "is-error" : "is-ok"}">${esc(state.toast.msg)}</div>` : ""}
          </div>
          <form id="adm-rotate-form" class="bsw-admin-auth-form" novalidate>
            <div class="bsw-field">
              <label for="adm-rot-cur">Nuvarande lösenord</label>
              <div class="bsw-pass-wrap">
                <input type="password" id="adm-rot-cur" name="cur" value="${esc(state.pendingExpiredPassword)}" autocomplete="current-password" placeholder="Ditt nuvarande lösenord..." style="flex:1;" />
                <button type="button" class="bsw-eye-btn" data-toggle-pw="adm-rot-cur">👁️ Visa</button>
              </div>
            </div>
            <div class="bsw-field">
              <label for="adm-rot-np1">Nytt lösenord (minst 8 tecken, ej samma som förra)</label>
              <div class="bsw-pass-wrap">
                <input type="password" id="adm-rot-np1" name="np1" autocomplete="new-password" placeholder="Minst 8 tecken..." style="flex:1;" />
                <button type="button" class="bsw-eye-btn" data-toggle-pw="adm-rot-np1">👁️ Visa</button>
              </div>
            </div>
            <div class="bsw-field">
              <label for="adm-rot-np2">Bekräfta nytt lösenord</label>
              <div class="bsw-pass-wrap">
                <input type="password" id="adm-rot-np2" name="np2" autocomplete="new-password" placeholder="Upprepa det nya lösenordet..." style="flex:1;" />
                <button type="button" class="bsw-eye-btn" data-toggle-pw="adm-rot-np2">👁️ Visa</button>
              </div>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button type="submit" id="adm-rot-submit" class="bsw-btn bsw-btn-primary" style="flex:1;">
                <span>🔄 Uppdatera lösenord &amp; öppna panelen</span>
              </button>
              ${
                state.authenticated && !ps.expired
                  ? `<button type="button" id="adm-cancel-rot-btn" class="bsw-btn bsw-btn-ghost">Avbryt</button>`
                  : ""
              }
            </div>
          </form>
        </div>`;

      bindPasswordToggleButtons(root);

      const cancelRotBtn = document.getElementById("adm-cancel-rot-btn");
      if (cancelRotBtn) {
        cancelRotBtn.addEventListener("click", () => {
          state.forceChangeMode = false;
          render();
        });
      }

      document.getElementById("adm-rotate-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = e.target;
        const cur = (f.cur.value || "").trim();
        const np1 = (f.np1.value || "").trim();
        const np2 = (f.np2.value || "").trim();

        if (!cur) return showToast("Fyll i ditt nuvarande lösenord.", true);
        if (np1.length < 8) return showToast("Det nya lösenordet måste vara minst 8 tecken.", true);
        if (np1 === cur) return showToast("Det nya lösenordet måste skilja sig från det nuvarande.", true);
        if (np1 !== np2) return showToast("De nya lösenorden matchar inte!", true);

        const btn = document.getElementById("adm-rot-submit");
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = "<span>⏳ Uppdaterar lösenord...</span>";
        }

        const r = await apiPost("change_password", {
          currentPassword: cur,
          newPassword: np1
        });
        if (!r || !r.ok) {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = "<span>🔄 Uppdatera lösenord &amp; öppna panelen</span>";
          }
          return showToast((r && r.error) || "Kunde inte byta lösenord.", true);
        }

        state.token = r.token;
        safeSetToken(r.token);
        state.authenticated = true;
        state.forceChangeMode = false;
        state.pendingExpiredPassword = "";
        state.passwordStatus = r.passwordStatus || state.passwordStatus;
        state.lastMailNotice = r.mailNotification || null;
        state.toast = { msg: "Nytt lösenord sparat (giltigt i 20 dagar)!", isError: false };
        await loadAllAdminData();
        render();
      });
      return;
    }

    root.innerHTML = `
      ${topNavHtml}
      <div class="bsw-admin-auth-card">
        <span class="bsw-kicker">GÖMD KONTROLLPANEL · BACKSTAGE WHEELS</span>
        <h1 style="margin:6px 0 10px;font-family:var(--font-display);text-transform:uppercase;">Logga in</h1>
        <p style="color:var(--text-soft);margin-bottom:18px;">
          Här styr du inlägg, bilder &amp; videor, merch, vektor-SVG för tryck, utskick/kampanjer, kalender, bilar och priser.
        </p>
        <div id="bsw-admin-toast-slot">
          ${state.toast ? `<div class="bsw-adm-toast ${state.toast.isError ? "is-error" : "is-ok"}">${esc(state.toast.msg)}</div>` : ""}
        </div>
        <form id="adm-login-form" class="bsw-admin-auth-form" novalidate>
          <div class="bsw-field">
            <label for="adm-login-pw">Lösenord</label>
            <div class="bsw-pass-wrap">
              <input type="password" id="adm-login-pw" name="pw" autocomplete="current-password" placeholder="Ange ditt lösenord..." style="flex:1;" autofocus />
              <button type="button" class="bsw-eye-btn" data-toggle-pw="adm-login-pw">👁️ Visa</button>
            </div>
          </div>
          <button type="submit" id="adm-login-submit" class="bsw-btn bsw-btn-primary" style="width:100%;">
            <span>🔓 Logga in till Kontrollpanelen</span>
          </button>
        </form>
      </div>`;

    bindPasswordToggleButtons(root);

    document.getElementById("adm-login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      state.toast = null;
      const pw = (e.target.pw.value || "").trim();
      if (!pw) return showToast("Ange ditt lösenord för att logga in.", true);

      const btn = document.getElementById("adm-login-submit");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = "<span>⏳ Verifierar lösenord...</span>";
      }

      const r = await apiPost("login", { password: pw });
      if (r && r.requireSetup) {
        state.passwordStatus.initialized = false;
        return render();
      }
      if (r && r.requireChange) {
        state.pendingExpiredPassword = pw;
        state.forceChangeMode = true;
        return render();
      }
      if (!r || !r.ok) {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = "<span>🔓 Logga in till Kontrollpanelen</span>";
        }
        return showToast((r && r.error) || "Felaktigt lösenord.", true);
      }

      state.token = r.token;
      safeSetToken(r.token);
      state.authenticated = true;
      state.passwordStatus = r.passwordStatus || state.passwordStatus;
      await loadAllAdminData();
      render();
    });
  }

  // --------------------------------------------------------------------------
  // MODUL 1: INLÄGGSHANTERING + INFOGA BILDER & VIDEO DIREKT I INLÄGGET
  // --------------------------------------------------------------------------
  function renderPostsTab() {
    const activeSubsCount = state.subscribers.filter((s) => s.active !== false).length;
    const editingPost = state.editingPostId ? state.posts.find((p) => p.id === state.editingPostId) : null;

    const draftMediaHtml = state.postDraftMedia.length
      ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;margin:14px 0;">
          ${state.postDraftMedia
            .map((m, idx) => {
              const vid = isVideo(m.src, m.type);
              return `
              <div style="background:#0c0e15;border:1px solid var(--border-chrome);border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:8px;">
                <div style="aspect-ratio:16/10;background:#000;border-radius:6px;overflow:hidden;position:relative;">
                  ${
                    vid
                      ? `<video src="${esc(m.src)}" muted playsinline style="width:100%;height:100%;object-fit:cover;"></video><span style="position:absolute;top:6px;left:6px;background:#dc2626;color:#fff;font-size:11px;padding:2px 7px;border-radius:4px;">VIDEO</span>`
                      : `<img src="${esc(m.thumb || m.src)}" alt="" style="width:100%;height:100%;object-fit:cover;" />`
                  }
                </div>
                <input type="text" data-draft-caption="${idx}" value="${esc(m.caption || "")}" placeholder="Valfri bild-/videotext..." style="font-size:0.84rem;padding:6px 9px;min-height:34px;" />
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button type="button" class="bsw-icon-action-btn" data-insert-inline-media="${idx}" style="flex:1;justify-content:center;font-size:0.78rem;" title="Infogar denna bild/video exakt där markören står i texten">↵ Infoga i texten</button>
                  <button type="button" class="bsw-icon-action-btn" data-remove-draft-media="${idx}" style="color:#fca5a5;">✕</button>
                </div>
              </div>`;
            })
            .join("")}
        </div>`
      : `<p style="margin:10px 0 0;color:var(--text-muted);font-size:0.9rem;">Inga bilder eller videoklipp har lagts till i utkastet ännu.</p>`;

    const galleryPickerHtml = state.showGalleryPickerForPost
      ? `<div style="margin:14px 0;padding:16px;background:#0b0d14;border:1px solid var(--accent-fire);border-radius:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <strong>Välj bild eller video ur galleriet att infoga i inlägget:</strong>
            <button type="button" class="bsw-icon-action-btn" id="adm-close-gal-picker">Stäng ✕</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;max-height:290px;overflow-y:auto;">
            ${state.galleryImages
              .map(
                (g, gi) => `
              <button type="button" data-pick-gal-idx="${gi}" style="padding:4px;background:#141722;border:1px solid var(--border-steel);border-radius:6px;cursor:pointer;color:#fff;text-align:left;">
                <img src="${esc(g.thumb || g.src)}" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:4px;" />
                <small style="display:block;padding:4px 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;">${g.type === "video" ? "▶ " : ""}${esc(g.title || g.filename || "Media")}</small>
              </button>`
              )
              .join("")}
          </div>
        </div>`
      : "";

    return `
      <div class="bsw-form-card" style="margin-bottom:28px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div>
            <span class="bsw-kicker" style="margin-bottom:6px;">${editingPost ? "REDIGERAR BEFINTLIGT INLÄGG" : "SKAPA NYTT INLÄGG (GULD-BLINKAR FLIKEN INLÄGG FÖR BESÖKARE!)"}</span>
            <h2 style="margin:0;font-family:var(--font-display);text-transform:uppercase;">
              ${editingPost ? "Redigera inlägg: " + esc(editingPost.title) : "Skriv inlägg &amp; infoga bilder / video"}
            </h2>
          </div>
          ${
            editingPost
              ? `<button type="button" id="adm-cancel-edit-post" class="bsw-btn bsw-btn-ghost">Avbryt redigering</button>`
              : `<span class="bsw-days-badge">⚡ Auto-postar till Sociala Medier + ${activeSubsCount} e-postprenumeranter</span>`
          }
        </div>

        <form id="adm-post-form" style="display:grid;gap:16px;">
          <div class="bsw-field">
            <label>Rubrik på inlägget *</label>
            <input type="text" id="adm-post-title" required value="${esc(editingPost ? editingPost.title : "")}" placeholder="T.ex. Magisk lördagskörning i Falun – se bilderna &amp; klippet!" />
          </div>

          <div style="padding:14px;background:rgba(249,115,22,0.08);border:1px dashed rgba(249,115,22,0.45);border-radius:10px;">
            <strong style="display:block;margin-bottom:8px;">📷 Infoga bilder &amp; videoklipp i inlägget:</strong>
            <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
              <label class="bsw-btn bsw-btn-primary" style="cursor:pointer;padding:10px 18px;font-size:0.88rem;">
                <span>+ Ladda upp bild / video från dator eller mobil</span>
                <input type="file" id="adm-post-media-upload" accept="image/*,video/mp4,video/webm,video/quicktime" multiple hidden />
              </label>
              <button type="button" id="adm-open-gal-picker" class="bsw-btn bsw-btn-ghost" style="padding:10px 16px;font-size:0.88rem;">
                <span>🖼️ Välj bild / video från galleriet</span>
              </button>
              <span id="adm-post-upload-status" style="font-size:0.86rem;color:var(--accent-gold);"></span>
            </div>
            ${galleryPickerHtml}
            ${draftMediaHtml}
          </div>

          <div class="bsw-field">
            <label>Inläggstext * <small style="text-transform:none;color:var(--text-muted);">(Klicka ”↵ Infoga i texten” på en bild/video ovan om du vill placera den mitt i texten, annars visas alla bilder/videor snyggt i inlägget automatiskt!)</small></label>
            <textarea id="adm-post-text" rows="6" required placeholder="Skriv om körningen, evenemanget eller nyheten...">${esc(editingPost ? editingPost.text : "")}</textarea>
          </div>

          <div class="bsw-field">
            <label>Hashtags (för Instagram / Facebook)</label>
            <input type="text" id="adm-post-tags" value="${esc(editingPost ? editingPost.hashtags || "" : state.vault.defaultHashtags || "#backstagewheels #hyralimousine #hummerlimo")}" />
          </div>

          <div>
            <button type="submit" class="bsw-btn bsw-btn-primary">
              <span>${editingPost ? "💾 Spara ändringar på inlägget" : "🚀 Publicera på hemsidan + Sociala Medier + E-postprenumeranter"}</span>
            </button>
          </div>
        </form>
      </div>

      <div class="bsw-form-card">
        <h3 style="margin:0 0 16px;font-family:var(--font-display);text-transform:uppercase;">Publicerade inlägg (${state.posts.length})</h3>
        <div style="display:grid;gap:14px;">
          ${state.posts
            .map(
              (p) => `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:14px 16px;background:#0e1018;border:1px solid var(--border-steel);border-radius:10px;">
              <div style="display:flex;align-items:center;gap:14px;min-width:0;flex:1;">
                ${
                  p.media && p.media[0]
                    ? `<img src="${esc(p.media[0].thumb || p.media[0].src)}" alt="" style="width:74px;height:54px;object-fit:cover;border-radius:6px;flex-shrink:0;" />`
                    : ""
                }
                <div style="min-width:0;">
                  <strong style="display:block;font-size:1.04rem;">${esc(p.title)}</strong>
                  <small style="color:var(--text-muted);">${esc(p.createdAt || "")} · ${(p.media || []).length} bild/video</small>
                </div>
              </div>
              <div style="display:flex;gap:8px;">
                <button type="button" class="bsw-icon-action-btn" data-edit-post="${esc(p.id)}">✏️ Redigera</button>
                <button type="button" class="bsw-icon-action-btn" data-del-post="${esc(p.id)}" style="color:#fca5a5;">🗑️ Ta bort</button>
              </div>
            </div>`
            )
            .join("")}
        </div>
      </div>`;
  }

  // --------------------------------------------------------------------------
  // MODUL 2: E-POSTPRENUMERANTER, KAMPANJER & FESTIVALFÖRSLAG
  // --------------------------------------------------------------------------
  function renderNewsletterTab() {
    const activeSubs = state.subscribers.filter((s) => s.active !== false);
    return `
      <div class="bsw-form-card" style="margin-bottom:28px;">
        <span class="bsw-kicker">MERFÖRSÄLJNING · UTSKICK TILL KUNDER</span>
        <h2 style="margin:0 0 8px;font-family:var(--font-display);text-transform:uppercase;">Skicka Kampanjerbjudande eller Festivalförslag</h2>
        <p style="color:var(--text-soft);margin:0 0 18px;">
          Skicka riktade erbjudanden, festivalupplägg och nyheter rakt till inkorgen hos era <strong>${activeSubs.length} aktiva prenumeranter/kunder</strong>.
        </p>

        <div style="margin-bottom:18px;">
          <strong style="display:block;margin-bottom:8px;font-size:0.9rem;color:var(--accent-gold);">Fyll i med 1 klick från färdig säljande mall:</strong>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <button type="button" class="bsw-icon-action-btn" data-camp-tpl="festival">🔥 Sommarens Festivaler</button>
            <button type="button" class="bsw-icon-action-btn" data-camp-tpl="vardag">⚡ Vardags-VIP (5 500 kr/h)</button>
            <button type="button" class="bsw-icon-action-btn" data-camp-tpl="heldag">🎸 Heldag 12 h (25 000 kr)</button>
            <button type="button" class="bsw-icon-action-btn" data-camp-tpl="sponsor">🚀 Sponsorevent (50 000 kr/dag)</button>
            <button type="button" class="bsw-icon-action-btn" data-camp-tpl="oktoberfest">🍺 Oktoberfest T&amp;R (20 000 kr/pers)</button>
          </div>
        </div>

        <form id="adm-campaign-form" style="display:grid;gap:14px;">
          <div class="bsw-form-grid">
            <div class="bsw-field">
              <label>Ämnesrad i mejlet *</label>
              <input type="text" id="camp-subject" required placeholder="T.ex. 🔥 Exklusivt erbjudande inför Sweden Rock &amp; Oktoberfest!" />
            </div>
            <div class="bsw-field">
              <label>Kampanjpris / Erbjudandebadge (valfritt)</label>
              <input type="text" id="camp-price" placeholder="T.ex. Heldag 12 h: 25 000 kr · Vardag 5 500 kr/h" />
            </div>
          </div>

          <div class="bsw-field">
            <label>Rubrik inne i utskicket *</label>
            <input type="text" id="camp-title" required placeholder="T.ex. Säkra Hummer H2 Limousinen till ert nästa event!" />
          </div>

          <div class="bsw-field">
            <label>Kampanjbild i mejlet (valfritt)</label>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
              <input type="text" id="camp-media" value="${esc(state.campaignDraftMedia)}" placeholder="bilder/bilar/hummer-legends-sida.jpg" style="flex:1;min-width:220px;" />
              <label class="bsw-icon-action-btn" style="cursor:pointer;">
                <span>📷 Ladda upp bild</span>
                <input type="file" id="camp-media-file" accept="image/*" hidden />
              </label>
            </div>
          </div>

          <div class="bsw-field">
            <label>Meddelandetext / Erbjudande *</label>
            <textarea id="camp-text" rows="6" required placeholder="Skriv ert erbjudande här..."></textarea>
          </div>

          <div class="bsw-form-grid">
            <div class="bsw-field">
              <label>Text på knapp i mejlet</label>
              <input type="text" id="camp-cta-label" value="Se lediga tider &amp; boka direkt →" />
            </div>
            <div class="bsw-field">
              <label>Knappen länkar till flik</label>
              <select id="camp-cta-hash">
                <option value="#offert">Boka / Offert (#offert)</option>
                <option value="#kalender">Kalender &amp; Lediga Tider (#kalender)</option>
                <option value="#merch">Merch (#merch)</option>
                <option value="#bilar">Bilar &amp; Priser (#bilar)</option>
              </select>
            </div>
          </div>

          <div>
            <button type="submit" class="bsw-btn bsw-btn-primary">
              <span>📨 Skicka ut kampanjen till alla ${activeSubs.length} prenumeranter</span>
            </button>
          </div>
        </form>
      </div>

      <div class="bsw-form-card" style="margin-bottom:28px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
          <h3 style="margin:0;font-family:var(--font-display);text-transform:uppercase;">Registrerade E-postprenumeranter &amp; Kunder (${state.subscribers.length})</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" id="adm-import-cust-btn" class="bsw-icon-action-btn">📥 Importera kunder från Offerter &amp; Merch</button>
            <button type="button" id="adm-export-subs-csv" class="bsw-icon-action-btn">⬇️ Exportera CSV</button>
          </div>
        </div>

        <form id="adm-add-sub-form" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;">
          <input type="text" id="sub-add-name" placeholder="Kundens namn (valfritt)" style="flex:1;min-width:180px;" />
          <input type="email" id="sub-add-email" required placeholder="kund@exempel.se *" style="flex:1.3;min-width:220px;" />
          <button type="submit" class="bsw-btn bsw-btn-ghost" style="padding:10px 18px;">+ Lägg till kund</button>
        </form>

        ${
          !state.subscribers.length
            ? `<p style="color:var(--text-muted);">Inga prenumeranter registrerade ännu. Så fort någon anmäler sig på hemsidan dyker de upp här!</p>`
            : `<div style="display:grid;gap:8px;max-height:360px;overflow-y:auto;">
                ${state.subscribers
                  .map(
                    (s) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;background:#0e1018;border:1px solid var(--border-steel);border-radius:8px;">
                    <div>
                      <strong><a href="mailto:${esc(s.email)}" class="bsw-inline-contact-link">${esc(s.email)}</a></strong>
                      ${s.name ? ` · <span>${esc(s.name)}</span>` : ""}
                      <small style="display:block;color:var(--text-muted);">${s.active === false ? "❌ Avregistrerad" : "✅ Aktiv"} · Källa: ${esc(s.source || "Hemsidan")} · ${esc(s.createdAt || "")}</small>
                    </div>
                    <button type="button" class="bsw-icon-action-btn" data-del-sub="${esc(s.id || s.email)}" style="color:#fca5a5;">Ta bort</button>
                  </div>`
                  )
                  .join("")}
              </div>`
        }
      </div>

      <div class="bsw-form-card">
        <h3 style="margin:0 0 12px;font-family:var(--font-display);text-transform:uppercase;">Senaste utskick &amp; automatiska inläggsmejl (${state.campaigns.length})</h3>
        ${
          !state.campaigns.length
            ? `<p style="color:var(--text-muted);">Inga utskick har gjorts ännu.</p>`
            : state.campaigns
                .map(
                  (c) => `
                <div style="padding:10px 14px;border-bottom:1px solid var(--border-steel);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                  <div>
                    <strong>${esc(c.subject)}</strong>
                    <small style="display:block;color:var(--text-muted);">${c.kind === "new_post" ? "Automatiskt inläggsutskick" : "Kampanjutskick"} · ${c.recipientCount || 0} mottagare</small>
                  </div>
                  <span style="color:var(--text-muted);font-size:0.85rem;">${esc(c.sentAt || "")}</span>
                </div>`
                )
                .join("")
        }
      </div>`;
  }

  // --------------------------------------------------------------------------
  // MODUL 3: MERCH ("KOMMER SNART" / SHOP) & REDIGERBARA VEKTOR-SVG ORIGINAL
  // --------------------------------------------------------------------------
  function renderMerchTab() {
    const editingItem = state.editingMerchIdx >= 0 ? state.merch[state.editingMerchIdx] : null;
    const previewImg = state.merchDraftImage || (editingItem ? editingItem.image : "");
    const isComingSoon = state.merchShopMode !== "live";
    const activeSvg = state.editingSvgFilename
      ? state.printSvgs.find((s) => s.filename === state.editingSvgFilename) || null
      : null;

    return `
      <!-- 1. LÄGESVAL FÖR MERCH-SIDAN -->
      <div class="bsw-form-card" style="margin-bottom:28px;border-color:rgba(249,115,22,0.5);">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
          <div>
            <span class="bsw-kicker">MERCH-SIDANS LÄGE PÅ HEMSIDAN</span>
            <h2 style="margin:0 0 6px;font-family:var(--font-display);text-transform:uppercase;">
              Just nu: ${isComingSoon ? "🔥 KOMMER SNART (Visar designs &amp; samlar intresse)" : "✅ ÖPPEN SHOP (Tar emot beställningar)"}
            </h2>
            <p style="margin:0;color:var(--text-soft);max-width:680px;">
              I <strong>Kommer snart</strong>-läget ser besökarna era plagg/designs och kan rösta / anmäla intresse på vilka varor och storlekar de vill köpa. När ni är redo växlar du till öppen försäljning med ett klick!
            </p>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" class="bsw-btn ${isComingSoon ? "bsw-btn-primary" : "bsw-btn-ghost"}" data-set-merch-mode="coming_soon">
              <span>🔥 Kommer snart (Intresse)</span>
            </button>
            <button type="button" class="bsw-btn ${!isComingSoon ? "bsw-btn-primary" : "bsw-btn-ghost"}" data-set-merch-mode="live">
              <span>✅ Öppna försäljning</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 2. TRYCKMATERIAL I REDIGERBAR VEKTORISERAD SVG -->
      <div class="bsw-form-card" style="margin-bottom:28px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:14px;margin-bottom:18px;">
          <div>
            <span class="bsw-kicker">🔒 ENDAST ÅTKOMLIGT I KONTROLLPANELEN</span>
            <h2 style="margin:0 0 6px;font-family:var(--font-display);text-transform:uppercase;">
              Tryckoriginal i Redigerbar Vektoriserad SVG (${state.printSvgs.length} st)
            </h2>
            <p style="margin:0;color:var(--text-soft);">
              100 % skalbara vektorfiler (<code>.svg</code>) med lager och redigerbara texter för tryckeri, screentryck, DTG, 3D-brodyr och baksätes-QR. Skyddade mot publik åtkomst.
            </p>
          </div>
          <label class="bsw-btn bsw-btn-primary" style="cursor:pointer;">
            <span>+ Ladda upp ny .SVG-vektorfil</span>
            <input type="file" id="adm-upload-svg-file" accept=".svg,image/svg+xml" hidden />
          </label>
        </div>

        ${
          activeSvg
            ? `
          <div style="padding:20px;margin-bottom:22px;background:#0d0f17;border:2px solid var(--accent-fire);border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
              <h3 style="margin:0;font-family:var(--font-display);text-transform:uppercase;">
                ✏️ Redigera Vektor-SVG: ${esc(activeSvg.title)} (${esc(activeSvg.filename)})
              </h3>
              <button type="button" class="bsw-btn bsw-btn-ghost" id="adm-close-svg-editor">Stäng redigerare</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;align-items:start;">
              <div>
                <div class="bsw-field" style="margin-bottom:10px;">
                  <label>Titel / Namn på tryckoriginal</label>
                  <input type="text" id="svg-edit-title" value="${esc(activeSvg.title)}" />
                </div>
                <div class="bsw-field" style="margin-bottom:10px;">
                  <label>Användningsområde (t.ex. T-shirt bröst, Ryggtryck, Kepsbrodyr)</label>
                  <input type="text" id="svg-edit-usage" value="${esc(activeSvg.usage)}" />
                </div>
                <div class="bsw-field" style="margin-bottom:10px;">
                  <label>Tryckmått / Notering</label>
                  <input type="text" id="svg-edit-dim" value="${esc(activeSvg.dimensions)}" />
                </div>
                <div class="bsw-field">
                  <label>Redigerbar Vektor-SVG-kod (ändra t.ex. &lt;text&gt;, färger eller lager direkt)</label>
                  <textarea id="svg-edit-code" rows="12" style="font-family:monospace;font-size:0.84rem;">${esc(activeSvg.svgContent)}</textarea>
                </div>
                <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
                  <button type="button" class="bsw-btn bsw-btn-primary" id="adm-save-svg-btn" data-fn="${esc(activeSvg.filename)}">
                    💾 Spara vektororiginal (.SVG)
                  </button>
                  <button type="button" class="bsw-btn bsw-btn-ghost" id="adm-preview-svg-btn">
                    🔄 Uppdatera förhandsvisning
                  </button>
                </div>
              </div>
              <div>
                <strong style="display:block;margin-bottom:8px;">Live Vektor-förhandsvisning:</strong>
                <div id="adm-svg-live-preview" style="padding:20px;border-radius:10px;background:repeating-conic-gradient(#1a1d29 0% 25%, #11131b 0% 50%) 50% / 24px 24px;border:1px solid var(--border-chrome);display:grid;place-items:center;min-height:320px;overflow:hidden;">
                  <div style="width:100%;max-width:340px;">${activeSvg.svgContent}</div>
                </div>
              </div>
            </div>
          </div>`
            : ""
        }

        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px;">
          ${state.printSvgs
            .map(
              (svg, i) => `
            <div style="background:#0e1018;border:1px solid var(--border-steel);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;">
              <div style="height:210px;padding:16px;background:repeating-conic-gradient(#1a1d29 0% 25%, #10121a 0% 50%) 50% / 20px 20px;display:grid;place-items:center;overflow:hidden;border-bottom:1px solid var(--border-steel);">
                <div class="adm-svg-thumb-box" style="width:100%;height:100%;display:grid;place-items:center;">
                  ${svg.svgContent}
                </div>
              </div>
              <div style="padding:16px;display:flex;flex-direction:column;gap:6px;flex:1;">
                <strong style="font-size:1.02rem;">${esc(svg.title)}</strong>
                <span style="font-size:0.86rem;color:var(--accent-gold);">${esc(svg.usage)}</span>
                <small style="color:var(--text-muted);">${esc(svg.dimensions)} · Fil: <code>${esc(svg.filename)}</code></small>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:auto;padding-top:12px;">
                  <button type="button" class="bsw-icon-action-btn" data-dl-svg="${i}" style="border-color:var(--accent-fire);color:#fff;">
                    ⬇️ Ladda ner .SVG
                  </button>
                  <button type="button" class="bsw-icon-action-btn" data-edit-svg="${esc(svg.filename)}">
                    ✏️ Redigera SVG
                  </button>
                  <button type="button" class="bsw-icon-action-btn" data-del-svg="${esc(svg.filename)}" style="color:#fca5a5;">
                    🗑️
                  </button>
                </div>
              </div>
            </div>`
            )
            .join("")}
        </div>
      </div>

      <!-- 3. LÄGG TILL / REDIGERA MERCH-VARA -->
      <div class="bsw-form-card" style="margin-bottom:28px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div>
            <span class="bsw-kicker">FYLL PÅ MERCH-FLIKEN (#MERCH)</span>
            <h2 style="margin:0;font-family:var(--font-display);text-transform:uppercase;">
              ${editingItem ? "Redigera design / vara: " + esc(editingItem.name) : "Lägg till ny Merch-design / vara"}
            </h2>
          </div>
          ${editingItem ? `<button type="button" id="adm-cancel-merch-edit" class="bsw-btn bsw-btn-ghost">Avbryt redigering</button>` : ""}
        </div>

        <form id="adm-merch-form" style="display:grid;gap:14px;">
          <div class="bsw-form-grid">
            <div class="bsw-field">
              <label>Produktnamn / Designnamn *</label>
              <input type="text" id="m-name" required value="${esc(editingItem ? editingItem.name : "")}" placeholder="T.ex. Backstage Wheels Legends Tour T-Shirt" />
            </div>
            <div class="bsw-field">
              <label>Planerat pris i kr *</label>
              <input type="number" id="m-price" min="1" required value="${esc(editingItem ? editingItem.price : "349")}" />
            </div>
          </div>

          <div class="bsw-form-grid">
            <div class="bsw-field">
              <label>Storlekar / Varianter (separera med kommatecken)</label>
              <input type="text" id="m-sizes" value="${esc(editingItem && Array.isArray(editingItem.sizes) ? editingItem.sizes.join(", ") : "S, M, L, XL, XXL")}" placeholder="S, M, L, XL, XXL eller One Size" />
            </div>
            <div class="bsw-field">
              <label>Status &amp; Märke</label>
              <div style="display:flex;gap:8px;">
                <select id="m-stock" style="flex:1;">
                  <option value="coming_soon" ${!editingItem || editingItem.stockStatus === "coming_soon" ? "selected" : ""}>Kommer snart (Intresse)</option>
                  <option value="in_stock" ${editingItem && editingItem.stockStatus === "in_stock" ? "selected" : ""}>I lager</option>
                  <option value="limited" ${editingItem && editingItem.stockStatus === "limited" ? "selected" : ""}>Begränsat antal</option>
                  <option value="sold_out" ${editingItem && editingItem.stockStatus === "sold_out" ? "selected" : ""}>Slutsåld</option>
                </select>
                <input type="text" id="m-badge" value="${esc(editingItem ? editingItem.badge || "" : "KOMMER SNART")}" placeholder="Märke, t.ex. KOMMER SNART" style="flex:1;" />
              </div>
            </div>
          </div>

          <div class="bsw-field">
            <label>Produkt- / Designbild *</label>
            <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
              ${previewImg ? `<img src="${esc(previewImg)}" alt="" style="width:88px;height:88px;object-fit:cover;border-radius:8px;border:1px solid var(--border-chrome);" />` : ""}
              <input type="text" id="m-image" required value="${esc(previewImg)}" placeholder="bilder/merch/..." style="flex:1;min-width:200px;" />
              <label class="bsw-btn bsw-btn-ghost" style="cursor:pointer;padding:10px 16px;">
                <span>📷 Ladda upp designbild</span>
                <input type="file" id="m-image-file" accept="image/*" hidden />
              </label>
            </div>
          </div>

          <div class="bsw-field">
            <label>Beskrivning *</label>
            <textarea id="m-desc" rows="3" required placeholder="Beskriv material, passform och tryck...">${esc(editingItem ? editingItem.description : "")}</textarea>
          </div>

          <div>
            <button type="submit" class="bsw-btn bsw-btn-primary">
              <span>${editingItem ? "💾 Uppdatera vara" : "+ Lägg till i Merch-fliken"}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- 4. AKTUELLA PRODUKTER + INTRESSERÄKNARE -->
      <div class="bsw-form-card" style="margin-bottom:28px;">
        <h3 style="margin:0 0 14px;font-family:var(--font-display);text-transform:uppercase;">Varor på Merch-sidan &amp; Antal Intresserade (${state.merch.length})</h3>
        <div style="display:grid;gap:12px;">
          ${state.merch
            .map((item, idx) => {
              const votes = Number(state.merchInterestCounts[item.id] || 0);
              return `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;padding:12px 16px;background:#0e1018;border:1px solid var(--border-steel);border-radius:10px;">
              <div style="display:flex;align-items:center;gap:14px;">
                <img src="${esc(item.image || "bilder/merch/backstage-tshirt.jpg")}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:6px;" />
                <div>
                  <strong>${esc(item.name)} — <span style="color:var(--accent-gold);">${esc(item.price)} kr</span></strong>
                  <small style="display:block;color:var(--text-muted);">Storlekar: ${esc((item.sizes || []).join(", "))} · <strong style="color:var(--accent-fire);">🔥 ${votes} intressemarkeringar</strong></small>
                </div>
              </div>
              <div style="display:flex;gap:8px;">
                <button type="button" class="bsw-icon-action-btn" data-edit-merch="${idx}">✏️ Redigera</button>
                <button type="button" class="bsw-icon-action-btn" data-del-merch="${idx}" style="color:#fca5a5;">🗑️ Ta bort</button>
              </div>
            </div>`;
            })
            .join("")}
        </div>
      </div>

      <!-- 5. INKOMNA INTRESSEANMÄLNINGAR & BESTÄLLNINGAR -->
      <div class="bsw-form-card" style="margin-bottom:28px;">
        <h3 style="margin:0 0 14px;font-family:var(--font-display);text-transform:uppercase;">
          Inkomna Intresseanmälningar med E-post / Storlek (${state.merchInterests.filter((x) => !x.quickVote).length} st, totalt ${state.merchInterests.length} klick)
        </h3>
        ${
          !state.merchInterests.filter((x) => !x.quickVote).length
            ? `<p style="color:var(--text-muted);">Inga formulär-intresseanmälningar ännu – så fort en besökare skickar in vilken design och storlek de vill ha syns den här!</p>`
            : state.merchInterests
                .filter((x) => !x.quickVote)
                .map(
                  (it) => `
                <div style="padding:12px 14px;margin-bottom:10px;background:#0e1018;border:1px solid var(--border-steel);border-radius:8px;">
                  <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                    <strong>🔥 ${esc(it.productName)} (Storlek: ${esc(it.size || "-")})</strong>
                    <small style="color:var(--text-muted);">${esc(it.createdAt)}</small>
                  </div>
                  <div style="margin-top:4px;font-size:0.92rem;color:var(--text-soft);">
                    Namn: <strong>${esc(it.customerName || "-")}</strong> ·
                    ${it.email ? `<a href="${esc(mailtoHref(it.email, "Backstage Wheels Merch"))}" class="bsw-inline-contact-link">✉ ${esc(it.email)}</a>` : ""}
                    ${it.comment ? `<br/>Önskemål: <em>${esc(it.comment)}</em>` : ""}
                  </div>
                </div>`
                )
                .join("")
        }
      </div>

      <div class="bsw-form-card">
        <h3 style="margin:0 0 14px;font-family:var(--font-display);text-transform:uppercase;">Inkomna Merch-beställningar (${state.merchOrders.length})</h3>
        ${
          !state.merchOrders.length
            ? `<p style="color:var(--text-muted);">Inga merch-beställningar har kommit in ännu.</p>`
            : state.merchOrders
                .map(
                  (o) => `
                <div style="padding:14px;margin-bottom:10px;background:#0e1018;border:1px solid var(--border-steel);border-radius:8px;">
                  <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                    <strong>${esc(o.quantity)}x ${esc(o.productName)} (Stl: ${esc(o.size)}) — <span style="color:var(--accent-gold);">${esc(o.totalPrice)} kr</span></strong>
                    <small style="color:var(--text-muted);">${esc(o.receivedAt)}</small>
                  </div>
                  <div style="margin-top:6px;font-size:0.92rem;color:var(--text-soft);">
                    Beställare: <strong>${esc(o.customerName)}</strong> ·
                    <a href="${esc(telHref(o.phone))}" class="bsw-inline-contact-link">📞 ${esc(o.phone || "-")}</a> ·
                    <a href="${esc(mailtoHref(o.email, "Din Merch-beställning hos Backstage Wheels"))}" class="bsw-inline-contact-link">✉ ${esc(o.email)}</a>
                    ${o.address ? `<br/>Leveransadress: ${esc(o.address)}` : ""}
                    ${o.message ? `<br/>Notering: ${esc(o.message)}` : ""}
                  </div>
                </div>`
                )
                .join("")
        }
      </div>`;
  }

  // --------------------------------------------------------------------------
  // MODUL 4: BILDUPPLADDNING & EVENEMANGSMAPPAR
  // --------------------------------------------------------------------------
  function renderFoldersTab() {
    return `
      <div class="bsw-form-card" style="margin-bottom:28px;">
        <span class="bsw-kicker">BILDER &amp; VIDEO (AUTOMATISK WEBP-OPTIMERING)</span>
        <h2 style="margin:0 0 12px;font-family:var(--font-display);text-transform:uppercase;">1. Ladda upp bilder &amp; videor till Evenemangsmapp</h2>
        <div class="bsw-form-grid" style="align-items:end;">
          <div class="bsw-field">
            <label>Välj målmapp för uppladdning</label>
            <select id="adm-gal-target-folder">
              ${state.folders.map((f) => `<option value="${esc(f.slug)}">📂 ${esc(f.name)}</option>`).join("")}
            </select>
          </div>
          <div class="bsw-field">
            <label class="bsw-btn bsw-btn-primary" style="cursor:pointer;width:100%;">
              <span>📤 Välj bilder / MP4-videor att ladda upp</span>
              <input type="file" id="adm-gal-upload-files" accept="image/*,video/mp4,video/webm,video/quicktime" multiple hidden />
            </label>
          </div>
        </div>
        <p id="adm-gal-upload-msg" style="margin:10px 0 0;color:var(--accent-gold);font-size:0.9rem;"></p>
      </div>

      <div class="bsw-form-card" style="margin-bottom:28px;">
        <h3 style="margin:0 0 12px;font-family:var(--font-display);text-transform:uppercase;">2. Skapa eller hantera Evenemangsmappar (${state.folders.length} st)</h3>
        <form id="adm-create-folder-form" class="bsw-form-grid" style="margin-bottom:18px;">
          <div class="bsw-field">
            <label>Mappnamn / Evenemang *</label>
            <input type="text" id="nf-name" required placeholder="T.ex. Classic Car Week Rättvik 2027" />
          </div>
          <div class="bsw-field">
            <label>År / Datum (valfritt)</label>
            <input type="text" id="nf-date" placeholder="T.ex. Sommaren 2027" />
          </div>
          <div class="bsw-field bsw-field-full">
            <label>Kort beskrivning av mappen</label>
            <input type="text" id="nf-desc" placeholder="T.ex. Bilder och klipp från cruisingen och VIP-körningarna i Rättvik." />
          </div>
          <div>
            <button type="submit" class="bsw-btn bsw-btn-ghost">+ Skapa evenemangsmapp</button>
          </div>
        </form>

        <div style="display:grid;gap:8px;">
          ${state.folders
            .map(
              (f) => `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;background:#0e1018;border:1px solid var(--border-steel);border-radius:8px;">
              <div>
                <strong>📂 ${esc(f.name)}</strong> <small style="color:var(--text-muted);">(${esc(f.slug)})</small>
                ${f.description ? `<small style="display:block;color:var(--text-soft);">${esc(f.description)}</small>` : ""}
              </div>
              <button type="button" class="bsw-icon-action-btn" data-del-folder="${esc(f.slug)}" style="color:#fca5a5;">Ta bort tom mapp</button>
            </div>`
            )
            .join("")}
        </div>
      </div>

      <div class="bsw-form-card">
        <h3 style="margin:0 0 14px;font-family:var(--font-display);text-transform:uppercase;">Alla uppladdade filer i galleriet (${state.galleryImages.length} st)</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:12px;">
          ${state.galleryImages
            .map(
              (img) => `
            <div style="background:#0e1018;border:1px solid var(--border-steel);border-radius:8px;overflow:hidden;display:flex;flex-direction:column;">
              <img src="${esc(img.thumb || img.src)}" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;" />
              <div style="padding:8px 10px;display:flex;flex-direction:column;gap:6px;flex:1;">
                <small style="color:var(--accent-gold);">📂 ${esc(img.folderName || img.folderSlug)}</small>
                <strong style="font-size:0.82rem;word-break:break-word;">${esc(img.title || img.filename)}</strong>
                <button type="button" class="bsw-icon-action-btn" data-del-gal-media="${esc(img.src)}" style="margin-top:auto;color:#fca5a5;justify-content:center;font-size:0.78rem;">🗑️ Ta bort fil</button>
              </div>
            </div>`
            )
            .join("")}
        </div>
      </div>`;
  }

  // --------------------------------------------------------------------------
  // MODUL 5: KALENDER & GOOGLE KALENDER
  // --------------------------------------------------------------------------
  function renderCalendarTab() {
    return `
      <div class="bsw-form-card" style="margin-bottom:28px;">
        <span class="bsw-kicker">KALENDER &amp; LEDIGA TIDER</span>
        <h2 style="margin:0 0 12px;font-family:var(--font-display);text-transform:uppercase;">Lägg in Bokning, Delvis Ledig Kväll eller Evenemang</h2>
        <form id="adm-cal-add-form" class="bsw-form-grid">
          <div class="bsw-field">
            <label>Startdatum *</label>
            <input type="date" id="cal-date" required />
          </div>
          <div class="bsw-field">
            <label>Slutdatum (samma som start om 1 dag)</label>
            <input type="date" id="cal-end" />
          </div>
          <div class="bsw-field">
            <label>Typ</label>
            <select id="cal-kind">
              <option value="booking">Kundbokning / Pass</option>
              <option value="event">Publikt Evenemang / Festival</option>
            </select>
          </div>
          <div class="bsw-field">
            <label>Tillgänglighet i kalendern</label>
            <select id="cal-avail">
              <option value="partial">Guld: Delvis bokad (Pass kvar!)</option>
              <option value="booked">Röd: Fullbokad hela kvällen</option>
              <option value="free">Grön: Öppen / Bokningsbar</option>
            </select>
          </div>
          <div class="bsw-field">
            <label>Publik rubrik *</label>
            <input type="text" id="cal-title" required placeholder="T.ex. Pass 1 bokat – Pass 2 &amp; Pass 3 LEDIGA!" />
          </div>
          <div class="bsw-field">
            <label>Tider &amp; Ort</label>
            <div style="display:flex;gap:8px;">
              <input type="text" id="cal-slot" placeholder="T.ex. Från kl. 20:00 LEDIG" style="flex:1;" />
              <input type="text" id="cal-loc" placeholder="Ort, t.ex. Falun" style="flex:1;" />
            </div>
          </div>
          <div class="bsw-field bsw-field-full">
            <label>Beskrivning (visas vid klick på dagen / evenemanget)</label>
            <input type="text" id="cal-desc" placeholder="Valfri extra info..." />
          </div>
          <div>
            <button type="submit" class="bsw-btn bsw-btn-primary">+ Spara i kalendern</button>
          </div>
        </form>
      </div>

      <div class="bsw-form-card" style="margin-bottom:28px;">
        <h3 style="margin:0 0 8px;font-family:var(--font-display);text-transform:uppercase;">Google Kalender-koppling (Tvåvägs .ics)</h3>
        <p style="color:var(--text-soft);font-size:0.92rem;margin:0 0 12px;">
          Klistra in ”Hemlig adress i iCal-format (.ics)” från din Google Kalender nedan för automatisk import, eller prenumerera på hemsidans kalender i mobilen via: <code>${esc(state.icsSubscribeUrl)}</code>
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <input type="url" id="adm-gcal-url" placeholder="${esc(state.vault.googleCalendarMasked || "https://calendar.google.com/calendar/ical/.../basic.ics")}" style="flex:1;min-width:240px;" />
          <button type="button" id="adm-save-gcal-btn" class="bsw-btn bsw-btn-ghost">Spara &amp; Synka Google Kalender</button>
        </div>
      </div>

      <div class="bsw-form-card">
        <h3 style="margin:0 0 14px;font-family:var(--font-display);text-transform:uppercase;">Inlagda datum &amp; evenemang (${state.calendar.length})</h3>
        <div style="display:grid;gap:10px;">
          ${state.calendar
            .map(
              (c, idx) => `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 14px;background:#0e1018;border:1px solid var(--border-steel);border-radius:8px;">
              <div>
                <strong>${esc(c.date)}${c.endDate && c.endDate !== c.date ? " → " + esc(c.endDate) : ""} · ${esc(c.publicTitle)}</strong>
                <small style="display:block;color:var(--accent-gold);">${esc(c.timeSlot || "")} ${c.location ? "· " + esc(c.location) : ""}</small>
                ${c.description ? `<small style="display:block;color:var(--text-muted);">${esc(c.description)}</small>` : ""}
              </div>
              <button type="button" class="bsw-icon-action-btn" data-del-cal="${idx}" style="color:#fca5a5;">🗑️ Ta bort</button>
            </div>`
            )
            .join("")}
        </div>
      </div>`;
  }

  // --------------------------------------------------------------------------
  // MODUL 6: BILAR, PRISER & BOKNINGSPAKET (INKL. PUNKTLISTOR / VILLKOR)
  // --------------------------------------------------------------------------
  function renderCarsAndPricesTab() {
    const pkgs = state.settings.bookingPackages || [];
    const cars = state.settings.cars || [];

    return `
      <div class="bsw-form-card" style="margin-bottom:28px;">
        <span class="bsw-kicker">PRISER &amp; PAKETKORT PÅ HEMSIDAN</span>
        <h2 style="margin:0 0 8px;font-family:var(--font-display);text-transform:uppercase;">Redigera Priser &amp; Bokningspaket (${pkgs.length} st)</h2>
        <p style="margin:0 0 16px;color:var(--text-soft);">
          Ändra rubrik, prisrad, beskrivning och punktlista (en punkt per rad) för Vardag, Helg, Heldag, Sponsorevent och Oktoberfest.
        </p>
        <div style="display:grid;gap:16px;">
          ${pkgs
            .map(
              (pk, idx) => `
            <div style="padding:16px;background:#0e1018;border:1px solid var(--border-steel);border-radius:10px;display:grid;gap:10px;">
              <div class="bsw-form-grid">
                <div class="bsw-field">
                  <label>Märke / Badge överst</label>
                  <input type="text" data-pkg-field="badge" data-pkg-idx="${idx}" value="${esc(pk.badge || "")}" />
                </div>
                <div class="bsw-field">
                  <label>Paketrubrik</label>
                  <input type="text" data-pkg-field="title" data-pkg-idx="${idx}" value="${esc(pk.title || "")}" />
                </div>
              </div>
              <div class="bsw-field">
                <label>Prisrad</label>
                <input type="text" data-pkg-field="price" data-pkg-idx="${idx}" value="${esc(pk.price || "")}" />
              </div>
              <div class="bsw-field">
                <label>Beskrivning</label>
                <textarea rows="2" data-pkg-field="desc" data-pkg-idx="${idx}">${esc(pk.desc || "")}</textarea>
              </div>
              <div class="bsw-field">
                <label>Punktlista / Villkor (skriv en punkt per rad)</label>
                <textarea rows="3" data-pkg-highlights="${idx}">${esc(Array.isArray(pk.highlights) ? pk.highlights.join("\n") : "")}</textarea>
              </div>
            </div>`
            )
            .join("")}
        </div>
        <button type="button" id="adm-save-pkgs-btn" class="bsw-btn bsw-btn-primary" style="margin-top:16px;">💾 Spara alla priser &amp; paket</button>
      </div>

      <div class="bsw-form-card">
        <h2 style="margin:0 0 14px;font-family:var(--font-display);text-transform:uppercase;">Redigera Fordon (${cars.length})</h2>
        <div style="display:grid;gap:20px;">
          ${cars
            .map(
              (car, ci) => `
            <div style="padding:18px;background:#0e1018;border:1px solid var(--border-steel);border-radius:10px;display:grid;gap:12px;">
              <div class="bsw-form-grid">
                <div class="bsw-field">
                  <label>Bilens namn</label>
                  <input type="text" data-car-field="name" data-car-idx="${ci}" value="${esc(car.name || "")}" />
                </div>
                <div class="bsw-field">
                  <label>Prissammanfattning på bilen</label>
                  <input type="text" data-car-field="price" data-car-idx="${ci}" value="${esc(car.price || "")}" />
                </div>
              </div>
              <div class="bsw-field">
                <label>Ingress / Underrubrik</label>
                <input type="text" data-car-field="lead" data-car-idx="${ci}" value="${esc(car.lead || "")}" />
              </div>
              <div class="bsw-field">
                <label>Beskrivning</label>
                <textarea rows="3" data-car-field="description" data-car-idx="${ci}">${esc(car.description || "")}</textarea>
              </div>
              <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
                <img src="${esc((car.mainImage && car.mainImage.src) || "bilder/bilar/hummer-legends-sida.jpg")}" alt="" style="width:120px;height:76px;object-fit:cover;border-radius:6px;border:1px solid var(--border-chrome);" />
                <label class="bsw-icon-action-btn" style="cursor:pointer;">
                  <span>📷 Byt huvudbild på bilen</span>
                  <input type="file" data-car-upload="${ci}" accept="image/*" hidden />
                </label>
              </div>
            </div>`
            )
            .join("")}
        </div>
        <button type="button" id="adm-save-cars-btn" class="bsw-btn bsw-btn-primary" style="margin-top:16px;">💾 Spara fordonsändringar</button>
      </div>`;
  }

  // --------------------------------------------------------------------------
  // MODUL 7: SOCIALA MEDIER (AES-256-KRYPTERAD AUTOPOSTNING)
  // --------------------------------------------------------------------------
  function renderVaultTab() {
    const v = state.vault || {};
    return `
      <div class="bsw-form-card">
        <span class="bsw-kicker">🔒 AES-256-GCM SERVERKRYPTERAT VALV</span>
        <h2 style="margin:0 0 8px;font-family:var(--font-display);text-transform:uppercase;">Automatisk Postning till Sociala Medier</h2>
        <p style="color:var(--text-soft);margin:0 0 16px;">
          Alla API-nycklar lagras AES-256-GCM-krypterade på servern och exponeras aldrig utåt. Varje nytt inlägg du publicerar delas automatiskt till dina aktiverade kanaler!
        </p>

        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px;">
          <span class="bsw-days-badge" style="border-color:${v.instagramConnected ? "rgba(34,197,94,0.5)" : "rgba(148,163,184,0.35)"};">
            Instagram: ${v.instagramConnected ? "✅ Ansluten" : "Ej konfigurerad"}
          </span>
          <span class="bsw-days-badge" style="border-color:${v.facebookConnected ? "rgba(34,197,94,0.5)" : "rgba(148,163,184,0.35)"};">
            Facebook: ${v.facebookConnected ? "✅ Ansluten" : "Ej konfigurerad"}
          </span>
          <span class="bsw-days-badge" style="border-color:${v.webhookConnected ? "rgba(34,197,94,0.5)" : "rgba(148,163,184,0.35)"};">
            Webhook (Make/Zapier): ${v.webhookConnected ? "✅ Ansluten" : "Ej konfigurerad"}
          </span>
        </div>

        <form id="adm-vault-form" style="display:grid;gap:16px;">
          <div class="bsw-form-grid">
            <div class="bsw-field">
              <label>Instagram Business Account ID</label>
              <input type="text" id="v-ig-id" value="${esc(v.instagramAccountId || "")}" placeholder="T.ex. 1784140..." />
            </div>
            <div class="bsw-field">
              <label>Instagram Access Token ${v.instagramTokenMasked ? "(" + esc(v.instagramTokenMasked) + ")" : ""}</label>
              <input type="password" id="v-ig-tok" placeholder="Lämna tomt för att behålla befintlig token" />
            </div>
          </div>

          <div class="bsw-form-grid">
            <div class="bsw-field">
              <label>Facebook Page ID</label>
              <input type="text" id="v-fb-id" value="${esc(v.facebookPageId || "")}" placeholder="Sidans ID..." />
            </div>
            <div class="bsw-field">
              <label>Facebook Page Access Token ${v.facebookTokenMasked ? "(" + esc(v.facebookTokenMasked) + ")" : ""}</label>
              <input type="password" id="v-fb-tok" placeholder="Lämna tomt för att behålla befintlig token" />
            </div>
          </div>

          <div class="bsw-form-grid">
            <div class="bsw-field">
              <label>Make.com / Zapier Webhook-URL (för TikTok, IG, FB m.fl.)</label>
              <input type="url" id="v-wh-url" placeholder="${esc(v.webhookUrlMasked || "https://hook.eu1.make.com/...")}" />
            </div>
            <div class="bsw-field">
              <label>Webhook HMAC-hemlighet ${v.webhookSecretMasked ? "(" + esc(v.webhookSecretMasked) + ")" : ""}</label>
              <input type="password" id="v-wh-sec" placeholder="Valfri signeringsnyckel" />
            </div>
          </div>

          <div class="bsw-field">
            <label>Standard-hashtags</label>
            <input type="text" id="v-tags" value="${esc(v.defaultHashtags || "#backstagewheels #hyralimousine #hummerlimo")}" />
          </div>

          <div>
            <button type="submit" class="bsw-btn bsw-btn-primary">🔒 Kryptera &amp; Spara Sociala Medier-kopplingar</button>
          </div>
        </form>
      </div>`;
  }

  // --------------------------------------------------------------------------
  // MODUL 8: KONTAKT, LOGOTYP & OFFERTER
  // --------------------------------------------------------------------------
  function renderContactAndQuotesTab() {
    const s = state.settings;
    return `
      <div class="bsw-form-card" style="margin-bottom:28px;">
        <span class="bsw-kicker">KONTAKTUPPGIFTER, LOGOTYP &amp; INSTAGRAM</span>
        <h2 style="margin:0 0 14px;font-family:var(--font-display);text-transform:uppercase;">Ändra telefon, e-post &amp; logotyp</h2>
        <form id="adm-contact-form" style="display:grid;gap:14px;">
          <div class="bsw-form-grid">
            <div class="bsw-field">
              <label>Telefonnummer (klickbart på hela sidan)</label>
              <input type="text" id="c-phone" value="${esc(s.contactPhone || "")}" />
            </div>
            <div class="bsw-field">
              <label>E-postadress för bokning &amp; offerter</label>
              <input type="text" id="c-email" value="${esc(s.contactEmail || "")}" />
            </div>
          </div>

          <div class="bsw-form-grid">
            <div class="bsw-field">
              <label>Utgångsort / Körområde</label>
              <input type="text" id="c-region" value="${esc(s.homeRegion || "")}" />
            </div>
            <div class="bsw-field">
              <label>Instagram-länk (uppdaterar även QR-koden automatiskt)</label>
              <input type="url" id="c-ig" value="${esc(s.instagramUrl || "")}" />
            </div>
          </div>

          <div class="bsw-form-grid">
            <div class="bsw-field">
              <label>Google-recensionslänk (omdömes-knapp på hemsidan)</label>
              <input type="url" id="c-google-rev" value="${esc(s.googleReviewUrl || "")}" placeholder="https://g.page/r/.../review" />
            </div>
            <div class="bsw-field">
              <label>🤖 BW Bot: påminnelse antal timmar före bokning</label>
              <input type="number" id="c-rem-hours" min="1" max="72" value="${esc((s.reminderSettings && s.reminderSettings.hoursBefore) || (s.smsSettings && s.smsSettings.hoursBefore) || 24)}" />
            </div>
          </div>

          <div class="bsw-field">
            <label>Egen Logotyp (visas i sidhuvudet, sidfoten &amp; på kontaktsidan)</label>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
              <input type="text" id="c-logo" value="${esc(s.logoUrl || "")}" placeholder="Lämna tomt för blixt-emblemet eller ladda upp logotyp..." style="flex:1;" />
              <label class="bsw-icon-action-btn" style="cursor:pointer;">
                <span>📷 Ladda upp logotyp</span>
                <input type="file" id="c-logo-file" accept="image/*" hidden />
              </label>
            </div>
          </div>

          <div>
            <button type="submit" class="bsw-btn bsw-btn-primary">💾 Spara kontaktuppgifter &amp; logotyp</button>
          </div>
        </form>
      </div>

      <div class="bsw-form-card">
        <h3 style="margin:0 0 14px;font-family:var(--font-display);text-transform:uppercase;">Inkomna Offertförfrågningar (${state.quotes.length})</h3>
        ${
          !state.quotes.length
            ? `<p style="color:var(--text-muted);">Inga offertförfrågningar registrerade ännu. När en kund skickar in offertformuläret sparas den här!</p>`
            : state.quotes
                .map(
                  (q) => `
                <div style="padding:14px;margin-bottom:10px;background:#0e1018;border:1px solid var(--border-steel);border-radius:8px;">
                  <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                    <strong>📅 ${esc(q.datum || "-")} ${q.tid ? "kl. " + esc(q.tid) : ""} · ${esc(q.eventTyp || "")} (${esc(q.kortid || "")})</strong>
                    <small style="color:var(--text-muted);">${esc(q.receivedAt || "")}</small>
                  </div>
                  <div style="margin-top:6px;font-size:0.92rem;color:var(--text-soft);">
                    Kund: <strong>${esc(q.namn || "-")}</strong> ·
                    <a href="${esc(telHref(q.telefon))}" class="bsw-inline-contact-link">📞 ${esc(q.telefon || "-")}</a> ·
                    <a href="${esc(mailtoHref(q.epost, "Svar på din offertförfrågan – Backstage Wheels"))}" class="bsw-inline-contact-link">✉ ${esc(q.epost || "-")}</a><br/>
                    Sträcka: ${esc(q.fran || "-")} → ${esc(q.till || "-")} (${esc(q.passagerare || "-")} passagerare)
                    ${q.meddelande ? `<br/>Önskemål: ${esc(q.meddelande)}` : ""}
                  </div>
                  <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                    <button type="button" class="bsw-btn bsw-btn-ghost" data-quote-receipt="${esc(idx)}">🧾 Kvitto / Faktura</button>
                    <button type="button" class="bsw-icon-action-btn" data-quote-reviewmail="${esc(idx)}">⭐ Mejla recensionsförfrågan</button>
                  </div>
                </div>`
                )
                .join("")
        }
      </div>`;
  }

  // --------------------------------------------------------------------------
  // MODUL 9B: KUNDOMDÖMEN (GOOGLE-RECENSIONER)
  // --------------------------------------------------------------------------
  function renderReviewsTab() {
    const s = state.settings;
    const reviews = Array.isArray(state.reviews) ? state.reviews : [];
    const stars = (n) => "★".repeat(Math.max(1, Math.min(5, Number(n) || 5)));

    return `
      <div class="bsw-form-card" style="margin-bottom:28px;">
        <span class="bsw-kicker">GOOGLE-RECENSIONER · AUTO-INSAMLING</span>
        <h2 style="margin:0 0 10px;font-family:var(--font-display);text-transform:uppercase;">Kundomdömen & recensioner</h2>
        <p style="color:var(--text-soft);">
          Samla in och visa kundomdömen på hemsidan (kontaktfliken). Fyll i din Google-recensionslänk
          (Maps → din profil → "Skriv en recension" → kopiera länken) och skicka recensionsförfrågningar
          per mejl efter genomförda körningar.
        </p>
        <form id="adm-reviews-settings-form" style="display:grid;gap:12px;margin-top:14px;">
          <div class="bsw-field">
            <label>Google-recensionslänk (publik CTA-knapp på hemsidan)</label>
            <input type="url" id="rev-google-url" value="${esc(s.googleReviewUrl || "")}" placeholder="https://g.page/r/.../review" />
          </div>
          <div><button type="submit" class="bsw-btn bsw-btn-primary"><span>Spara Google-länk</span></button></div>
        </form>
        <form id="adm-review-request-form" style="display:grid;gap:12px;margin-top:18px;border-top:1px solid var(--border-steel);padding-top:16px;">
          <div class="bsw-form-grid">
            <div class="bsw-field">
              <label>Kundens e-post</label>
              <input type="email" id="rev-req-email" required placeholder="kund@example.com" />
            </div>
            <div class="bsw-field">
              <label>Kundens namn (valfritt)</label>
              <input type="text" id="rev-req-name" placeholder="T ex Maggans 40-årsfirande" />
            </div>
          </div>
          <div><button type="submit" class="bsw-btn bsw-btn-primary"><span>✉ Skicka recensionsförfrågan</span></button></div>
        </form>
      </div>

      <div class="bsw-form-card">
        <h3 style="margin:0 0 14px;font-family:var(--font-display);text-transform:uppercase;">Recensioner som visas på hemsidan (${reviews.length})</h3>
        <form id="adm-review-add-form" style="display:grid;gap:12px;border:1px dashed var(--border-steel);border-radius:10px;padding:14px;margin-bottom:16px;">
          <div class="bsw-form-grid">
            <div class="bsw-field">
              <label>Namn</label>
              <input type="text" id="rev-new-name" required placeholder="T ex Johan B." />
            </div>
            <div class="bsw-field">
              <label>Betyg (1–5)</label>
              <select id="rev-new-stars">
                <option value="5" selected>★★★★★ (5)</option>
                <option value="4">★★★★ (4)</option>
                <option value="3">★★★ (3)</option>
                <option value="2">★★ (2)</option>
                <option value="1">★ (1)</option>
              </select>
            </div>
          </div>
          <div class="bsw-field">
            <label>Recensionstext</label>
            <textarea id="rev-new-text" rows="3" required placeholder="Vilken upplevelse! ..." style="width:100%;box-sizing:border-box;"></textarea>
          </div>
          <div class="bsw-form-grid">
            <div class="bsw-field">
              <label>Datum</label>
              <input type="text" id="rev-new-date" value="${esc(new Date().toLocaleDateString("sv-SE"))}" />
            </div>
            <div class="bsw-field">
              <label>Källa</label>
              <select id="rev-new-source">
                <option selected>Google</option>
                <option>Instagram</option>
                <option>Facebook</option>
                <option>Mejl</option>
              </select>
            </div>
          </div>
          <div><button type="submit" class="bsw-btn bsw-btn-ghost"><span>＋ Lägg till recension</span></button></div>
        </form>

        ${
          !reviews.length
            ? `<p style="color:var(--text-muted);">Inga recensioner lagrade ännu. Lägg till den första ovan – den syns direkt på hemsidan.</p>`
            : reviews
                .map(
                  (r, i) => `
                <div style="padding:14px;margin-bottom:10px;background:#0e1018;border:1px solid var(--border-steel);border-radius:8px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                  <div style="flex:1;min-width:240px;">
                    <div><span style="color:#f59e0b;letter-spacing:2px;">${stars(r.stars)}</span> <strong>${esc(r.name)}</strong> <small style="color:var(--text-muted);">${esc(r.date || "")} · ${esc(r.source || "Google")}${r.status === "hidden" ? " · 🙈 DOLD" : ""}</small></div>
                    <p style="margin:6px 0 0;color:var(--text-soft);font-size:0.92rem;">${esc(r.text)}</p>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:6px;">
                    <button type="button" class="bsw-icon-action-btn" data-review-toggle="${esc(i)}">${r.status === "hidden" ? "👁 Visa" : "🙈 Dölj"}</button>
                    <button type="button" class="bsw-icon-action-btn" data-review-del="${esc(i)}">🗑 Radera</button>
                  </div>
                </div>`
                )
                .join("")
        }
      </div>`;
  }

  // --------------------------------------------------------------------------
  // MODUL 9C: GÄSTFOTO VIA QR (MODERERAT FOTOLÄGE)
  // --------------------------------------------------------------------------
  function renderGuestPhotoTab() {
    const gf = state.gastfoto || { pending: [], approved: [] };
    const approvedCount = Array.isArray(gf.approved) ? gf.approved.length : 0;

    return `
      <div class="bsw-form-card" style="margin-bottom:28px;">
        <span class="bsw-kicker">MODERERAT FOTOLÄGE · QR I LIMOUSINEN</span>
        <h2 style="margin:0 0 10px;font-family:var(--font-display);text-transform:uppercase;">Gästfoto via QR</h2>
        <p style="color:var(--text-soft);">
          Gäster skannar QR-koden i limousinen och laddar upp foton på <code>/gastfoto</code>.
          Inget publiceras förrän <strong>du</strong> godkänt bilden här. Godkända bilder hamnar i
          gallerimappen <strong>"Gästfoton via QR"</strong> på hemsidan automatiskt.
        </p>
        <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:14px;">
          <img
            src="/api/gastfoto-qr"
            alt="QR-kod till gästfoto-sidan"
            width="150"
            height="150"
            style="border-radius:10px;border:1px solid var(--border-steel);background:#fff;padding:8px;"
            onerror="this.style.display='none'"
          />
          <div style="display:grid;gap:8px;">
            <code style="user-select:all;">${esc(location.origin + "/gastfoto")}</code>
            <button type="button" class="bsw-btn bsw-btn-ghost" id="gf-copy-link">📋 Kopiera länk</button>
            <small style="color:var(--text-muted);">Skriv ut QR-koden & rama in den vid baren i limousinen (t ex på akrylskydden från fliken Merch & Vektor-SVG).</small>
          </div>
        </div>
      </div>

      <div class="bsw-form-card" style="margin-bottom:28px;">
        <h3 style="margin:0 0 14px;font-family:var(--font-display);text-transform:uppercase;">Väntar på granskning (${gf.pending.length})</h3>
        ${
          !gf.pending.length
            ? `<p style="color:var(--text-muted);">Inga nya gästfoton i kön just nu.</p>`
            : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">` +
              gf.pending
                .map(
                  (m) => `
                <div style="background:#0e1018;border:1px solid var(--border-steel);border-radius:10px;overflow:hidden;">
                  <img loading="lazy" src="/api/admin?action=gastfoto_photo&file=${encodeURIComponent(m.filename)}&token=${encodeURIComponent(state.token || "")}" alt="${esc(m.caption || "Gästfoto")}" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block;" />
                  <div style="padding:10px;">
                    <small style="color:var(--text-muted);display:block;">${esc(m.name || "Anonym gäst")} · ${esc(m.receivedAt || "")}</small>
                    <small style="color:var(--text-soft);display:block;margin:4px 0 8px;">${esc(m.caption || "")}</small>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                      <button type="button" class="bsw-btn bsw-btn-primary" data-gf-approve="${esc(m.filename)}"><span>✓ Godkänn</span></button>
                      <button type="button" class="bsw-icon-action-btn" data-gf-reject="${esc(m.filename)}">🗑 Avvisa</button>
                    </div>
                  </div>
                </div>`
                )
                .join("") +
              `</div>`
        }
      </div>

      <div class="bsw-form-card">
        <h3 style="margin:0 0 14px;font-family:var(--font-display);text-transform:uppercase;">Godkända gästfoton (${approvedCount}) · uppladdningar idag: ${esc(gf.dailyUploadsToday || 0)}</h3>
        ${
          !approvedCount
            ? `<p style="color:var(--text-muted);">Inga godkända gästfoton ännu.</p>`
            : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;">` +
              gf.approved
                .map(
                  (m) => `
                <div style="background:#0e1018;border:1px solid var(--border-steel);border-radius:10px;overflow:hidden;">
                  <img loading="lazy" src="bilder/galleri/gastfoton/${encodeURIComponent(m.filename)}" alt="${esc(m.caption || "Gästfoto")}" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block;" />
                  <div style="padding:8px;display:grid;gap:6px;">
                    <small style="color:var(--text-muted);">${esc(m.caption || m.name || "")}</small>
                    <button type="button" class="bsw-icon-action-btn" data-gf-delete="${esc(m.filename)}">🗑 Radera</button>
                  </div>
                </div>`
                )
                .join("") +
              `</div>`
        }
      </div>`;
  }

  // --------------------------------------------------------------------------
  // MODUL 9: SÄKERHET, 20-DAGARS LÖSENORD & FELSÖKNINGSLOGG
  // --------------------------------------------------------------------------
  function renderSecurityAndLogsTab() {
    const h = state.health || {};
    const filteredLogs = state.debugLogs.filter((l) => {
      if (state.logFilter !== "ALL" && String(l.level || "").toUpperCase() !== state.logFilter) return false;
      if (state.logSearch) {
        const q = state.logSearch.toLowerCase();
        const hay = `${l.level || ""} ${l.category || ""} ${l.message || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return `
      <div class="bsw-diag-stats-grid" style="margin-bottom:24px;">
        <div class="bsw-form-card" style="padding:16px;">
          <small style="color:var(--text-muted);text-transform:uppercase;">Lösenordsrotation</small>
          <strong style="display:block;font-size:1.35rem;color:var(--accent-gold);margin-top:4px;">${esc(state.passwordStatus.daysLeft)} dagar kvar</strong>
        </div>
        <div class="bsw-form-card" style="padding:16px;">
          <small style="color:var(--text-muted);text-transform:uppercase;">Gallerifiler / Mappar</small>
          <strong style="display:block;font-size:1.35rem;margin-top:4px;">${esc(h.galleryCount != null ? h.galleryCount : state.galleryImages.length)} st / ${esc(h.foldersCount != null ? h.foldersCount : state.folders.length)} mappar</strong>
        </div>
        <div class="bsw-form-card" style="padding:16px;">
          <small style="color:var(--text-muted);text-transform:uppercase;">Media på disk</small>
          <strong style="display:block;font-size:1.35rem;margin-top:4px;">${esc(h.mediaTotalMb != null ? h.mediaTotalMb + " MB" : "Aktiv")}</strong>
        </div>
        <div class="bsw-form-card" style="padding:16px;">
          <small style="color:var(--text-muted);text-transform:uppercase;">Kryptering</small>
          <strong style="display:block;font-size:1.35rem;color:#86efac;margin-top:4px;">AES-256-GCM ✓</strong>
        </div>
      </div>

      <div class="bsw-form-card" style="margin-bottom:28px;">
        <span class="bsw-kicker">BW BOT · EGEN AVISERING · 100% GRATIS · INGEN EXTERN TJÄNST</span>
        <h2 style="margin:0 0 10px;font-family:var(--font-display);text-transform:uppercase;">🤖 BW Bot — bevakar bokningar åt dig</h2>
        <p id="bot-status-line" style="color:var(--text-soft);">
          Bevakar bokningar, nya offerter &amp; gästfoton så länge panelen är öppen. Pollar var 60:e sekund när fliken visas (energisnålt).
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button type="button" id="bot-enable-btn" class="bsw-btn bsw-btn-ghost">🔔 Aktivera webbläsar-notiser</button>
          <button type="button" id="bot-test-btn" class="bsw-icon-action-btn">✅ Testa bot nu</button>
        </div>
        <small style="display:block;margin-top:8px;color:var(--text-muted);">
          Boten är din enda aviseringskanal (gratis, innebyggd i panelen — SMS &amp; Telegram-tjänster är borttagna). Panelen måste vara öppen för att boten ska bepermalink.
        </small>
      </div>

      <div class="bsw-form-card" style="margin-bottom:28px;">
        <span class="bsw-kicker">LÖSENORD &amp; 20-DAGARSREGEL</span>
        <h2 style="margin:0 0 10px;font-family:var(--font-display);text-transform:uppercase;">Lösenordsstatus &amp; Byte</h2>
        <p style="color:var(--text-soft);">
          Dagar kvar till nästa obligatoriska lösenordsbyte: <strong>${esc(state.passwordStatus.daysLeft)} dagar</strong>
          ${state.passwordStatus.expiresAtIso ? `(giltigt t.o.m. ${esc(state.passwordStatus.expiresAtIso)})` : ""}.
          Alla lösenordsbyten aviseras till <strong>${esc(MASTER_EMAIL)}</strong>.
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button type="button" id="adm-force-pw-btn" class="bsw-btn bsw-btn-ghost">🔑 Byt lösenord nu</button>
          <button type="button" id="adm-sim-20d-btn" class="bsw-icon-action-btn">⏱️ Simulera 20-dagars utgång</button>
        </div>
      </div>

      <div class="bsw-form-card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <h3 style="margin:0;font-family:var(--font-display);text-transform:uppercase;">Skyddad System- &amp; Felsökningslogg (${filteredLogs.length} / ${state.debugLogs.length})</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <select id="adm-log-filter" style="padding:7px 10px;min-height:36px;">
              <option value="ALL" ${state.logFilter === "ALL" ? "selected" : ""}>Alla nivåer</option>
              <option value="ERROR" ${state.logFilter === "ERROR" ? "selected" : ""}>ERROR</option>
              <option value="WARN" ${state.logFilter === "WARN" ? "selected" : ""}>WARN</option>
              <option value="SECURITY" ${state.logFilter === "SECURITY" ? "selected" : ""}>SECURITY</option>
              <option value="MEDIA" ${state.logFilter === "MEDIA" ? "selected" : ""}>MEDIA</option>
              <option value="INFO" ${state.logFilter === "INFO" ? "selected" : ""}>INFO</option>
            </select>
            <button type="button" id="adm-clear-logs-btn" class="bsw-icon-action-btn">🧹 Rensa logg</button>
          </div>
        </div>
        <div class="bsw-debug-log-table-wrap">
          ${
            !filteredLogs.length
              ? `<p style="padding:16px;margin:0;color:var(--text-muted);">Inga logghändelser att visa.</p>`
              : filteredLogs
                  .map(
                    (l) => `
                  <details class="bsw-log-row">
                    <summary>
                      <span class="bsw-log-badge lvl-${String(l.level || "info").toLowerCase().slice(0, 3)}">${esc(l.level)}</span>
                      <span class="bsw-log-cat">[${esc(l.category)}]</span>
                      <span class="bsw-log-msg" style="flex:1;">${esc(l.message)}</span>
                      <span class="bsw-log-time" style="color:var(--text-muted);">${esc(l.timeSv || l.ts || "")}</span>
                    </summary>
                    ${l.details ? `<pre class="bsw-log-details" style="margin:0;padding:10px 14px;background:#06070b;color:#cbd5e1;overflow-x:auto;">${esc(JSON.stringify(l.details, null, 2))}</pre>` : ""}
                  </details>`
                  )
                  .join("")
          }
        </div>
      </div>`;
  }

  // --------------------------------------------------------------------------
  // HUVUDRENDERING AV KONTROLLPANELEN (TOPPBAR + SIDOMENY + ÖVERSIKT)
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // BW BOT — EGEN GRATIS AVISERING I WEBBLÄSAREN (ingen extern tjänst, ingen avgift)
  // --------------------------------------------------------------------------
  const BOT_SHOWN_KEY = "bsw_bot_shown_v1";
  const BOT_STATE = { timer: null, running: false, lastCheck: null, shownCount: 0 };

  function botSeenSet() {
    const out = new Set();
    try {
      const arr = JSON.parse(localStorage.getItem(BOT_SHOWN_KEY) || "[]");
      const cutoff = Date.now() - 3 * 24 * 3600 * 1000;
      (Array.isArray(arr) ? arr : []).forEach((x) => {
        if (x && x.k && x.ts && x.ts > cutoff) out.add(x.k);
      });
    } catch (_e) {}
    return out;
  }

  function botMarkShown(key) {
    try {
      const arr = JSON.parse(localStorage.getItem(BOT_SHOWN_KEY) || "[]");
      const cutoff = Date.now() - 3 * 24 * 3600 * 1000;
      const kept = (Array.isArray(arr) ? arr : []).filter((x) => x && x.k && x.ts && x.ts > cutoff);
      kept.push({ k: key, ts: Date.now() });
      if (kept.length > 300) kept.splice(0, kept.length - 300);
      localStorage.setItem(BOT_SHOWN_KEY, JSON.stringify(kept));
    } catch (_e) {}
  }

  function botBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
      setTimeout(() => ctx.close(), 600);
    } catch (_e) {}
  }

  function botNotify(title, body, tag) {
    botBeep();
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        const n = new Notification(title, { body, tag: tag || "bw-bot", icon: "bilder/app-icon-192.png" });
        n.onclick = () => {
          try {
            window.focus();
            n.close();
          } catch (_e) {}
        };
      }
    } catch (_e) {}
    showToast(`🤖 ${title} — ${body}`);
  }

  async function botPoll() {
    if (document.hidden || !state.authenticated || !state.token) return;
    try {
      const ep = await detectBackend();
      if (ep === "__LOCAL_STATIC_ENGINE__") return;
      const res = await fetch(`${ep}?action=bot_feed&token=${encodeURIComponent(state.token || "")}`, {
        headers: { "X-Admin-Token": state.token, "X-Requested-With": "BSW-Admin" },
        cache: "no-store"
      });
      if (!res.ok) return;
      const d = await res.json();
      if (!d || !d.ok) return;
      BOT_STATE.lastCheck = new Date();
      const seen = botSeenSet();
      let newCount = 0;
      for (const rem of Array.isArray(d.dueReminders) ? d.dueReminders : []) {
        if (!rem || !rem.key || seen.has(rem.key)) continue;
        botMarkShown(rem.key);
        newCount += 1;
        botNotify(
          `Bokning om ${rem.minutesUntil} min`,
          `${rem.title} · ${rem.date} kl ${rem.time}`,
          rem.key
        );
      }
      BOT_STATE.shownCount += newCount;
      updateBotCard();
    } catch (_e) {}
  }

  function ensureBotRunning() {
    if (BOT_STATE.running) return;
    BOT_STATE.running = true;
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) botPoll(); // energisnålt: pollar bara när panelen faktiskt visas
    });
    BOT_STATE.timer = setInterval(botPoll, 60 * 1000);
    setTimeout(botPoll, 4000);
  }

  function updateBotCard() {
    const el = document.getElementById("bot-status-line");
    if (!el) return;
    const perm =
      "Notification" in window
        ? Notification.permission === "granted"
          ? "✅ Notiser på"
          : Notification.permission === "denied"
            ? "⛔ Blockerade"
            : "⚠️ Ej aktiverade"
        : "ℹ️ Inget notis-stöd (toast används)";
    el.innerHTML = `Bevakar bokningar, nya offerter &amp; gästfoton så länge panelen är öppen. ${perm} · Senaste kontroll: ${
      BOT_STATE.lastCheck ? BOT_STATE.lastCheck.toLocaleTimeString("sv-SE") : "–"
    } · Visade händelser: ${BOT_STATE.shownCount}`;
  }

  function render() {
    const root = document.getElementById("bsw-admin-root");
    if (!root) return;

    if (!state.authenticated || state.forceChangeMode || state.passwordStatus.expired) {
      renderAuthGate(root);
      return;
    }

    const activeSubsCount = state.subscribers.filter((s) => s.active !== false).length;
    const totalMerchVotes = Object.values(state.merchInterestCounts || {}).reduce((acc, n) => acc + Number(n || 0), 0);

    const menuItems = [
      { id: "posts", label: `📝 Inlägg & Media (${state.posts.length})` },
      { id: "newsletter", label: `📧 Utskick & Kunder (${activeSubsCount})` },
      { id: "merch", label: `👕 Merch & Vektor-SVG (${state.merch.length})` },
      { id: "folders", label: `📂 Bilder & Mappar (${state.galleryImages.length})` },
      { id: "calendar", label: `📅 Kalender (${state.calendar.length})` },
      { id: "cars", label: "🚘 Bilar, Priser & Paket" },
      { id: "vault", label: "🔐 Sociala Medier (Auto)" },
      { id: "contact", label: `📞 Kontakt & Offerter (${state.quotes.length})` },
      { id: "reviews", label: `⭐ Omdömen (${state.reviews.length})` },
      { id: "gastfoto", label: `🖼️ Gästfoto via QR (${state.gastfoto.pending.length})` },
      { id: "logs", label: "🛡️ Lösenord & Systemlogg" }
    ];

    let contentHtml = "";
    if (state.activeSubTab === "posts") contentHtml = renderPostsTab();
    else if (state.activeSubTab === "newsletter") contentHtml = renderNewsletterTab();
    else if (state.activeSubTab === "merch") contentHtml = renderMerchTab();
    else if (state.activeSubTab === "folders") contentHtml = renderFoldersTab();
    else if (state.activeSubTab === "calendar") contentHtml = renderCalendarTab();
    else if (state.activeSubTab === "cars") contentHtml = renderCarsAndPricesTab();
    else if (state.activeSubTab === "vault") contentHtml = renderVaultTab();
    else if (state.activeSubTab === "contact") contentHtml = renderContactAndQuotesTab();
    else if (state.activeSubTab === "reviews") contentHtml = renderReviewsTab();
    else if (state.activeSubTab === "gastfoto") contentHtml = renderGuestPhotoTab();
    else contentHtml = renderSecurityAndLogsTab();

    root.innerHTML = `
      <header class="bsw-wp-adminbar">
        <div class="bsw-wp-adminbar-left">
          <span class="bsw-wp-brand">⚡ BACKSTAGE WHEELS · KONTROLLPANEL</span>
          <a href="index.html" class="bsw-wp-top-link">↗ Öppna publika hemsidan</a>
        </div>
        <div class="bsw-wp-adminbar-right">
          <span class="bsw-wp-expiry-pill">🔑 ${esc(state.passwordStatus.daysLeft)} dagar kvar på lösenord</span>
          <button type="button" id="adm-logout-btn" class="bsw-wp-logout-btn">Logga ut</button>
        </div>
      </header>

      <div class="bsw-wp-layout">
        <aside class="bsw-wp-sidebar">
          <div class="bsw-wp-userbox">
            <strong>Inloggad Administratör</strong>
            <span>● Krypterad session aktiv</span>
          </div>
          <nav class="bsw-wp-menu" role="tablist" aria-label="Kontrollpanelens sektioner">
            ${menuItems
              .map(
                (m) => `
              <button type="button" class="bsw-wp-menu-item ${state.activeSubTab === m.id ? "is-active" : ""}" data-adm-tab="${m.id}">
                ${esc(m.label)}
              </button>`
              )
              .join("")}
          </nav>
        </aside>

        <main class="bsw-wp-content">
          <div class="bsw-admin-kpi-strip">
            <button type="button" class="bsw-admin-kpi-card" data-adm-tab="posts">
              <small>Publicerade inlägg</small>
              <strong>${state.posts.length} st</strong>
            </button>
            <button type="button" class="bsw-admin-kpi-card" data-adm-tab="merch">
              <small>Merch &amp; Intresse</small>
              <strong>${state.merch.length} varor · 🔥 ${totalMerchVotes}</strong>
            </button>
            <button type="button" class="bsw-admin-kpi-card" data-adm-tab="merch">
              <small>Vektor-SVG Original</small>
              <strong>${state.printSvgs.length} filer</strong>
            </button>
            <button type="button" class="bsw-admin-kpi-card" data-adm-tab="contact">
              <small>Offertförfrågningar</small>
              <strong>${state.quotes.length} st</strong>
            </button>
          </div>

          ${
            state.lastMailNotice
              ? `<div class="bsw-admin-mail-alert">
                  <div>
                    <strong>Avisering för ${esc(MASTER_EMAIL)}:</strong> Lösenordsvalet är sparat och loggat (giltigt t.o.m. ${esc(state.lastMailNotice.nextDue || "")}).
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <a href="${esc(mailtoHref(MASTER_EMAIL, state.lastMailNotice.subject, state.lastMailNotice.body))}" class="bsw-btn bsw-btn-ghost" style="padding:8px 14px;font-size:0.84rem;">Skicka kopia via e-postprogram</a>
                    <button type="button" id="adm-dismiss-mail-alert" class="bsw-icon-action-btn">Stäng ✕</button>
                  </div>
                </div>`
              : ""
          }

          <div id="bsw-admin-toast-slot">
            ${state.toast ? `<div class="bsw-adm-toast ${state.toast.isError ? "is-error" : "is-ok"}">${esc(state.toast.msg)}</div>` : ""}
          </div>

          <div>${contentHtml}</div>
        </main>
      </div>`;

    bindEvents();
    ensureBotRunning(); // BW Bot: startar bevakningen så fort panelen är inloggad
  }

  function bindEvents() {
    document.querySelectorAll("[data-adm-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.toast = null;
        state.activeSubTab = btn.getAttribute("data-adm-tab");
        render();
      });
    });

    const dismissMailBtn = document.getElementById("adm-dismiss-mail-alert");
    if (dismissMailBtn) {
      dismissMailBtn.addEventListener("click", () => {
        state.lastMailNotice = null;
        render();
      });
    }

    const logoutBtn = document.getElementById("adm-logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        state.token = "";
        state.authenticated = false;
        safeClearToken();
        state.toast = { msg: "Du har loggat ut ur kontrollpanelen.", isError: false };
        render();
      });
    }

    // --- INLÄGG & INFOGA BILDER/VIDEO ---
    const postUploadInp = document.getElementById("adm-post-media-upload");
    if (postUploadInp) {
      postUploadInp.addEventListener("change", async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const statusEl = document.getElementById("adm-post-upload-status");
        const curTitle = (document.getElementById("adm-post-title") || {}).value || "";
        const curText = (document.getElementById("adm-post-text") || {}).value || "";
        const curTags = (document.getElementById("adm-post-tags") || {}).value || "";

        if (statusEl) statusEl.textContent = `Laddar upp & optimerar ${files.length} fil(er)...`;
        for (const f of files) {
          const r = await uploadSingleFile(f, "post");
          if (r && r.ok) {
            state.postDraftMedia.push({
              src: r.path,
              thumb: r.thumb || r.path,
              type: r.type || (isVideo(r.path) ? "video" : "image"),
              caption: ""
            });
          }
        }
        render();
        if (document.getElementById("adm-post-title")) document.getElementById("adm-post-title").value = curTitle;
        if (document.getElementById("adm-post-text")) document.getElementById("adm-post-text").value = curText;
        if (document.getElementById("adm-post-tags")) document.getElementById("adm-post-tags").value = curTags;
        showToast("Bild/video uppladdad och tillagd i inlägget!");
      });
    }

    const openGalPicker = document.getElementById("adm-open-gal-picker");
    if (openGalPicker) {
      openGalPicker.addEventListener("click", () => {
        state.showGalleryPickerForPost = !state.showGalleryPickerForPost;
        render();
      });
    }
    const closeGalPicker = document.getElementById("adm-close-gal-picker");
    if (closeGalPicker) {
      closeGalPicker.addEventListener("click", () => {
        state.showGalleryPickerForPost = false;
        render();
      });
    }

    document.querySelectorAll("[data-pick-gal-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const g = state.galleryImages[Number(btn.getAttribute("data-pick-gal-idx"))];
        if (!g) return;
        const curTitle = (document.getElementById("adm-post-title") || {}).value || "";
        const curText = (document.getElementById("adm-post-text") || {}).value || "";
        const curTags = (document.getElementById("adm-post-tags") || {}).value || "";
        state.postDraftMedia.push({
          src: g.full || g.src,
          thumb: g.thumb || g.src,
          type: g.type || (isVideo(g.src) ? "video" : "image"),
          caption: g.title || ""
        });
        state.showGalleryPickerForPost = false;
        render();
        if (document.getElementById("adm-post-title")) document.getElementById("adm-post-title").value = curTitle;
        if (document.getElementById("adm-post-text")) document.getElementById("adm-post-text").value = curText;
        if (document.getElementById("adm-post-tags")) document.getElementById("adm-post-tags").value = curTags;
      });
    });

    document.querySelectorAll("[data-draft-caption]").forEach((inp) => {
      inp.addEventListener("input", () => {
        const idx = Number(inp.getAttribute("data-draft-caption"));
        if (state.postDraftMedia[idx]) state.postDraftMedia[idx].caption = inp.value;
      });
    });

    document.querySelectorAll("[data-insert-inline-media]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-insert-inline-media"));
        const m = state.postDraftMedia[idx];
        const ta = document.getElementById("adm-post-text");
        if (!m || !ta) return;
        const tag = `\n[MEDIA:${m.src}${m.caption ? "|" + m.caption : ""}]\n`;
        const start = ta.selectionStart || ta.value.length;
        const end = ta.selectionEnd || ta.value.length;
        ta.value = ta.value.slice(0, start) + tag + ta.value.slice(end);
        ta.focus();
      });
    });

    document.querySelectorAll("[data-remove-draft-media]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const curTitle = (document.getElementById("adm-post-title") || {}).value || "";
        const curText = (document.getElementById("adm-post-text") || {}).value || "";
        state.postDraftMedia.splice(Number(btn.getAttribute("data-remove-draft-media")), 1);
        render();
        if (document.getElementById("adm-post-title")) document.getElementById("adm-post-title").value = curTitle;
        if (document.getElementById("adm-post-text")) document.getElementById("adm-post-text").value = curText;
      });
    });

    const postForm = document.getElementById("adm-post-form");
    if (postForm) {
      postForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const postPayload = {
          id: state.editingPostId || undefined,
          title: document.getElementById("adm-post-title").value.trim(),
          text: document.getElementById("adm-post-text").value.trim(),
          hashtags: document.getElementById("adm-post-tags").value.trim(),
          media: state.postDraftMedia
        };
        const actionName = state.editingPostId ? "update_post" : "create_post";
        const r = await apiPost(actionName, { post: postPayload });
        if (!r.ok) return showToast(r.error || "Kunde inte spara inlägget.", true);
        state.posts = r.posts || state.posts;
        if (r.campaigns) state.campaigns = r.campaigns;
        const wasEdit = Boolean(state.editingPostId);
        state.editingPostId = null;
        state.postDraftMedia = [];
        showToast(
          wasEdit
            ? "Inlägget har uppdaterats!"
            : `Inlägget är publicerat (Inläggsfliken puls-blinkar nu i guld för besökare!) och utskickat till ${(r.newsletterInfo && r.newsletterInfo.recipientCount) || 0} prenumeranter!`
        );
        render();
      });
    }

    const cancelEditPost = document.getElementById("adm-cancel-edit-post");
    if (cancelEditPost) {
      cancelEditPost.addEventListener("click", () => {
        state.editingPostId = null;
        state.postDraftMedia = [];
        render();
      });
    }

    document.querySelectorAll("[data-edit-post]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = state.posts.find((x) => x.id === btn.getAttribute("data-edit-post"));
        if (!p) return;
        state.editingPostId = p.id;
        state.postDraftMedia = JSON.parse(JSON.stringify(p.media || []));
        window.scrollTo({ top: 0, behavior: "smooth" });
        render();
      });
    });

    document.querySelectorAll("[data-del-post]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const r = await apiPost("delete_post", { postId: btn.getAttribute("data-del-post") });
        if (r.ok) {
          state.posts = r.posts || [];
          showToast("Inlägget raderades.");
          render();
        }
      });
    });

    // --- KAMPANJUTSKICK & PRENUMERANTER ---
    document.querySelectorAll("[data-camp-tpl]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tpl = CAMPAIGN_TEMPLATES[btn.getAttribute("data-camp-tpl")];
        if (!tpl) return;
        document.getElementById("camp-subject").value = tpl.subject;
        document.getElementById("camp-title").value = tpl.title;
        document.getElementById("camp-price").value = tpl.offerPrice;
        document.getElementById("camp-text").value = tpl.text;
        document.getElementById("camp-cta-label").value = tpl.ctaLabel;
        document.getElementById("camp-cta-hash").value = tpl.ctaHash;
        if (!document.getElementById("camp-media").value) {
          document.getElementById("camp-media").value = "bilder/bilar/hummer-legends-sida.jpg";
        }
        showToast("Kampanjmallen fylldes i – anpassa gärna texten och klicka Skicka!");
      });
    });

    const campMediaFile = document.getElementById("camp-media-file");
    if (campMediaFile) {
      campMediaFile.addEventListener("change", async (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const r = await uploadSingleFile(f, "post");
        if (r && r.ok) {
          state.campaignDraftMedia = r.path;
          const inp = document.getElementById("camp-media");
          if (inp) inp.value = r.path;
          showToast("Kampanjbild uppladdad!");
        }
      });
    }

    const campForm = document.getElementById("adm-campaign-form");
    if (campForm) {
      campForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const r = await apiPost("send_campaign", {
          campaign: {
            kind: "campaign",
            subject: document.getElementById("camp-subject").value.trim(),
            title: document.getElementById("camp-title").value.trim(),
            offerPrice: document.getElementById("camp-price").value.trim(),
            mediaUrl: document.getElementById("camp-media").value.trim(),
            text: document.getElementById("camp-text").value.trim(),
            ctaLabel: document.getElementById("camp-cta-label").value.trim(),
            ctaHash: document.getElementById("camp-cta-hash").value
          }
        });
        if (!r.ok) return showToast(r.error || "Kunde inte skicka kampanjen.", true);
        state.campaigns = r.campaigns || state.campaigns;
        showToast(`Kampanjen skickades ut till ${r.sentInfo ? r.sentInfo.recipientCount : 0} prenumeranter!`);
        render();
      });
    }

    const addSubForm = document.getElementById("adm-add-sub-form");
    if (addSubForm) {
      addSubForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const r = await apiPost("add_subscriber", {
          name: document.getElementById("sub-add-name").value.trim(),
          email: document.getElementById("sub-add-email").value.trim()
        });
        if (!r.ok) return showToast(r.error || "Kunde inte lägga till kund.", true);
        state.subscribers = r.subscribers || [];
        showToast("Kunden lades till i utskickslistan!");
        render();
      });
    }

    const impCustBtn = document.getElementById("adm-import-cust-btn");
    if (impCustBtn) {
      impCustBtn.addEventListener("click", async () => {
        const r = await apiPost("import_customers_to_subscribers");
        if (r.ok) {
          state.subscribers = r.subscribers || [];
          showToast(`${r.added || 0} nya kundadresser importerades från offerter & merch!`);
          render();
        }
      });
    }

    const expCsvBtn = document.getElementById("adm-export-subs-csv");
    if (expCsvBtn) {
      expCsvBtn.addEventListener("click", () => {
        const rows = [["Namn", "E-post", "Status", "Källa", "Datum"]];
        state.subscribers.forEach((s) =>
          rows.push([s.name || "", s.email || "", s.active === false ? "Avregistrerad" : "Aktiv", s.source || "", s.createdAt || ""])
        );
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "backstage-wheels-prenumeranter.csv";
        a.click();
      });
    }

    document.querySelectorAll("[data-del-sub]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const r = await apiPost("delete_subscriber", { subscriberId: btn.getAttribute("data-del-sub") });
        if (r.ok) {
          state.subscribers = r.subscribers || [];
          render();
        }
      });
    });

    // --- MERCH & VEKTORISERADE SVG-TRYCKORIGINAL ---
    document.querySelectorAll("[data-set-merch-mode]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const mode = btn.getAttribute("data-set-merch-mode");
        const r = await apiPost("save_merch_mode", { mode });
        if (r && r.ok) {
          state.merchShopMode = r.mode;
          showToast(
            r.mode === "live"
              ? "Merch-shopen är nu öppen för skarpa beställningar!"
              : "Merch-sidan är nu i 'Kommer snart'-läge och samlar intresse på era designs!"
          );
          render();
        }
      });
    });

    document.querySelectorAll("[data-dl-svg]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-dl-svg"), 10);
        const item = state.printSvgs[idx];
        if (!item) return;
        const blob = new Blob([item.svgContent], { type: "image/svg+xml;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = item.filename || "backstage-wheels-tryckoriginal.svg";
        a.click();
      });
    });

    document.querySelectorAll("[data-edit-svg]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.editingSvgFilename = btn.getAttribute("data-edit-svg");
        render();
      });
    });

    const closeSvgEd = document.getElementById("adm-close-svg-editor");
    if (closeSvgEd) {
      closeSvgEd.addEventListener("click", () => {
        state.editingSvgFilename = null;
        render();
      });
    }

    const prevSvgBtn = document.getElementById("adm-preview-svg-btn");
    if (prevSvgBtn) {
      prevSvgBtn.addEventListener("click", () => {
        const code = document.getElementById("svg-edit-code").value;
        const box = document.getElementById("adm-svg-live-preview");
        if (box) box.innerHTML = `<div style="width:100%;max-width:340px;">${code}</div>`;
      });
    }

    const saveSvgBtn = document.getElementById("adm-save-svg-btn");
    if (saveSvgBtn) {
      saveSvgBtn.addEventListener("click", async () => {
        const fn = saveSvgBtn.getAttribute("data-fn");
        const r = await apiPost("save_print_svg", {
          filename: fn,
          title: document.getElementById("svg-edit-title").value.trim(),
          usage: document.getElementById("svg-edit-usage").value.trim(),
          dimensions: document.getElementById("svg-edit-dim").value.trim(),
          svgContent: document.getElementById("svg-edit-code").value.trim()
        });
        if (!r || !r.ok) return showToast((r && r.error) || "Kunde inte spara SVG.", true);
        await loadAllAdminData();
        showToast("Vektoriserat SVG-tryckoriginal sparat!");
        render();
      });
    }

    const upSvgInp = document.getElementById("adm-upload-svg-file");
    if (upSvgInp) {
      upSvgInp.addEventListener("change", async (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const text = await f.text();
        const r = await apiPost("save_print_svg", {
          filename: f.name,
          title: f.name.replace(/\.svg$/i, ""),
          usage: "Uppladdat Tryckoriginal (Vektoriserad SVG)",
          dimensions: "100% skalbar vektor",
          svgContent: text
        });
        if (!r || !r.ok) return showToast((r && r.error) || "Ogiltig SVG-fil.", true);
        await loadAllAdminData();
        showToast(`SVG-tryckoriginalet '${f.name}' laddades upp!`);
        render();
      });
    }

    document.querySelectorAll("[data-del-svg]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const fn = btn.getAttribute("data-del-svg");
        const r = await apiPost("delete_print_svg", { filename: fn });
        if (r && r.ok) {
          if (state.editingSvgFilename === fn) state.editingSvgFilename = null;
          await loadAllAdminData();
          showToast("Tryckoriginal borttaget.");
          render();
        }
      });
    });

    const merchFileInp = document.getElementById("m-image-file");
    if (merchFileInp) {
      merchFileInp.addEventListener("change", async (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const r = await uploadSingleFile(f, "merch");
        if (r && r.ok) {
          state.merchDraftImage = r.path;
          const inp = document.getElementById("m-image");
          if (inp) inp.value = r.path;
          showToast("Produktbild uppladdad!");
        }
      });
    }

    const merchForm = document.getElementById("adm-merch-form");
    if (merchForm) {
      merchForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const item = {
          id:
            state.editingMerchIdx >= 0 && state.merch[state.editingMerchIdx]
              ? state.merch[state.editingMerchIdx].id
              : "merch-" + Date.now(),
          name: document.getElementById("m-name").value.trim(),
          price: Number(document.getElementById("m-price").value) || 0,
          currency: "kr",
          sizes: document
            .getElementById("m-sizes")
            .value.split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          stockStatus: document.getElementById("m-stock").value,
          badge: document.getElementById("m-badge").value.trim(),
          image: document.getElementById("m-image").value.trim(),
          description: document.getElementById("m-desc").value.trim()
        };
        if (state.editingMerchIdx >= 0) state.merch[state.editingMerchIdx] = item;
        else state.merch.unshift(item);

        const r = await apiPost("save_merch", { merch: state.merch });
        if (!r.ok) return showToast("Kunde inte spara produkten.", true);
        state.editingMerchIdx = -1;
        state.merchDraftImage = "";
        showToast("Merch-produkten är sparad och synlig i Merch-fliken!");
        render();
      });
    }

    const cancelMerchEdit = document.getElementById("adm-cancel-merch-edit");
    if (cancelMerchEdit) {
      cancelMerchEdit.addEventListener("click", () => {
        state.editingMerchIdx = -1;
        state.merchDraftImage = "";
        render();
      });
    }

    document.querySelectorAll("[data-edit-merch]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.editingMerchIdx = Number(btn.getAttribute("data-edit-merch"));
        state.merchDraftImage = (state.merch[state.editingMerchIdx] && state.merch[state.editingMerchIdx].image) || "";
        window.scrollTo({ top: 0, behavior: "smooth" });
        render();
      });
    });

    document.querySelectorAll("[data-del-merch]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        state.merch.splice(Number(btn.getAttribute("data-del-merch")), 1);
        const r = await apiPost("save_merch", { merch: state.merch });
        if (r.ok) {
          showToast("Produkten togs bort.");
          render();
        }
      });
    });

    // --- BILDUPPLADDNING & MAPPAR ---
    const galUploadInp = document.getElementById("adm-gal-upload-files");
    if (galUploadInp) {
      galUploadInp.addEventListener("change", async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const slug = document.getElementById("adm-gal-target-folder").value;
        const msgEl = document.getElementById("adm-gal-upload-msg");
        if (msgEl) msgEl.textContent = `Laddar upp & optimerar ${files.length} fil(er)...`;
        for (const f of files) {
          await uploadSingleFile(f, "gallery", slug);
        }
        await loadAllAdminData();
        showToast(`${files.length} fil(er) uppladdade till mappen!`);
        render();
      });
    }

    const folderForm = document.getElementById("adm-create-folder-form");
    if (folderForm) {
      folderForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const r = await apiPost("create_gallery_folder", {
          name: document.getElementById("nf-name").value.trim(),
          date: document.getElementById("nf-date").value.trim(),
          description: document.getElementById("nf-desc").value.trim()
        });
        if (!r.ok) return showToast(r.error || "Kunde inte skapa mapp.", true);
        await loadAllAdminData();
        showToast("Ny evenemangsmapp skapad!");
        render();
      });
    }

    document.querySelectorAll("[data-del-folder]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const slug = btn.getAttribute("data-del-folder");
        const r = await apiPost("delete_gallery_folder", { slug });
        if (!r.ok) return showToast(r.error || "Kunde inte ta bort mappen (töm den på bilder först).", true);
        await loadAllAdminData();
        showToast("Evenemangsmappen togs bort.");
        render();
      });
    }
    );

    document.querySelectorAll("[data-del-gal-media]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const r = await apiPost("delete_gallery_media", { src: btn.getAttribute("data-del-gal-media") });
        if (r.ok) {
          await loadAllAdminData();
          showToast("Filen togs bort ur galleriet.");
          render();
        }
      });
    });

    // --- KALENDER ---
    const calForm = document.getElementById("adm-cal-add-form");
    if (calForm) {
      calForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const d = document.getElementById("cal-date").value;
        state.calendar.unshift({
          id: "cal-" + Date.now(),
          date: d,
          endDate: document.getElementById("cal-end").value || d,
          kind: document.getElementById("cal-kind").value,
          availability: document.getElementById("cal-avail").value,
          publicTitle: document.getElementById("cal-title").value.trim(),
          timeSlot: document.getElementById("cal-slot").value.trim(),
          location: document.getElementById("cal-loc").value.trim(),
          description: document.getElementById("cal-desc").value.trim()
        });
        const r = await apiPost("save_calendar_list", { calendar: state.calendar });
        if (r.ok) {
          showToast("Kalendern uppdaterades!");
          render();
        }
      });
    }

    document.querySelectorAll("[data-del-cal]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        state.calendar.splice(Number(btn.getAttribute("data-del-cal")), 1);
        await apiPost("save_calendar_list", { calendar: state.calendar });
        showToast("Kalenderpost borttagen.");
        render();
      });
    });

    const saveGcalBtn = document.getElementById("adm-save-gcal-btn");
    if (saveGcalBtn) {
      saveGcalBtn.addEventListener("click", async () => {
        const url = document.getElementById("adm-gcal-url").value.trim();
        await apiPost("save_vault", { vault: Object.assign({}, state.vault, { googleCalendarIcsUrl: url }) });
        const sync = await apiPost("sync_google_calendar");
        showToast(sync.ok ? "Google Kalender synkad!" : sync.error || "Sparad.");
        await loadAllAdminData();
        render();
      });
    }

    // --- BILAR & PRISPAKET ---
    const savePkgsBtn = document.getElementById("adm-save-pkgs-btn");
    if (savePkgsBtn) {
      savePkgsBtn.addEventListener("click", async () => {
        document.querySelectorAll("[data-pkg-field]").forEach((el) => {
          const i = Number(el.getAttribute("data-pkg-idx"));
          const k = el.getAttribute("data-pkg-field");
          if (state.settings.bookingPackages[i]) state.settings.bookingPackages[i][k] = el.value;
        });
        document.querySelectorAll("[data-pkg-highlights]").forEach((el) => {
          const i = Number(el.getAttribute("data-pkg-highlights"));
          if (state.settings.bookingPackages[i]) {
            state.settings.bookingPackages[i].highlights = el.value
              .split("\n")
              .map((line) => line.replace(/^[✓•\-]\s*/, "").trim())
              .filter(Boolean);
          }
        });
        const r = await apiPost("save_settings", { settings: state.settings });
        if (r.ok) showToast("Priser, villkor & bokningspaket sparade!");
        else showToast(r.error || "Kunde inte spara prispaket.", true);
      });
    }

    document.querySelectorAll("[data-car-upload]").forEach((inp) => {
      inp.addEventListener("change", async (e) => {
        const ci = Number(inp.getAttribute("data-car-upload"));
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const r = await uploadSingleFile(f, "car");
        if (r && r.ok && state.settings.cars[ci]) {
          state.settings.cars[ci].mainImage = { src: r.path, caption: state.settings.cars[ci].name };
          await apiPost("save_settings", { settings: state.settings });
          showToast("Ny bilbild sparad!");
          render();
        }
      });
    });

    const saveCarsBtn = document.getElementById("adm-save-cars-btn");
    if (saveCarsBtn) {
      saveCarsBtn.addEventListener("click", async () => {
        document.querySelectorAll("[data-car-field]").forEach((el) => {
          const i = Number(el.getAttribute("data-car-idx"));
          const k = el.getAttribute("data-car-field");
          if (state.settings.cars[i]) state.settings.cars[i][k] = el.value;
        });
        const r = await apiPost("save_settings", { settings: state.settings });
        if (r.ok) showToast("Fordonsuppgifterna sparades!");
      });
    }

    // --- SOCIALA MEDIER VALV ---
    const vaultForm = document.getElementById("adm-vault-form");
    if (vaultForm) {
      vaultForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const r = await apiPost("save_vault", {
          vault: {
            autoPostEveryEntry: true,
            instagramEnabled: true,
            facebookEnabled: true,
            webhookEnabled: true,
            instagramAccountId: document.getElementById("v-ig-id").value.trim(),
            instagramAccessToken: document.getElementById("v-ig-tok").value.trim(),
            facebookPageId: document.getElementById("v-fb-id").value.trim(),
            facebookPageToken: document.getElementById("v-fb-tok").value.trim(),
            webhookUrl: document.getElementById("v-wh-url").value.trim(),
            webhookSecret: document.getElementById("v-wh-sec").value.trim(),
            defaultHashtags: document.getElementById("v-tags").value.trim()
          }
        });
        if (r.ok) {
          state.vault = r.vault || state.vault;
          showToast("Sociala medier-kopplingarna har krypterats (AES-256) och sparats!");
          render();
        }
      });
    }

    // --- KONTAKT & LOGOTYP ---
    const logoFileInp = document.getElementById("c-logo-file");
    if (logoFileInp) {
      logoFileInp.addEventListener("change", async (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const r = await uploadSingleFile(f, "logo");
        if (r && r.ok) {
          document.getElementById("c-logo").value = r.path;
          showToast("Logotyp uppladdad – klicka Spara nedan för att aktivera!");
        }
      });
    }

    const contactForm = document.getElementById("adm-contact-form");
    if (contactForm) {
      contactForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        state.settings.contactPhone = document.getElementById("c-phone").value.trim();
        state.settings.contactEmail = document.getElementById("c-email").value.trim();
        state.settings.homeRegion = document.getElementById("c-region").value.trim();
        state.settings.instagramUrl = document.getElementById("c-ig").value.trim();
        state.settings.logoUrl = document.getElementById("c-logo").value.trim();
        state.settings.googleReviewUrl = document.getElementById("c-google-rev").value.trim();
        state.settings.reminderSettings = {
          hoursBefore: Number(document.getElementById("c-rem-hours").value) || 24
        };
        const r = await apiPost("save_settings", { settings: state.settings });
        if (r.ok) showToast("Kontaktuppgifter, påminnelsefönster & logotyp sparade!");
      });
    }

    // --- KVITTO/FAKTURA & RECENSIONSMETJL PER OFFERT ---
    document.querySelectorAll("[data-quote-receipt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = state.quotes[Number(btn.getAttribute("data-quote-receipt"))];
        if (!q) return;
        const payload = {
          kind: "FAKTURA",
          company: `Backstage Wheels\n${state.settings.contactPhone || ""}\n${state.settings.contactEmail || ""}\nbackstagewheels.se`,
          customer: `${q.namn || "-"}\n${q.epost || "-"}\n${q.telefon || "-"}`,
          docmeta: `Nr: BSW-${String(q.receivedAt || Date.now()).replace(/[^0-9]/g, "").slice(-8) || "00000000"}\nDatum: ${new Date().toLocaleDateString("sv-SE")}\nOffert mottagen: ${q.receivedAt || "-"}`,
          event: `Fordon / upplägg: ${q.bil || "-"} (${q.kortid || "-"})\nDatum & tid: ${q.datum || "-"} kl ${q.tid || "-"}\nSträcka: ${q.fran || "-"} → ${q.till || "-"}\nPassagerare: ${q.passagerare || "-"}`,
          rows: [{ label: "Limousinekörning enligt offert (exkl. moms)", qty: 1, price: 0 }],
          note: "Fyll i belopp på raden nedan (À-pris) – moms 25 % och summa beräknas automatiskt. Alla fält kan redigeras innan utskrift."
        };
        const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        window.open("kvitto.html#d=" + b64, "_blank");
      });
    });
    document.querySelectorAll("[data-quote-reviewmail]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = state.quotes[Number(btn.getAttribute("data-quote-reviewmail"))];
        if (!q || !q.epost) {
          showToast("Offerten saknar e-postadress.", true);
          return;
        }
        apiPost("send_review_request", { email: q.epost, name: q.namn }).then((r) => {
          if (r && r.ok) showToast("Recensionsförfrågan mejlad till " + q.epost);
          else showToast((r && r.error) || "Kunde inte skicka – kontrollera Google-länken.", true);
        });
      });
    });

    // --- KUNDOMDÖMEN ---
    const revSettingsForm = document.getElementById("adm-reviews-settings-form");
    if (revSettingsForm) {
      revSettingsForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        state.settings.googleReviewUrl = document.getElementById("rev-google-url").value.trim();
        const r = await apiPost("save_settings", { settings: state.settings });
        if (r.ok) showToast("Google-länk sparad!");
      });
    }
    const revAddForm = document.getElementById("adm-review-add-form");
    if (revAddForm) {
      revAddForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const list = Array.isArray(state.reviews) ? state.reviews : [];
        list.unshift({
          id: "rev-" + Date.now(),
          name: document.getElementById("rev-new-name").value.trim(),
          stars: Number(document.getElementById("rev-new-stars").value) || 5,
          text: document.getElementById("rev-new-text").value.trim(),
          date: document.getElementById("rev-new-date").value.trim(),
          source: document.getElementById("rev-new-source").value,
          status: "visible"
        });
        const r = await apiPost("save_reviews", { reviews: list });
        if (r && r.ok) {
          state.reviews = r.reviews || list;
          showToast("Recension tillagd – syns nu på hemsidan!");
          render();
        } else {
          showToast((r && r.error) || "Kunde inte spara recensionen.", true);
        }
      });
    }
    const revReqForm = document.getElementById("adm-review-request-form");
    if (revReqForm) {
      revReqForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const r = await apiPost("send_review_request", {
          email: document.getElementById("rev-req-email").value.trim(),
          name: document.getElementById("rev-req-name").value.trim()
        });
        if (r && r.ok) showToast("Recensionsförfrågan skickad! ✉");
        else showToast((r && r.error) || "Kunde inte skicka.", true);
      });
    }
    document.querySelectorAll("[data-review-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const i = Number(btn.getAttribute("data-review-toggle"));
        if (!state.reviews[i]) return;
        state.reviews[i].status = state.reviews[i].status === "hidden" ? "visible" : "hidden";
        const r = await apiPost("save_reviews", { reviews: state.reviews });
        if (r && r.ok) {
          state.reviews = r.reviews || state.reviews;
          render();
        }
      });
    });
    document.querySelectorAll("[data-review-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const i = Number(btn.getAttribute("data-review-del"));
        if (!state.reviews[i]) return;
        if (!confirm("Radera den här recensionen?")) return;
        state.reviews.splice(i, 1);
        const r = await apiPost("save_reviews", { reviews: state.reviews });
        if (r && r.ok) {
          state.reviews = r.reviews || state.reviews;
          showToast("Recension raderad.");
          render();
        }
      });
    });

    // --- GÄSTFOTO VIA QR ---
    document.querySelectorAll("[data-gf-approve]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const r = await apiPost("gastfoto_moderate", { filename: btn.getAttribute("data-gf-approve"), modAction: "approve" });
        if (r && r.ok) {
          showToast("Fotot godkänt & publicerat i galleriet!");
          await loadAllAdminData();
          render();
        } else showToast((r && r.error) || "Kunde inte godkänna fotot.", true);
      });
    });
    document.querySelectorAll("[data-gf-reject]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const r = await apiPost("gastfoto_moderate", { filename: btn.getAttribute("data-gf-reject"), modAction: "reject" });
        if (r && r.ok) {
          showToast("Fotot avvisat & raderat.");
          await loadAllAdminData();
          render();
        } else showToast((r && r.error) || "Kunde inte avvisa fotot.", true);
      });
    });
    document.querySelectorAll("[data-gf-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Radera det godkända fotot från galleriet?")) return;
        const r = await apiPost("gastfoto_moderate", { filename: btn.getAttribute("data-gf-delete"), modAction: "delete" });
        if (r && r.ok) {
          showToast("Fotot raderat.");
          await loadAllAdminData();
          render();
        } else showToast((r && r.error) || "Kunde inte radera fotot.", true);
      });
    });
    const gfCopyBtn = document.getElementById("gf-copy-link");
    if (gfCopyBtn) {
      gfCopyBtn.addEventListener("click", () => {
        const url = location.origin + "/gastfoto";
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(() => showToast("Länken kopierad!"));
        }
      });
    }

    // --- BW BOT ---
    const botEnableBtn = document.getElementById("bot-enable-btn");
    if (botEnableBtn) {
      botEnableBtn.addEventListener("click", async () => {
        if (!("Notification" in window)) {
          showToast("Webbläsaren saknar notis-stöd — boten visar ändå toasts inuti panelen.", true);
          return;
        }
        const p = await Notification.requestPermission();
        if (p === "granted") {
          showToast("Notiser aktiverade – BW Bot beepar nu! 🔔");
          botNotify("BW Bot är aktiv", "Du får notis när bokningar närmar sig.", "bot-activated");
        } else if (p === "denied") {
          showToast("Notiser blockerades i webbläsaren — toasts används i stället.", true);
        } else {
          showToast("Ingen ändring av notisbehörighet.");
        }
        updateBotCard();
      });
    }
    const botTestBtn = document.getElementById("bot-test-btn");
    if (botTestBtn) {
      botTestBtn.addEventListener("click", () => {
        botNotify("✅ BW Bot-test", "Om du ser detta fungerar din egen gratis-bot!", "bot-test");
        botPoll();
      });
    }

    // --- LÖSENORD & LOGG ---
    const forcePwBtn = document.getElementById("adm-force-pw-btn");
    if (forcePwBtn) {
      forcePwBtn.addEventListener("click", () => {
        state.forceChangeMode = true;
        render();
      });
    }
    const sim20Btn = document.getElementById("adm-sim-20d-btn");
    if (sim20Btn) {
      sim20Btn.addEventListener("click", async () => {
        await apiPost("simulate_20_days");
        state.authenticated = false;
        state.passwordStatus.expired = true;
        render();
      });
    }
    const logFilterSel = document.getElementById("adm-log-filter");
    if (logFilterSel) {
      logFilterSel.addEventListener("change", () => {
        state.logFilter = logFilterSel.value;
        render();
      });
    }
    const clearLogsBtn = document.getElementById("adm-clear-logs-btn");
    if (clearLogsBtn) {
      clearLogsBtn.addEventListener("click", async () => {
        await apiPost("clear_logs");
        state.debugLogs = [];
        render();
      });
    }
  }

  async function bootAdmin() {
    try {
      await detectBackend();
      await loadAllAdminData();
    } catch (_e) {}
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootAdmin);
  } else {
    bootAdmin();
  }
})();
