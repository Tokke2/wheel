/**
 * ============================================================================
 * BACKSTAGE WHEELS — SPRÅKVERSIONER SV/EN/DE (js/i18n.js)  (#16)
 * ============================================================================
 * Översätter webbplatsen till engelska & tyska utan att röra HTML-strukturen:
 * textnoder (och placeholders) som exakt matchar en svensk nyckel byts mot
 * översättningen. Okända texter lämnas orörda (svenska) — inget går sönder.
 * En MutationObserver fångar upp dynamiskt renderat innehåll (debounced,
 * energisnålt) så även JS-renderade vyer översätts.
 *
 * Växlare: flytande pill (SV/EN/DE), sparas i localStorage "bsw_lang".
 * Första besöket: auto-väljer EN/DE utifrån webbläsarens språk.
 */
(function () {
  "use strict";

  var LANG_KEY = "bsw_lang";
  var DICT = {
    en: {
      // Navigation & gemensamt
      "Inlägg": "News",
      "Bildgalleri": "Photo gallery",
      "Merch": "Merch",
      "Kontakt": "Contact",
      "Begär offert": "Request a quote",
      "SNART": "SOON",
      "NYTT": "NEW",
      "Start & Kvällens 3 Pass": "Home & Tonight's 3 Slots",
      "Våra bilar & Priser": "Our limos & Prices",
      "Bokningskalender": "Booking calendar",
      "Senaste inläggen": "Latest news",
      "Merch (Kommer snart)": "Merch (Coming soon)",
      "Snabbnavigering": "Quick links",
      "Kontakt & Socialt": "Contact & Social",
      "Ljust läge": "Light mode",
      "Lägg till Backstage Wheels som app": "Add Backstage Wheels as an app",
      "Följ": "Follow",
      // Hero
      "@BACKSTAGEWHEELS · SVERIGES MÄKTIGASTE LIMMO": "@BACKSTAGEWHEELS · SWEDEN'S MOST POWERFUL LIMO",
      "10 METER REN": "10 METERS OF PURE",
      "HÅRDROCK": "HARD ROCK",
      "VIP-KÄNSLA": "VIP FEEL",
      "PÅ VÄGEN": "ON WHEELS",
      "Begär offert för körning": "Request a ride quote",
      "Se lediga pass i kalendern": "See available slots in the calendar",
      "Hummer H2 Stretch Limo": "Hummer H2 Stretch Limo",
      "Per person vid full bil (16 st)": "Per person at full occupancy (16)",
      // Sektionstitlar
      "EFTERFRÅGA OFFERT FÖR KÖRNING": "REQUEST A RIDE QUOTE",
      "BOKNINGSKALENDER": "BOOKING CALENDAR",
      "BILDGALLERI & VIDEOKLIPP": "PHOTO GALLERY & VIDEOS",
      "KONTAKTA BACKSTAGE WHEELS": "CONTACT BACKSTAGE WHEELS",
      "LEDIGA TIDER · KVÄLLENS 3 PASS · FESTIVALER": "AVAILABILITY · TONIGHT'S 3 SLOTS · FESTIVALS",
      "PRISER, HELDAG, SPONSOREVENT & OKTOBERFEST": "PRICES, FULL DAY, SPONSOR EVENTS & OKTOBERFEST",
      "FLOTTAN · PRISER · 16 PLATSER": "THE FLEET · PRICES · 16 SEATS",
      "NYHETER · BILDER · VIDEOKLIPP": "NEWS · PHOTOS · VIDEOS",
      "BRA ATT VETA INFÖR BOKNING": "GOOD TO KNOW BEFORE BOOKING",
      "HYRA HUMMER LIMOUSINE – VÅRA 5 VIKTIGASTE OMRÅDEN": "HUMMER LIMOUSINE RENTAL – OUR 5 KEY AREAS",
      "DELA PÅ UPPLEVELSEN · UPP TILL 16 PLATSER": "SHARE THE EXPERIENCE · UP TO 16 SEATS",
      "BOKA KÖRNING · PRISFÖRFRÅGAN": "BOOK A RIDE · PRICE REQUEST",
      "DIREKTKONTAKT · BOKNING & FRÅGOR": "DIRECT CONTACT · BOOKING & QUESTIONS",
      "KOMMANDE EVENEMANG & SPECIALRESOR": "UPCOMING EVENTS & SPECIAL TRIPS",
      "MISSA INGA NYA INLÄGG, MERCH-SLÄPP ELLER KAMPANJER!": "DON'T MISS NEWS, MERCH DROPS OR CAMPAIGNS!",
      "FÅ NYA INLÄGG & FESTIVALFÖRSLAG PÅ MEJL": "GET NEW POSTS & FESTIVAL DEALS BY EMAIL",
      "INTRESSEANMÄLAN · INGEN KÖPPLIKT": "EXPRESSION OF INTEREST · NO OBLIGATION",
      "FÖRHANDSVISNING AV VÅR OFFICIELLA MERCH": "PREVIEW OF OUR OFFICIAL MERCH",
      "FÖLJ @BACKSTAGEWHEELS DIREKT VIA QR": "FOLLOW @BACKSTAGEWHEELS DIRECTLY VIA QR",
      "ALBUM · EVENEMANGSMAPPAR · HELSKÄRM": "ALBUMS · EVENT FOLDERS · FULLSCREEN",
      "GLIMTAR FRÅN VÄGARNA & BACKSTAGE": "GLIMPSES FROM THE ROAD & BACKSTAGE",
      "HELA VÄGEN IN BACKSTAGE": "ALL THE WAY BACKSTAGE",
      "BILDER & DETALJER I HELSKÄRM": "PHOTOS & DETAILS IN FULLSCREEN",
      "MER ÄN EN TRANSPORT – DET ÄR KVÄLLENS HUVUDNUMMER": "MORE THAN A RIDE – IT'S TONIGHT'S HEADLINER",
      "B2B-REKLAM, MUSIKVIDEOR & STUDENTUTSKOTT": "B2B ADS, MUSIC VIDEOS & STUDENT COMMITTEES",
      "Kvällens 3 pass": "Tonight's 3 slots",
      "3 tydliga VIP-pass": "3 clear VIP slots",
      "Pass 1 – Förfest & Middagsentré (17:30–19:30)": "Slot 1 – Pre-party & Dinner drop-off (5:30–7:30 PM)",
      "Pass 2 – Prime Time Cruising & Entré (20:00–22:30)": "Slot 2 – Prime time cruising & entry (8:00–10:30 PM)",
      "Pass 3 – Nattcruising & VIP-Hemresa (23:00–01:30)": "Slot 3 – Night cruise & VIP ride home (11:00 PM–1:30 AM)",
      "Kostnad per person:": "Cost per person:",
      "Prislista (chaufför ingår alltid)": "Price list (driver always included)",
      "Ledig (alla pass öppna)": "Available (all slots open)",
      "Fullbokad": "Fully booked",
      "Delvis bokad – kvällspass finns kvar!": "Partly booked – evening slots left!",
      "Fråga om tillgänglighet": "Ask about availability",
      "Begär offert för valt datum": "Request a quote for this date",
      "Begär offert i": "Request a quote in",
      "Klicka för att förstora": "Click to enlarge",
      "Klicka för att visa i helskärm": "Click to view fullscreen",
      "Läser in galleri...": "Loading gallery...",
      "Direktkontakt": "Direct contact",
      "E-post (klicka för att mejla)": "Email (click to send)",
      "Få nya inlägg automatiskt på mejl": "Get new posts automatically by email",
      "Förtur via e-post": "Priority via email",
      "Prenumerera på inlägg": "Subscribe to posts",
      "Prenumerera kostnadsfritt": "Subscribe for free",
      "Ditt namn": "Your name",
      "E-postadress": "Email address",
      "Din e-postadress (för lanseringssläpp)": "Your email (for the drop announcement)",
      "Du styr första släppet!": "You decide the first drop!",
      "Leveransadress": "Delivery address",
      "Om Backstage Wheels Merch": "About Backstage Wheels merch",
      "Du bestämmer priset!": "You set the price!",
      "0 objekt": "0 items",
      "Bas som känns i bröstet": "Bass you feel in your chest",
      "Motivlack av Dr H Custom": "Custom paint by Dr H Custom",
      "Plats för upp till 16 personer": "Room for up to 16 people",
      "Ingen alkoholservering": "No alcohol served",
      "Osäker på vilket kvällspass eller paket som passar bäst?": "Unsure which evening slot or package fits best?",
      "Hemmabas & Körområde": "Home base & Service area",
      // Veckodagar
      "Mån": "Mon", "Tis": "Tue", "Ons": "Wed", "Tor": "Thu", "Fre": "Fri", "Lör": "Sat", "Sön": "Sun",
      // Offertformulär
      "EFTERFRÅGA OFFERT FÖR KÖRNING": "REQUEST A RIDE QUOTE",
      "Välj bil / upplägg": "Choose limo / setup",
      "Typ av körning / Event": "Type of ride / Event",
      "Önskat datum": "Preferred date",
      "Önskad starttid / Pass": "Preferred start time / Slot",
      "Önskat paket / Pass": "Preferred package / Slot",
      "Antal passagerare (upp till 16 i bilen)": "Number of passengers (up to 16 in the limo)",
      "Upphämtningsplats (Ort / Adress)": "Pickup location (City / Address)",
      "Destination & ev. delstopp": "Destination & any extra stops",
      "Ditt namn / Företag / Studentutskott": "Your name / Company / Student committee",
      "Telefonnummer": "Phone number",
      "E-post (bekräftelse skickas hit)": "Email (confirmation sent here)",
      "Övriga önskemål / meddelande": "Other requests / message",
      "Skicka offertförfrågan": "Send quote request",
      "Bröllop": "Wedding",
      "Bal / Student / Studentutskott": "Prom / Graduation / Student committee",
      "Fest / Utgång / Kvällspass i limon": "Party / Night out / Evening slot",
      "Företagsevent / Musikvideo / PR": "Corporate event / Music video / PR",
      "Festival / Konsert / Artistkörning": "Festival / Concert / Artist transport",
      "Cruising / Bilträff / Utställning": "Cruising / Car meet / Exhibition",
      "Festival / Specialresa": "Festival / Special trip",
      "Annat upplägg": "Other setup",
      "Vardag (Mån–Tis) – 5 500 kr / timme": "Weekday (Mon–Tue) – SEK 5,500 / hour",
      "Helg (Fre–Sön) – 7 500 kr / timme": "Weekend (Fri–Sun) – SEK 7,500 / hour",
      "Heldag (12 timmar) – 25 000 kr": "Full day (12 hours) – SEK 25,000",
      "Heldag (12 timmar) – 25 000 kr totalt": "Full day (12 hours) – SEK 25,000 total",
      "Helgkörning – 7 500 kr / timme": "Weekend ride – SEK 7,500 / hour",
      "Festival / Specialresa (offert)": "Festival / Special trip (quote)",
      "16 personer": "16 people",
      "person": "person", "personer": "people",
      // Footer
      "10 meter Hummer H2 Limousine för upp till 16 passagerare med unik hårdrockslack, brutal bas och VIP-känsla hela vägen fram till röda mattan, balen, företagseventet eller festivalscenen.":
        "10-meter Hummer H2 limousine for up to 16 passengers with a unique hard rock attitude, brutal bass and VIP feel all the way to the red carpet, the prom, the corporate event or the festival stage.",
      "Alla rättigheter förbehållna.": "All rights reserved.",
      "Gästfoton": "Guest photos",
      // Recensioner (nya)
      "VAD VÅRA GÄSTER SÄGER": "WHAT OUR GUESTS SAY",
      "Lämna ett omdöme på Google": "Leave a review on Google",
      "Kundomdömen & recensioner": "Customer reviews & ratings"
    },
    de: {
      // Navigation & gemensamt
      "Inlägg": "News",
      "Bildgalleri": "Fotogalerie",
      "Merch": "Merch",
      "Kontakt": "Kontakt",
      "Begär offert": "Angebot anfordern",
      "SNART": "BALD",
      "NYTT": "NEU",
      "Start & Kvällens 3 Pass": "Start & Die 3 Slots des Abends",
      "Våra bilar & Priser": "Unsere Limos & Preise",
      "Bokningskalender": "Buchungskalender",
      "Senaste inläggen": "Neueste Beiträge",
      "Merch (Kommer snart)": "Merch (Demnächst)",
      "Snabbnavigering": "Schnellnavigation",
      "Kontakt & Socialt": "Kontakt & Social Media",
      "Ljust läge": "Heller Modus",
      "Lägg till Backstage Wheels som app": "Backstage Wheels als App hinzufügen",
      "Följ": "Folgen",
      // Hero
      "@BACKSTAGEWHEELS · SVERIGES MÄKTIGASTE LIMMO": "@BACKSTAGEWHEELS · SCHWEDENS MÄCHTIGSTE LIMO",
      "10 METER REN": "10 METER REINER",
      "HÅRDROCK": "HARDROCK",
      "VIP-KÄNSLA": "VIP-GEFÜHL",
      "PÅ VÄGEN": "UNTERWEGS",
      "Begär offert för körning": "Fahrt-Angebot anfordern",
      "Se lediga pass i kalendern": "Freie Slots im Kalender ansehen",
      "Hummer H2 Stretch Limo": "Hummer H2 Stretch-Limo",
      "Per person vid full bil (16 st)": "Pro Person bei voller Besetzung (16)",
      // Sektionstitlar
      "EFTERFRÅGA OFFERT FÖR KÖRNING": "FAHRT-ANGEBOT ANFORDERN",
      "BOKNINGSKALENDER": "BUCHUNGSKALENDER",
      "BILDGALLERI & VIDEOKLIPP": "FOTOGALERIE & VIDEOS",
      "KONTAKTA BACKSTAGE WHEELS": "BACKSTAGE WHEELS KONTAKTIEREN",
      "LEDIGA TIDER · KVÄLLENS 3 PASS · FESTIVALER": "VERFÜGBARKEIT · DIE 3 ABENDS-SLOTS · FESTIVALS",
      "PRISER, HELDAG, SPONSOREVENT & OKTOBERFEST": "PREISE, GANZTAG, SPONSOREVENTS & OKTOBERFEST",
      "FLOTTAN · PRISER · 16 PLATSER": "DIE FLOTTE · PREISE · 16 PLÄTZE",
      "NYHETER · BILDER · VIDEOKLIPP": "NEWS · FOTOS · VIDEOS",
      "BRA ATT VETA INFÖR BOKNING": "GUT ZU WISSEN VOR DER BUCHUNG",
      "HYRA HUMMER LIMOUSINE – VÅRA 5 VIKTIGASTE OMRÅDEN": "HUMMER-LIMOUSINE MIETEN – UNSERE 5 HAUPTGEBIETE",
      "DELA PÅ UPPLEVELSEN · UPP TILL 16 PLATSER": "DAS ERLEBNIS TEILEN · BIS ZU 16 PLÄTZE",
      "BOKA KÖRNING · PRISFÖRFRÅGAN": "FAHRT BUCHEN · PREISANFRAGE",
      "DIREKTKONTAKT · BOKNING & FRÅGOR": "DIREKTKONTAKT · BUCHUNG & FRAGEN",
      "KOMMANDE EVENEMANG & SPECIALRESOR": "KOMMENDE EVENTS & SONDERFAHRTEN",
      "MISSA INGA NYA INLÄGG, MERCH-SLÄPP ELLER KAMPANJER!": "VERPASSE KEINE NEWS, MERCH-DROPS ODER AKTIONEN!",
      "FÅ NYA INLÄGG & FESTIVALFÖRSLAG PÅ MEJL": "NEUE BEITRÄGE & FESTIVALANGEBOTE PER E-MAIL",
      "INTRESSEANMÄLAN · INGEN KÖPPLIKT": "INTERESSEANMELDUNG · OHNE KAUFPFLICHT",
      "FÖRHANDSVISNING AV VÅR OFFICIELLA MERCH": "VORSCHAU UNSERER OFFIZIELLEN MERCH",
      "FÖLJ @BACKSTAGEWHEELS DIREKT VIA QR": "FOLGE @BACKSTAGEWHEELS DIREKT PER QR",
      "ALBUM · EVENEMANGSMAPPAR · HELSKÄRM": "ALBEN · EVENT-ORDNER · VOLLBILD",
      "GLIMTAR FRÅN VÄGARNA & BACKSTAGE": "BLITZE VON DER STRASSE & BACKSTAGE",
      "HELA VÄGEN IN BACKSTAGE": "KLAR BIS BACKSTAGE",
      "BILDER & DETALJER I HELSKÄRM": "FOTOS & DETAILS IM VOLLBILD",
      "MER ÄN EN TRANSPORT – DET ÄR KVÄLLENS HUVUDNUMMER": "MEHR ALS EIN TRANSFER – DAS HIGHLIGHT DES ABENDS",
      "B2B-REKLAM, MUSIKVIDEOR & STUDENTUTSKOTT": "B2B-WERBUNG, MUSIKVIDEOS & STUDENTENAUSCHÜSSE",
      "Kvällens 3 pass": "Die 3 Slots des Abends",
      "3 tydliga VIP-pass": "3 klare VIP-Slots",
      "Pass 1 – Förfest & Middagsentré (17:30–19:30)": "Slot 1 – Warm-up & Dinner-Drop (17:30–19:30)",
      "Pass 2 – Prime Time Cruising & Entré (20:00–22:30)": "Slot 2 – Prime-Time-Cruising & Einlass (20:00–22:30)",
      "Pass 3 – Nattcruising & VIP-Hemresa (23:00–01:30)": "Slot 3 – Nacht-Cruising & VIP-Heimfahrt (23:00–01:30)",
      "Kostnad per person:": "Kosten pro Person:",
      "Prislista (chaufför ingår alltid)": "Preisliste (Fahrer immer inklusive)",
      "Ledig (alla pass öppna)": "Frei (alle Slots offen)",
      "Fullbokad": "Ausgebucht",
      "Delvis bokad – kvällspass finns kvar!": "Teilweise gebucht – Abendslots frei!",
      "Fråga om tillgänglighet": "Verfügbarkeit anfragen",
      "Begär offert för valt datum": "Angebot für dieses Datum anfordern",
      "Begär offert i": "Angebot anfordern in",
      "Klicka för att förstora": "Zum Vergrößern klicken",
      "Klicka för att visa i helskärm": "Für Vollbild klicken",
      "Läser in galleri...": "Galerie wird geladen...",
      "Direktkontakt": "Direkter Kontakt",
      "E-post (klicka för att mejla)": "E-Mail (klicken zum Senden)",
      "Få nya inlägg automatiskt på mejl": "Neue Beiträge automatisch per E-Mail",
      "Förtur via e-post": "Vorrang per E-Mail",
      "Prenumerera på inlägg": "Beiträge abonnieren",
      "Prenumerera kostnadsfritt": "Kostenlos abonnieren",
      "Ditt namn": "Dein Name",
      "E-postadress": "E-Mail-Adresse",
      "Din e-postadress (för lanseringssläpp)": "Deine E-Mail (für den Drop)",
      "Du styr första släppet!": "Du entscheidest den ersten Drop!",
      "Leveransadress": "Lieferadresse",
      "Om Backstage Wheels Merch": "Über Backstage Wheels Merch",
      "Du bestämmer priset!": "Du bestimmst den Preis!",
      "0 objekt": "0 Artikel",
      "Bas som känns i bröstet": "Bass, den man in der Brust spürt",
      "Motivlack av Dr H Custom": "Custom-Lackierung von Dr H Custom",
      "Plats för upp till 16 personer": "Platz für bis zu 16 Personen",
      "Ingen alkoholservering": "Kein Alkoholausschank",
      "Osäker på vilket kvällspass eller paket som passar bäst?": "Unsicher, welcher Abendslot oder Paket passt?",
      "Hemmabas & Körområde": "Heimatbasis & Einsatzgebiet",
      // Veckodagar
      "Mån": "Mo", "Tis": "Di", "Ons": "Mi", "Tor": "Do", "Fre": "Fr", "Lör": "Sa", "Sön": "So",
      // Offertformulär
      "Välj bil / upplägg": "Limo / Setup wählen",
      "Typ av körning / Event": "Art der Fahrt / Event",
      "Önskat datum": "Wunschdatum",
      "Önskad starttid / Pass": "Wunschstartzeit / Slot",
      "Önskat paket / Pass": "Wunschpaket / Slot",
      "Antal passagerare (upp till 16 i bilen)": "Personenzahl (bis zu 16 in der Limo)",
      "Upphämtningsplats (Ort / Adress)": "Abholort (Stadt / Adresse)",
      "Destination & ev. delstopp": "Ziel & ggf. Zwischenstopps",
      "Ditt namn / Företag / Studentutskott": "Dein Name / Firma / Studentenausschuss",
      "Telefonnummer": "Telefonnummer",
      "E-post (bekräftelse skickas hit)": "E-Mail (Bestätigung kommt hierher)",
      "Övriga önskemål / meddelande": "Weitere Wünsche / Nachricht",
      "Skicka offertförfrågan": "Angebotsanfrage senden",
      "Bröllop": "Hochzeit",
      "Bal / Student / Studentutskott": "Ball / Abitur / Studentenausschuss",
      "Fest / Utgång / Kvällspass i limon": "Party / Nachtleben / Abendslot",
      "Företagsevent / Musikvideo / PR": "Firmenevent / Musikvideo / PR",
      "Festival / Konsert / Artistkörning": "Festival / Konzert / Künstler-Transport",
      "Cruising / Bilträff / Utställning": "Cruising / Car-Meet / Ausstellung",
      "Festival / Specialresa": "Festival / Sonderfahrt",
      "Annat upplägg": "Sonstiges Setup",
      "Vardag (Mån–Tis) – 5 500 kr / timme": "Wochentag (Mo–Di) – 5.500 kr / Stunde",
      "Helg (Fre–Sön) – 7 500 kr / timme": "Wochenende (Fr–So) – 7.500 kr / Stunde",
      "Heldag (12 timmar) – 25 000 kr": "Ganztag (12 Std.) – 25.000 kr",
      "Heldag (12 timmar) – 25 000 kr totalt": "Ganztag (12 Std.) – 25.000 kr gesamt",
      "Helgkörning – 7 500 kr / timme": "Wochenendfahrt – 7.500 kr / Stunde",
      "Festival / Specialresa (offert)": "Festival / Sonderfahrt (Angebot)",
      "16 personer": "16 Personen",
      "person": "Person", "personer": "Personen",
      // Footer
      "10 meter Hummer H2 Limousine för upp till 16 passagerare med unik hårdrockslack, brutal bas och VIP-känsla hela vägen fram till röda mattan, balen, företagseventet eller festivalscenen.":
        "10-Meter-Hummer-H2-Limousine für bis zu 16 Passagiere mit einzigartiger Hardrock-Attitüde, brachialem Bass und VIP-Gefühl ganz bis zum roten Teppich, zum Ball, zum Firmenevent oder zur Festivalbühne.",
      "Alla rättigheter förbehållna.": "Alle Rechte vorbehalten.",
      "Gästfoton": "Gästefotos",
      // Recensioner (nya)
      "VAD VÅRA GÄSTER SÄGER": "WAS UNSERE GÄSTE SAGEN",
      "Lämna ett omdöme på Google": "Bewertung bei Google abgeben",
      "Kundomdömen & recensioner": "Kundenbewertungen & Rezensionen"
    }
  };

  var currentLang = "sv";
  var observer = null;
  var pendingApply = null;

  function norm(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function translateTextNode(node) {
    if (node.nodeType !== Node.TEXT_NODE) return;
    var raw = node.nodeValue || "";
    if (!raw.trim()) return;
    var dict = DICT[currentLang];
    if (!dict) return;
    var key = norm(raw);
    if (Object.prototype.hasOwnProperty.call(dict, key)) {
      var lead = raw.match(/^\s*/)[0];
      var trail = raw.match(/\s*$/)[0];
      node.nodeValue = lead + dict[key] + trail;
    }
  }

  function translateTree(root) {
    if (currentLang === "sv" || !root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var n;
    while ((n = walker.nextNode())) translateTextNode(n);
    // Placeholders & aria-labels & title-attribut
    var dict = DICT[currentLang];
    root.querySelectorAll && root.querySelectorAll("[placeholder], [aria-label], [title]").forEach(function (el) {
      ["placeholder", "aria-label", "title"].forEach(function (attr) {
        var v = el.getAttribute(attr);
        if (v && Object.prototype.hasOwnProperty.call(dict, norm(v))) {
          el.setAttribute(attr, dict[norm(v)]);
        }
      });
    });
  }

  function scheduleApply() {
    if (currentLang === "sv") return;
    if (pendingApply) clearTimeout(pendingApply);
    pendingApply = setTimeout(function () {
      pendingApply = null;
      translateTree(document.body);
    }, 220);
  }

  function startObserver() {
    if (observer || typeof MutationObserver === "undefined") return;
    observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: false });
  }

  function applyLang(lang, options) {
    lang = DICT[lang] ? lang : "sv";
    currentLang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (_e) {}
    document.documentElement.setAttribute("lang", lang === "sv" ? "sv-SE" : lang);
    document.querySelectorAll("[data-lang-btn]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-lang-btn") === lang);
    });
    var pill = document.getElementById("bsw-lang-pill");
    if (pill) {
      pill.setAttribute("aria-label", lang === "sv" ? "Byt språk" : lang === "en" ? "Change language" : "Sprache wechseln");
    }
    if (lang === "sv") {
      if (observer) { observer.disconnect(); observer = null; }
      if (!options || !options.keepSilent) {
        // Svenska är originalspråket – en omladdning återställer allt rent & snabbt
        location.reload();
      }
      return;
    }
    translateTree(document.body);
    startObserver();
    if (window.BSWLogger && window.BSWLogger.log) {
      window.BSWLogger.log("INFO", "I18N", "Språk växlat till " + lang.toUpperCase());
    }
  }

  function buildSwitcher() {
    if (document.getElementById("bsw-lang-pill")) return;
    var pill = document.createElement("div");
    pill.id = "bsw-lang-pill";
    pill.className = "bsw-lang-pill";
    pill.setAttribute("role", "group");
    pill.setAttribute("aria-label", "Byt språk");
    pill.innerHTML =
      '<span class="bsw-lang-globe" aria-hidden="true">🌐</span>' +
      ["sv", "en", "de"]
        .map(function (l) {
          return (
            '<button type="button" data-lang-btn="' + l + '" class="' + l + '" aria-pressed="false" title="' +
            (l === "sv" ? "Svenska" : l === "en" ? "English" : "Deutsch") + '">' +
            l.toUpperCase() + "</button>"
          );
        })
        .join("");
    pill.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-lang-btn]");
      if (btn) applyLang(btn.getAttribute("data-lang-btn"));
    });
    document.body.appendChild(pill);
  }

  function init() {
    buildSwitcher();
    var saved = null;
    try {
      saved = localStorage.getItem(LANG_KEY);
    } catch (_e) {}
    if (saved && saved !== "sv") {
      applyLang(saved, { keepSilent: true });
    } else if (!saved) {
      var nav = String(navigator.language || "sv").toLowerCase();
      if (nav.indexOf("de") === 0) applyLang("de", { keepSilent: true });
      else if (nav.indexOf("en") === 0) applyLang("en", { keepSilent: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Publikt mini-API (t.ex. för framtida språkberoende dynamik)
  window.BSWI18N = {
    get lang() { return currentLang; },
    set: function (l) { applyLang(l); },
    t: function (svText) {
      var dict = DICT[currentLang];
      if (!dict) return svText;
      var key = norm(svText);
      return Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : svText;
    }
  };
})();
