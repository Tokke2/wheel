/**
 * ============================================================================
 * BACKSTAGE WHEELS — PUBLIK HUVUDLOGIK (js/app.js)
 * ============================================================================
 */

(function () {
  "use strict";

  const VALID_TABS = ["hem", "bilar", "kalender", "inlagg", "galleri", "merch", "kontakt", "offert"];

  let currentTab = "hem";
  let allGalleryItems = [];
  let galleryFolders = [];
  let activeFolderSlug = "all";
  let allPosts = [];
  let allMerch = [];
  let merchShopMode = "coming_soon";
  let merchInterestCounts = {};
  let calendarEntries = [];
  let calYear = 2026;
  let calMonth = 10; // 0-baserad: 10 = November 2026
  let selectedDateStr = "";
  let qrVersionStamp = Date.now();
  let activeCityFilter = "all";
  let deferredPwaPrompt = null;

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isVideoUrl(src, explicitType) {
    if (explicitType === "video") return true;
    if (explicitType === "image") return false;
    return /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(String(src || ""));
  }

  function parsePhoneItems(rawText) {
    const raw = String(rawText || "").trim();
    if (!raw) return [];
    return raw
      .split(/[,;/|\n]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((label) => {
        const cleaned = label.replace(/[^\d+]/g, "");
        const digitsOnly = cleaned.replace(/\D/g, "");
        return {
          label,
          href: digitsOnly.length >= 6 ? `tel:${cleaned}` : null
        };
      });
  }

  function parseEmailItems(rawText) {
    const raw = String(rawText || "").trim();
    if (!raw) return [];
    return raw
      .split(/[,;/|\s\n]+/)
      .map((part) => part.trim())
      .filter((part) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part))
      .map((email) => ({
        label: email,
        href: `mailto:${email}`
      }));
  }

  function toMailtoHref(email, subject, body) {
    const clean = String(email || "").trim();
    const params = [];
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body) params.push(`body=${encodeURIComponent(body)}`);
    return `mailto:${clean}${params.length ? "?" + params.join("&") : ""}`;
  }

  function linkifyContactText(plainText) {
    const escaped = escapeHtml(plainText);
    const tokenRegex =
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|((?:\+46|0046|0)\d[\d\s-]{5,}\d)/g;
    return escaped.replace(tokenRegex, (match, emailMatch, phoneMatch) => {
      if (emailMatch) {
        return `<a href="mailto:${emailMatch}" class="bsw-inline-contact-link">${emailMatch}</a>`;
      }
      if (phoneMatch) {
        const telHref = phoneMatch.replace(/[^\d+]/g, "");
        return `<a href="tel:${telHref}" class="bsw-inline-contact-link">${phoneMatch}</a>`;
      }
      return match;
    });
  }

  // --------------------------------------------------------------------------
  // 1. MÖRKT / LJUST TEMA (Färger & typsnitt följer alltid valt tema!)
  // --------------------------------------------------------------------------
  function applyTheme(theme) {
    const chosen = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", chosen);
    try {
      localStorage.setItem("bsw_theme", chosen);
    } catch (_e) {}

    const metaTheme = document.getElementById("bsw-meta-theme-color");
    if (metaTheme) metaTheme.setAttribute("content", chosen === "light" ? "#f8fafc" : "#070709");

    const iconEl = document.getElementById("bsw-theme-icon");
    const lblEl = document.getElementById("bsw-theme-label");
    if (iconEl) iconEl.textContent = chosen === "light" ? "🌙" : "☀️";
    if (lblEl) lblEl.textContent = chosen === "light" ? "Mörkt läge" : "Ljust läge";
  }

  function initThemeToggle() {
    let initial = document.documentElement.getAttribute("data-theme") || "dark";
    try {
      const saved = localStorage.getItem("bsw_theme");
      if (saved === "light" || saved === "dark") initial = saved;
    } catch (_e) {}
    applyTheme(initial);

    const btn = document.getElementById("bsw-theme-toggle");
    if (btn) {
      btn.addEventListener("click", () => {
        const cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
        applyTheme(cur === "light" ? "dark" : "light");
      });
    }
  }

  // --------------------------------------------------------------------------
  // 2. LADDA PUBLIKA INSTÄLLNINGAR, INLÄGG, MERCH & INTRESSE FRÅN SERVERN
  // --------------------------------------------------------------------------
  async function loadLiveSettingsAndPosts() {
    const base = JSON.parse(JSON.stringify(window.BACKSTAGE_DEFAULT_SETTINGS || {}));
    let serverSettings = null;
    let serverPosts = null;
    let serverMerch = null;

    const endpoints = ["/api/public", "api/public.php"];
    let loadedFromBackend = false;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const ct = res.headers.get("content-type") || "";
          if (!ct.includes("application/json")) continue;
          const data = await res.json();
          if (data && data.ok) {
            loadedFromBackend = true;
            if (data.settings && Object.keys(data.settings).length > 0) serverSettings = data.settings;
            if (Array.isArray(data.posts) && data.posts.length > 0) serverPosts = data.posts;
            if (Array.isArray(data.merch) && data.merch.length > 0) serverMerch = data.merch;
            if (data.merchShopMode) merchShopMode = data.merchShopMode;
            if (data.merchInterestCounts && typeof data.merchInterestCounts === "object") {
              merchInterestCounts = data.merchInterestCounts;
            }
            break;
          }
        }
      } catch (_e) {}
    }

    if (!loadedFromBackend) {
      try {
        const localRaw = localStorage.getItem("bsw_static_store_v7");
        if (localRaw) {
          const localDb = JSON.parse(localRaw);
          if (localDb.settings && Object.keys(localDb.settings).length > 0) serverSettings = localDb.settings;
          if (Array.isArray(localDb.posts) && localDb.posts.length > 0) serverPosts = localDb.posts;
          if (Array.isArray(localDb.merch) && localDb.merch.length > 0) serverMerch = localDb.merch;
          if (localDb.merchShopMode) merchShopMode = localDb.merchShopMode;
          if (localDb.merchInterestCounts) merchInterestCounts = localDb.merchInterestCounts;
          if (Array.isArray(localDb.calendar) && localDb.calendar.length > 0) calendarEntries = localDb.calendar;
        }
      } catch (_e) {}
    }

    const merged = Object.assign({}, base, serverSettings || {});
    if (merged.merchShopMode) merchShopMode = merged.merchShopMode;
    window.BACKSTAGE_CONFIG = merged;
    allPosts = serverPosts && serverPosts.length ? serverPosts : merged.defaultPosts || [];
    allMerch = serverMerch && serverMerch.length ? serverMerch : merged.defaultMerch || [];
    qrVersionStamp = Date.now();
  }

  // --------------------------------------------------------------------------
  // 3. APPLICERA VARUMÄRKE, KONTAKT, COPYRIGHT & DYNAMISK SCHEMA.ORG SEO
  // --------------------------------------------------------------------------
  function applyBrandingAndContacts() {
    const CFG = window.BACKSTAGE_CONFIG || {};
    const brandName = CFG.brandName || "BACKSTAGE WHEELS";
    const brandSub = CFG.brandSubtitle || "LEGENDS OF ROCK · VIP LIMO";
    const logoUrl = (CFG.logoUrl || "").trim();
    const logoHeight = Number(CFG.logoHeight) || 44;
    const showText = CFG.showBrandTextWithLogo !== false;

    document.querySelectorAll("[data-cfg-brand-name]").forEach((el) => (el.textContent = brandName));
    document.querySelectorAll("[data-cfg-brand-sub]").forEach((el) => (el.textContent = brandSub));

    document.querySelectorAll("[data-brand-logo]").forEach((img) => {
      if (logoUrl) {
        img.src = logoUrl;
        img.style.height = `${logoHeight}px`;
        img.hidden = false;
      } else {
        img.hidden = true;
      }
    });

    document.querySelectorAll("[data-brand-emblem]").forEach((em) => {
      em.style.display = logoUrl ? "none" : "grid";
    });
    document.querySelectorAll("[data-brand-text-wrap]").forEach((tw) => {
      tw.style.display = logoUrl && !showText ? "none" : "flex";
    });

    const emailRaw = CFG.contactEmail || "bokning@backstagewheels.se";
    const phoneRaw = CFG.contactPhone || "070-123 45 67";
    const region = CFG.homeRegion || "Utgår från Dalarna / Mellansverige – kör i hela Sverige!";

    const emailItems = parseEmailItems(emailRaw);
    const phoneItems = parsePhoneItems(phoneRaw);

    document.querySelectorAll("[data-cfg-email]").forEach((el) => {
      const isFooter = el.hasAttribute("data-footer-contact");
      if (el.tagName === "A") {
        const first = emailItems[0] || { label: emailRaw, href: `mailto:${emailRaw.trim()}` };
        el.href = first.href;
        el.textContent = isFooter ? `✉️ ${first.label}` : first.label;
        return;
      }
      if (!emailItems.length) {
        el.innerHTML = linkifyContactText(emailRaw);
        return;
      }
      el.innerHTML = emailItems
        .map((item) =>
          isFooter
            ? `<a href="${escapeHtml(item.href)}">✉️ ${escapeHtml(item.label)}</a>`
            : `<a href="${escapeHtml(item.href)}" class="bsw-contact-main-link">${escapeHtml(item.label)}</a>`
        )
        .join(isFooter ? " · " : "");
    });

    document.querySelectorAll("[data-cfg-phone]").forEach((el) => {
      const isFooter = el.hasAttribute("data-footer-contact");
      const isHeader = el.classList.contains("bsw-header-phone-wrap");
      if (!phoneItems.length) {
        el.innerHTML = linkifyContactText(phoneRaw);
        return;
      }
      el.innerHTML = phoneItems
        .map((item) => {
          if (!item.href) return `<span>${escapeHtml(item.label)}</span>`;
          if (isHeader) {
            return `<a href="${escapeHtml(item.href)}" class="bsw-header-phone-chip">📞 ${escapeHtml(item.label)}</a>`;
          }
          if (isFooter) return `<a href="${escapeHtml(item.href)}">📞 ${escapeHtml(item.label)}</a>`;
          return `<a href="${escapeHtml(item.href)}" class="bsw-contact-main-link">${escapeHtml(item.label)}</a>`;
        })
        .join(isFooter ? " · " : "");
    });

    document.querySelectorAll("[data-cfg-sidebar-contacts]").forEach((wrap) => {
      const pills = [];
      emailItems.forEach((em) => {
        pills.push(`<a href="${escapeHtml(em.href)}" class="bsw-inline-contact-pill">✉️ ${escapeHtml(em.label)}</a>`);
      });
      phoneItems.forEach((ph) => {
        if (ph.href) {
          pills.push(`<a href="${escapeHtml(ph.href)}" class="bsw-inline-contact-pill">📞 ${escapeHtml(ph.label)}</a>`);
        }
      });
      if (pills.length) wrap.innerHTML = pills.join("");
    });

    document.querySelectorAll("[data-cfg-region]").forEach((el) => {
      el.innerHTML = linkifyContactText(region);
    });
    document.querySelectorAll("[data-cfg-contact-intro]").forEach((el) => {
      if (CFG.contactIntro) el.innerHTML = linkifyContactText(CFG.contactIntro);
    });

    const igUrl = CFG.instagramUrl || "https://www.instagram.com/backstagewheels/";
    const igHandle = CFG.instagramHandle || "@backstagewheels";
    const fbUrl = CFG.facebookUrl || "https://www.facebook.com/drhcustoms";
    const fbLabel = CFG.facebookLabel || "Facebook · Dr H Customs";

    document.querySelectorAll("[data-cfg-ig]").forEach((el) => {
      if (el.tagName === "A") el.href = igUrl;
    });
    document.querySelectorAll("[data-cfg-ig-handle]").forEach((el) => {
      el.textContent = igHandle;
    });
    document.querySelectorAll("[data-cfg-fb]").forEach((el) => {
      if (el.tagName === "A") el.href = fbUrl;
    });
    document.querySelectorAll("[data-cfg-fb-label]").forEach((el) => {
      el.textContent = fbLabel;
    });

    const qrSrc = `bilder/qr-instagram.png?v=${qrVersionStamp}`;
    document.querySelectorAll("[data-qr-img]").forEach((img) => (img.src = qrSrc));
    document.querySelectorAll("[data-qr-trigger]").forEach((fig) => {
      fig.setAttribute("data-lightbox-src", qrSrc);
      fig.setAttribute("data-lightbox-thumb", qrSrc);
      fig.setAttribute("data-lightbox-caption", `Skanna för att öppna ${igHandle} på Instagram`);
    });

    const startYear = Number(CFG.copyrightStartYear) || 2025;
    const currentYear = new Date().getFullYear();
    const yearSpan = currentYear > startYear ? `${startYear}–${currentYear}` : `${startYear}`;
    const holder = CFG.copyrightHolder || "Backstage Wheels";
    const credit =
      CFG.creatorCredit || "Hemsidan är skapad av Rickard Längkvist i samarbete med Backstage Wheels";

    document.querySelectorAll("[data-copyright-text]").forEach((el) => {
      el.textContent = `© ${yearSpan} ${holder}. Alla rättigheter förbehållna.`;
    });
    document.querySelectorAll("[data-creator-credit]").forEach((el) => {
      el.textContent = credit;
    });

    renderTourTicker();
    renderFaq();
    updateDynamicSchemaJsonLd();
  }

  function updateDynamicSchemaJsonLd() {
    const scriptEl = document.getElementById("bsw-schema-jsonld");
    if (!scriptEl) return;
    const CFG = window.BACKSTAGE_CONFIG || {};
    const cities = (CFG.cityLandingPages || []).map((c) => c.city);
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "LocalBusiness",
          name: CFG.brandName || "Backstage Wheels",
          description:
            "Hyra Sveriges mäktigaste 10-meters Hummer H2 Limousine 'Legends of Rock' för upp till 16 passagerare med chaufför. Vardag 5 500 kr/h, Helg 7 500 kr/h, Heldag (12 h) 25 000 kr, Sponsorevent från 50 000 kr/dag samt Oktoberfest-resor.",
          telephone: CFG.contactPhone || "070-123 45 67",
          email: CFG.contactEmail || "bokning@backstagewheels.se",
          areaServed: cities.length ? cities : ["Dalarna", "Stockholm", "Uppsala", "Västerås", "Örebro", "Gävle", "Sverige"],
          priceRange: "5500 SEK - 50000 SEK",
          sameAs: [CFG.instagramUrl, CFG.facebookUrl].filter(Boolean)
        },
        {
          "@type": "FAQPage",
          mainEntity: (CFG.seoFaq || []).map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.a
            }
          }))
        }
      ]
    };
    scriptEl.textContent = JSON.stringify(schema);
  }

  function renderTourTicker() {
    const track = document.getElementById("bsw-tour-ticker");
    const CFG = window.BACKSTAGE_CONFIG || {};
    if (!track || !Array.isArray(CFG.tourHighlights)) return;
    const doubled = [...CFG.tourHighlights, ...CFG.tourHighlights];
    track.innerHTML = doubled
      .map((item) => `<span class="bsw-ticker-item"><span class="bsw-bolt-icon">⚡</span>${escapeHtml(item)}</span>`)
      .join("");
  }

  function renderFaq() {
    const wrap = document.getElementById("bsw-faq-list");
    const CFG = window.BACKSTAGE_CONFIG || {};
    if (!wrap || !Array.isArray(CFG.seoFaq)) return;
    wrap.innerHTML = CFG.seoFaq
      .map(
        (item, i) => `
      <details class="bsw-faq-item" ${i === 0 ? "open" : ""}>
        <summary>
          <span>${escapeHtml(item.q)}</span>
          <span class="faq-plus" aria-hidden="true">+</span>
        </summary>
        <p>${escapeHtml(item.a)}</p>
      </details>
    `
      )
      .join("");
  }

  // --------------------------------------------------------------------------
  // 4. PULSERANDE GULDFLIK FÖR NYA OLÄSTA INLÄGG (#bsw-tab-btn-inlagg)
  // --------------------------------------------------------------------------
  function getLatestPostSignature() {
    if (!Array.isArray(allPosts) || !allPosts.length) return "";
    const newest = allPosts[0];
    return `${newest.id || ""}|${newest.createdAt || ""}|${allPosts.length}`;
  }

  function refreshNewPostsGoldIndicator() {
    const tabBtn = document.getElementById("bsw-tab-btn-inlagg");
    const badge = document.getElementById("bsw-new-post-badge");
    if (!tabBtn) return;

    const latestSig = getLatestPostSignature();
    if (!latestSig) {
      tabBtn.classList.remove("has-new-posts");
      if (badge) badge.hidden = true;
      return;
    }

    let seenSig = "";
    try {
      seenSig = localStorage.getItem("bsw_seen_latest_post") || "";
    } catch (_e) {}

    const hasUnread = seenSig !== latestSig && currentTab !== "inlagg";
    tabBtn.classList.toggle("has-new-posts", hasUnread);
    if (badge) badge.hidden = !hasUnread;
  }

  function markPostsAsSeen() {
    const latestSig = getLatestPostSignature();
    if (!latestSig) return;
    try {
      localStorage.setItem("bsw_seen_latest_post", latestSig);
    } catch (_e) {}
    const tabBtn = document.getElementById("bsw-tab-btn-inlagg");
    const badge = document.getElementById("bsw-new-post-badge");
    if (tabBtn) tabBtn.classList.remove("has-new-posts");
    if (badge) badge.hidden = true;
  }

  // --------------------------------------------------------------------------
  // 5. FLIKNAVIGERING & PREFILL AV OFFERTFORMULÄR
  // --------------------------------------------------------------------------
  function normalizeTabAlias(raw) {
    const clean = String(raw || "").replace(/^#/, "").trim().toLowerCase();
    if (clean === "bilder") return "galleri";
    if (clean.startsWith("stad-")) return "hem";
    return VALID_TABS.includes(clean) ? clean : "hem";
  }

  function switchTab(tabId, pushHash = true) {
    const target = normalizeTabAlias(tabId);
    currentTab = target;

    document.querySelectorAll(".bsw-tab-panel").forEach((panel) => {
      const active = panel.id === `tab-${target}`;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });

    document.querySelectorAll("[data-tab-link]").forEach((btn) => {
      const active = btn.getAttribute("data-tab-link") === target;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    // Stäng mobilmeny om den var öppen
    const navMenu = document.getElementById("bsw-nav-menu");
    const burgerBtn = document.getElementById("bsw-burger-btn");
    if (navMenu && navMenu.classList.contains("is-open")) {
      navMenu.classList.remove("is-open");
      if (burgerBtn) burgerBtn.setAttribute("aria-expanded", "false");
    }

    if (target === "inlagg") {
      markPostsAsSeen();
    } else {
      refreshNewPostsGoldIndicator();
    }

    if (pushHash && window.location.hash !== `#${target}`) {
      history.replaceState(null, "", `#${target}`);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prefillQuoteAndOpen(opts = {}) {
    if (opts.carName) {
      const sel = document.getElementById("offert-bil");
      if (sel) {
        const found = Array.from(sel.options).find((o) => o.value === opts.carName);
        if (found) sel.value = opts.carName;
      }
    }
    if (opts.dateStr) {
      const dateInp = document.getElementById("offert-datum");
      if (dateInp) dateInp.value = opts.dateStr;
    }
    if (opts.startTime) {
      const timeInp = document.getElementById("offert-tid");
      if (timeInp) timeInp.value = opts.startTime;
    }
    if (opts.passengers) {
      const paxInp = document.getElementById("offert-passagerare");
      if (paxInp) paxInp.value = String(opts.passengers);
    }
    if (opts.pickupCity) {
      const fromInp = document.getElementById("offert-fran");
      if (fromInp) fromInp.value = opts.pickupCity;
    }
    if (opts.eventType) {
      const evSel = document.getElementById("offert-event");
      if (evSel) {
        const match = Array.from(evSel.options).find((o) =>
          o.value.toLowerCase().includes(String(opts.eventType).toLowerCase())
        );
        if (match) evSel.value = match.value;
      }
    }
    if (opts.packageHint) {
      const durSel = document.getElementById("offert-kortid");
      if (durSel) {
        const hint = String(opts.packageHint).toLowerCase();
        const match = Array.from(durSel.options).find((o) => o.value.toLowerCase().includes(hint));
        if (match) durSel.value = match.value;
      }
    }
    switchTab("offert");
  }

  function initNavigation() {
    const burgerBtn = document.getElementById("bsw-burger-btn");
    const navMenu = document.getElementById("bsw-nav-menu");
    if (burgerBtn && navMenu) {
      burgerBtn.addEventListener("click", () => {
        const open = navMenu.classList.toggle("is-open");
        burgerBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    document.addEventListener("click", (e) => {
      const pkgBtn = e.target.closest("[data-book-pkg]");
      if (pkgBtn) {
        e.preventDefault();
        const pkgId = pkgBtn.getAttribute("data-book-pkg");
        const hintMap = {
          "vardags-vip": "vardagskörning",
          "helg-pass": "helgkörning",
          "heldag-12h": "heldag",
          sponsorevent: "sponsorevent",
          "oktoberfest-resa": "oktoberfest"
        };
        prefillQuoteAndOpen({
          packageHint: hintMap[pkgId] || pkgBtn.getAttribute("data-pkg-title") || "",
          eventType: pkgId === "oktoberfest-resa" ? "oktoberfest" : pkgId === "sponsorevent" ? "sponsorevent" : "",
          passengers: pkgId === "oktoberfest-resa" ? 16 : undefined
        });
        return;
      }

      const passBtn = e.target.closest("[data-book-pass]");
      if (passBtn) {
        e.preventDefault();
        prefillQuoteAndOpen({
          startTime: passBtn.getAttribute("data-pass-start") || "20:00",
          packageHint: passBtn.getAttribute("data-pass-hint") || "pass 2"
        });
        return;
      }

      const segBtn = e.target.closest("[data-book-segment]");
      if (segBtn) {
        e.preventDefault();
        prefillQuoteAndOpen({
          eventType: segBtn.getAttribute("data-book-segment") || ""
        });
        return;
      }

      const cityBtn = e.target.closest("[data-book-city]");
      if (cityBtn) {
        e.preventDefault();
        prefillQuoteAndOpen({
          pickupCity: cityBtn.getAttribute("data-book-city") || ""
        });
        return;
      }

      const merchVoteBtn = e.target.closest("[data-vote-merch]");
      if (merchVoteBtn) {
        e.preventDefault();
        handleQuickMerchVote(merchVoteBtn.getAttribute("data-vote-merch"));
        return;
      }

      const merchSelectBtn = e.target.closest("[data-select-merch]");
      if (merchSelectBtn) {
        e.preventDefault();
        const merchId = merchSelectBtn.getAttribute("data-select-merch");
        switchTab("merch");
        const sel = document.getElementById("merch-item-select");
        if (sel && merchId) {
          sel.value = merchId;
          sel.dispatchEvent(new Event("change"));
        }
        const sec = document.getElementById("bsw-merch-interest-section");
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const tabBtn = e.target.closest("[data-tab-target]");
      if (!tabBtn) return;
      e.preventDefault();
      const target = tabBtn.getAttribute("data-tab-target");
      const preselectCar = tabBtn.getAttribute("data-select-car");
      if (preselectCar) {
        prefillQuoteAndOpen({ carName: preselectCar });
      } else {
        switchTab(target);
      }
    });

    const scrollTopBtn = document.getElementById("bsw-scroll-top-btn");
    const updateScrollBtn = () => {
      if (scrollTopBtn) scrollTopBtn.classList.toggle("is-visible", window.scrollY > 240);
    };
    window.addEventListener("scroll", updateScrollBtn, { passive: true });
    updateScrollBtn();

    document.querySelectorAll("[data-scroll-top]").forEach((btn) => {
      btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    });

    const rawHash = (window.location.hash || "").replace(/^#/, "");
    if (rawHash.startsWith("stad-")) {
      const slug = rawHash.replace(/^stad-/, "");
      switchTab("hem", false);
      setTimeout(() => {
        setActiveCityTab(slug);
        const citySec = document.getElementById("bsw-cities-seo-section");
        if (citySec) citySec.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    } else {
      switchTab(normalizeTabAlias(rawHash), false);
    }

    window.addEventListener("hashchange", () => {
      const h = (window.location.hash || "").replace(/^#/, "");
      if (h.startsWith("stad-")) {
        switchTab("hem", false);
        setActiveCityTab(h.replace(/^stad-/, ""));
        const citySec = document.getElementById("bsw-cities-seo-section");
        if (citySec) citySec.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const next = normalizeTabAlias(h);
      if (next !== currentTab) switchTab(next, false);
    });
  }

  // --------------------------------------------------------------------------
  // 6. DELA-KOSTNADEN-KALKYLATOR ("FRÅN UNDER 490 KR PER PERSON!")
  // --------------------------------------------------------------------------
  function initSplitCostCalculator() {
    const rateSel = document.getElementById("bsw-calc-rate");
    const paxRange = document.getElementById("bsw-calc-pax");
    const paxValEl = document.getElementById("bsw-calc-pax-val");
    const perPersonEl = document.getElementById("bsw-calc-per-person");
    const noteEl = document.getElementById("bsw-calc-total-note");
    const bookBtn = document.getElementById("bsw-calc-book-btn");
    const quickBtns = document.querySelectorAll("[data-set-pax]");

    if (!rateSel || !paxRange || !perPersonEl) return;

    const recalc = () => {
      const total = Number(rateSel.value) || 7500;
      const pax = Math.min(16, Math.max(1, parseInt(paxRange.value, 10) || 16));
      const perPerson = Math.round(total / pax);
      if (paxValEl) paxValEl.textContent = `${pax} personer`;
      perPersonEl.textContent = `ca ${perPerson.toLocaleString("sv-SE")} kr / person`;
      const unitLabel = total === 25000 ? "för 12 timmar" : "per timme";
      if (noteEl) {
        noteEl.textContent = `Totalt ${total.toLocaleString("sv-SE")} kr ${unitLabel} delat på ${pax} personer`;
      }
      quickBtns.forEach((b) => {
        b.classList.toggle("is-active", parseInt(b.getAttribute("data-set-pax"), 10) === pax);
      });
    };

    rateSel.addEventListener("change", recalc);
    paxRange.addEventListener("input", recalc);
    quickBtns.forEach((b) => {
      b.addEventListener("click", () => {
        paxRange.value = b.getAttribute("data-set-pax") || "16";
        recalc();
      });
    });

    if (bookBtn) {
      bookBtn.addEventListener("click", () => {
        const total = Number(rateSel.value) || 7500;
        const pax = parseInt(paxRange.value, 10) || 12;
        const hint = total === 5500 ? "vardagskörning" : total === 25000 ? "heldag" : "helgkörning";
        prefillQuoteAndOpen({ passengers: pax, packageHint: hint });
      });
    }

    recalc();
  }

  // --------------------------------------------------------------------------
  // 7. KVÄLLENS 3 PASS, PAKET (INKL. SPONSOREVENT & OKTOBERFEST), B2B & 5 STÄDER
  // --------------------------------------------------------------------------
  function renderEveningPasses() {
    const grid = document.getElementById("bsw-evening-passes-grid");
    const CFG = window.BACKSTAGE_CONFIG || {};
    if (!grid) return;
    const passes = Array.isArray(CFG.eveningPasses) ? CFG.eveningPasses : [];

    grid.innerHTML = passes
      .map(
        (p, idx) => `
      <article class="bsw-pass-card ${idx === 1 ? "is-featured-pass" : ""}">
        <div class="bsw-pass-top">
          <span class="bsw-pass-badge">${escapeHtml(p.passNumber)}</span>
          <span class="bsw-pass-clock">${escapeHtml(p.timeRange)}</span>
        </div>
        <h3>${escapeHtml(p.title)}</h3>
        <strong class="bsw-pass-price">${escapeHtml(p.priceInfo)}</strong>
        <span class="bsw-pass-perperson">${escapeHtml(p.perPersonNote)}</span>
        <p>${escapeHtml(p.desc)}</p>
        <button
          type="button"
          class="bsw-btn ${idx === 1 ? "bsw-btn-primary" : "bsw-btn-ghost"}"
          data-book-pass="${escapeHtml(p.id)}"
          data-pass-start="${escapeHtml(p.startTime || "20:00")}"
          data-pass-hint="pass ${idx + 1}"
        >
          <span>Boka ${escapeHtml(p.passNumber.split("·")[0].trim())}</span>
        </button>
      </article>
    `
      )
      .join("");
  }

  function renderPackages() {
    const CFG = window.BACKSTAGE_CONFIG || {};
    const pkgs = Array.isArray(CFG.bookingPackages) ? CFG.bookingPackages : [];

    const html = pkgs
      .map((p) => {
        const isSpecial = p.id === "oktoberfest-resa" || p.id === "sponsorevent";
        return `
      <article class="bsw-pkg-card ${isSpecial ? "is-special-pkg" : ""}">
        <span class="bsw-pkg-badge">${escapeHtml(p.badge || "PAKET")}</span>
        <h3>${escapeHtml(p.title)}</h3>
        <strong class="bsw-pkg-price">${escapeHtml(p.price)}</strong>
        <p>${escapeHtml(p.desc)}</p>
        <ul class="bsw-pkg-list">
          ${(p.highlights || []).map((h) => `<li>✓ ${escapeHtml(h)}</li>`).join("")}
        </ul>
        <button
          type="button"
          class="bsw-btn ${p.id === "oktoberfest-resa" ? "bsw-btn-primary" : "bsw-btn-ghost"}"
          data-book-pkg="${escapeHtml(p.id)}"
          data-pkg-title="${escapeHtml(p.title)}"
          style="width:100%; margin-top:auto;"
        >
          <span>${p.id === "oktoberfest-resa" ? "Boka Oktoberfest-resa" : "Välj & Begär offert"}</span>
        </button>
      </article>
    `;
      })
      .join("");

    ["bsw-home-packages-grid", "bsw-bilar-packages-grid"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    });
  }

  function renderB2bSegments() {
    const grid = document.getElementById("bsw-b2b-segments-grid");
    const CFG = window.BACKSTAGE_CONFIG || {};
    if (!grid) return;
    const segments = Array.isArray(CFG.b2bSegments) ? CFG.b2bSegments : [];

    grid.innerHTML = segments
      .map(
        (s) => `
      <article class="bsw-pillar-card bsw-b2b-card">
        <span class="bsw-pkg-badge">${escapeHtml(s.kicker)}</span>
        <h3>${escapeHtml(s.title)}</h3>
        <p>${escapeHtml(s.desc)}</p>
        <button
          type="button"
          class="bsw-btn bsw-btn-ghost"
          data-book-segment="${escapeHtml(s.eventSelect || s.title)}"
          style="margin-top: auto; width: 100%;"
        >
          <span>Begär upplägg &amp; pris</span>
        </button>
      </article>
    `
      )
      .join("");
  }

  function setActiveCityTab(slug) {
    activeCityFilter = slug || "all";
    document.querySelectorAll("[data-city-pill]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-city-pill") === activeCityFilter);
    });
    document.querySelectorAll("[data-city-card]").forEach((card) => {
      const cardSlug = card.getAttribute("data-city-card");
      card.hidden = activeCityFilter !== "all" && cardSlug !== activeCityFilter;
    });
  }

  function renderCityLandingPages() {
    const tabsEl = document.getElementById("bsw-city-tabs");
    const stackEl = document.getElementById("bsw-cities-seo-stack");
    const CFG = window.BACKSTAGE_CONFIG || {};
    if (!tabsEl || !stackEl) return;

    const cities = Array.isArray(CFG.cityLandingPages) ? CFG.cityLandingPages : [];
    tabsEl.innerHTML = `
      <button type="button" class="bsw-folder-pill is-active" data-city-pill="all">Alla 5 områden</button>
      ${cities
        .map(
          (c) => `
        <button type="button" class="bsw-folder-pill" data-city-pill="${escapeHtml(c.slug)}">
          📍 ${escapeHtml(c.city)}
        </button>
      `
        )
        .join("")}
    `;

    tabsEl.querySelectorAll("[data-city-pill]").forEach((btn) => {
      btn.addEventListener("click", () => setActiveCityTab(btn.getAttribute("data-city-pill")));
    });

    stackEl.innerHTML = cities
      .map(
        (c) => `
      <article class="bsw-city-seo-card" id="stad-${escapeHtml(c.slug)}" data-city-card="${escapeHtml(c.slug)}">
        <div class="bsw-city-seo-body">
          <span class="bsw-pkg-badge">${escapeHtml(c.regionTag)}</span>
          <h3>${escapeHtml(c.headline)}</h3>
          <p>${escapeHtml(c.summary)}</p>
          <p class="bsw-city-popular"><strong>Populära bokningar i ${escapeHtml(c.city)}:</strong> ${escapeHtml(c.popularFor)}</p>
        </div>
        <div class="bsw-city-seo-cta">
          <span class="bsw-city-rate-chip">Vardag 5 500 kr/h · Helg 7 500 kr/h · Heldag 25 000 kr</span>
          <button type="button" class="bsw-btn bsw-btn-primary" data-book-city="${escapeHtml(c.pickupExample || c.city)}">
            <span>Begär offert i ${escapeHtml(c.city)}</span>
          </button>
        </div>
      </article>
    `
      )
      .join("");
  }

  // --------------------------------------------------------------------------
  // 8. E-POSTPRENUMERATION
  // --------------------------------------------------------------------------
  function initNewsletterForms() {
    document.querySelectorAll("[data-newsletter-form]").forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nameInp = form.querySelector('input[name="name"]');
        const emailInp = form.querySelector('input[name="email"]');
        const msgEl = form.querySelector("[data-newsletter-msg]");
        const submitBtn = form.querySelector('button[type="submit"]');

        const email = emailInp ? emailInp.value.trim() : "";
        const name = nameInp ? nameInp.value.trim() : "";
        if (!email) return;

        if (submitBtn) submitBtn.disabled = true;
        let ok = false;
        let errText = "";

        for (const ep of ["api/subscribe", "api/subscribe.php"]) {
          try {
            const res = await fetch(ep, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, email })
            });
            const ct = res.headers.get("content-type") || "";
            if (!ct.includes("application/json")) continue;
            const data = await res.json();
            if (res.ok && data.ok) {
              ok = true;
              break;
            } else if (data && data.error) {
              errText = data.error;
            }
          } catch (_e) {}
        }

        // Fallback för statisk testmiljö (t.ex. GitHub Pages)
        if (!ok && !errText && email.includes("@")) {
          try {
            const db = JSON.parse(localStorage.getItem("bsw_static_store_v7") || "{}");
            db.subscribers = Array.isArray(db.subscribers) ? db.subscribers : [];
            if (!db.subscribers.some((s) => s.email === email.toLowerCase())) {
              db.subscribers.unshift({
                id: "sub-" + Date.now(),
                email: email.toLowerCase(),
                name: name || "",
                active: true,
                source: "Hemsidan",
                createdAt: new Date().toISOString().slice(0, 16).replace("T", " ")
              });
            }
            localStorage.setItem("bsw_static_store_v7", JSON.stringify(db));
            ok = true;
          } catch (_e) {
            ok = true;
          }
        }

        if (submitBtn) submitBtn.disabled = false;
        if (msgEl) {
          msgEl.hidden = false;
          if (ok) {
            msgEl.className = "bsw-newsletter-feedback is-ok";
            msgEl.textContent =
              "Tack! Din e-post är registrerad – du får nu nya inlägg, merch-släpp och kampanjer direkt i inkorgen.";
            form.reset();
          } else {
            msgEl.className = "bsw-newsletter-feedback is-err";
            msgEl.textContent = errText || "Kunde inte spara just nu – kontrollera din e-postadress.";
          }
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // 9. MERCH ("KOMMER SNART – SE DESIGN & ANMÄL INTRESSE" + LIVE-STÖD)
  // --------------------------------------------------------------------------
  function hasVotedForMerch(productId) {
    try {
      const arr = JSON.parse(localStorage.getItem("bsw_merch_votes") || "[]");
      return Array.isArray(arr) && arr.includes(productId);
    } catch (_e) {
      return false;
    }
  }

  function markVotedForMerch(productId) {
    try {
      const arr = JSON.parse(localStorage.getItem("bsw_merch_votes") || "[]");
      if (!arr.includes(productId)) {
        arr.push(productId);
        localStorage.setItem("bsw_merch_votes", JSON.stringify(arr));
      }
    } catch (_e) {}
  }

  async function handleQuickMerchVote(productId) {
    if (!productId) return;
    const item = allMerch.find((m) => m.id === productId);
    if (!item) return;

    if (hasVotedForMerch(productId)) {
      const sel = document.getElementById("merch-item-select");
      if (sel) sel.value = productId;
      const sec = document.getElementById("bsw-merch-interest-section");
      if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    let voteSavedOnServer = false;
    for (const ep of ["api/merch-interest", "api/merch-interest.php"]) {
      try {
        const res = await fetch(ep, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.id,
            productName: item.name,
            quickVote: true,
            subscribeNewsletter: false
          })
        });
        const ct = res.headers.get("content-type") || "";
        if (res.ok && ct.includes("application/json")) {
          const data = await res.json();
          if (data && data.ok) {
            voteSavedOnServer = true;
            merchInterestCounts = data.interestCounts || merchInterestCounts;
            markVotedForMerch(productId);
            renderMerch();
            break;
          }
        }
      } catch (_e) {}
    }

    // Fallback för statisk testmiljö (t.ex. GitHub Pages)
    if (!voteSavedOnServer) {
      merchInterestCounts[productId] = Number(merchInterestCounts[productId] || 0) + 1;
      try {
        const db = JSON.parse(localStorage.getItem("bsw_static_store_v7") || "{}");
        db.merchInterestCounts = Object.assign({}, db.merchInterestCounts || {}, merchInterestCounts);
        db.merchInterests = Array.isArray(db.merchInterests) ? db.merchInterests : [];
        db.merchInterests.unshift({
          productId: item.id,
          productName: item.name,
          quickVote: true,
          createdAt: new Date().toISOString().slice(0, 16).replace("T", " ")
        });
        localStorage.setItem("bsw_static_store_v7", JSON.stringify(db));
      } catch (_e) {}
      markVotedForMerch(productId);
      renderMerch();
    }
  }

  function renderMerch() {
    const grid = document.getElementById("bsw-merch-grid");
    const selectEl = document.getElementById("merch-item-select");
    const sizeEl = document.getElementById("merch-size-select");
    const soonBanner = document.getElementById("bsw-merch-soon-banner");
    const navTag = document.getElementById("bsw-nav-merch-tag");
    const isComingSoon = merchShopMode !== "live";

    if (navTag) {
      navTag.textContent = isComingSoon ? "SNART" : "SHOP";
    }
    if (soonBanner) {
      soonBanner.querySelector(".bsw-soon-pill").textContent = isComingSoon
        ? "🔥 MERCH-SHOP · KOMMER SNART!"
        : "🔥 OFFICIELL MERCH-SHOP ÖPPEN!";
    }

    document.querySelectorAll("[data-live-merch-only]").forEach((el) => {
      el.hidden = isComingSoon;
    });

    const formKicker = document.getElementById("bsw-merch-form-kicker");
    const formTitle = document.getElementById("bsw-merch-form-title");
    const formDesc = document.getElementById("bsw-merch-form-desc");
    const submitBtn = document.getElementById("bsw-merch-submit-btn");
    if (formKicker) {
      formKicker.textContent = isComingSoon ? "INTRESSEANMÄLAN · INGEN KÖPPLIKT" : "BESTÄLL DIREKT";
    }
    if (formTitle) {
      formTitle.textContent = isComingSoon ? "VILKEN MERCH VILL DU SE FÖRST?" : "SKICKA MERCH-BESTÄLLNING";
    }
    if (formDesc) {
      formDesc.textContent = isComingSoon
        ? "Välj plagg och storlek som du är nyfiken på och lämna din e-post, så meddelar vi dig direkt när kollektionen släpps!"
        : "Välj plagg, storlek och antal nedan så återkommer vi med betalningsinfo (Swish/faktura) och leverans.";
    }
    if (submitBtn) {
      submitBtn.innerHTML = `<span>${isComingSoon ? "Skicka intresseanmälan" : "Skicka beställning"}</span>`;
    }

    if (!grid) return;

    grid.innerHTML = allMerch
      .map((item) => {
        const sizes = Array.isArray(item.sizes) && item.sizes.length ? item.sizes : ["One Size"];
        const votes = Number(merchInterestCounts[item.id] || 0);
        const alreadyVoted = hasVotedForMerch(item.id);

        return `
        <article class="bsw-merch-card">
          <figure
            class="bsw-merch-img-wrap"
            tabindex="0"
            role="button"
            data-lightbox-src="${escapeHtml(item.image)}"
            data-lightbox-thumb="${escapeHtml(item.image)}"
            data-lightbox-caption="${escapeHtml(item.name)} – Planerat riktpris ca ${escapeHtml(item.price)} ${escapeHtml(item.currency || "kr")}"
            data-lightbox-group="merch-showcase"
          >
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />
          </figure>
          <div class="bsw-merch-body">
            <div class="bsw-merch-meta-row">
              <span class="bsw-pkg-badge" style="margin:0;">${escapeHtml(item.badge || (isComingSoon ? "KOMMER SNART" : "MERCH"))}</span>
              <span class="bsw-interest-pill">🔥 ${votes} intresserade</span>
            </div>
            <h2 class="bsw-merch-title">${escapeHtml(item.name)}</h2>
            <strong class="bsw-merch-price">${isComingSoon ? "Planerat pris: ca " : ""}${escapeHtml(item.price)} ${escapeHtml(item.currency || "kr")}</strong>
            <p class="bsw-merch-desc">${escapeHtml(item.description || "")}</p>
            <p class="bsw-merch-sizes"><strong>Planerade storlekar:</strong> ${escapeHtml(sizes.join(", "))}</p>
            <div class="bsw-merch-actions">
              <button
                type="button"
                class="bsw-btn ${alreadyVoted ? "bsw-btn-ghost" : "bsw-btn-primary"}"
                data-vote-merch="${escapeHtml(item.id)}"
              >
                <span>${alreadyVoted ? "✓ Intresse markerat!" : "🔥 Jag gillar denna design!"}</span>
              </button>
              <button
                type="button"
                class="bsw-btn bsw-btn-ghost"
                data-select-merch="${escapeHtml(item.id)}"
              >
                <span>${isComingSoon ? "Bevaka släpp / storlek" : "Beställ"}</span>
              </button>
            </div>
          </div>
        </article>
      `;
      })
      .join("");

    if (selectEl) {
      selectEl.innerHTML = allMerch
        .map(
          (m) =>
            `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)} (${escapeHtml(m.price)} kr)</option>`
        )
        .join("");

      const syncSizes = () => {
        const chosen = allMerch.find((m) => m.id === selectEl.value) || allMerch[0];
        if (!chosen || !sizeEl) return;
        const sizes = Array.isArray(chosen.sizes) && chosen.sizes.length ? chosen.sizes : ["One Size"];
        sizeEl.innerHTML = sizes.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
      };
      selectEl.onchange = syncSizes;
      syncSizes();
    }

    if (window.BackstageLightbox && typeof window.BackstageLightbox.refresh === "function") {
      window.BackstageLightbox.refresh();
    }
  }

  function initMerchForm() {
    const form = document.getElementById("bsw-merch-interest-form");
    const resBox = document.getElementById("bsw-merch-form-result");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const chosen = allMerch.find((m) => m.id === form.productId.value) || allMerch[0];
      if (!chosen) return;

      const btn = document.getElementById("bsw-merch-submit-btn");
      if (btn) btn.disabled = true;

      const isComingSoon = merchShopMode !== "live";

      if (isComingSoon) {
        const payload = {
          productId: chosen.id,
          productName: chosen.name,
          size: form.size.value,
          customerName: form.customerName.value.trim(),
          email: form.email.value.trim(),
          comment: form.comment.value.trim(),
          subscribeNewsletter: Boolean(form.subscribeNewsletter && form.subscribeNewsletter.checked)
        };

        let ok = false;
        for (const ep of ["api/merch-interest", "api/merch-interest.php"]) {
          try {
            const r = await fetch(ep, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            const ct = r.headers.get("content-type") || "";
            if (r.ok && ct.includes("application/json")) {
              const d = await r.json();
              if (d && d.ok) {
                ok = true;
                merchInterestCounts = d.interestCounts || merchInterestCounts;
                markVotedForMerch(chosen.id);
                renderMerch();
                break;
              }
            }
          } catch (_e) {}
        }

        if (!ok) {
          merchInterestCounts[chosen.id] = Number(merchInterestCounts[chosen.id] || 0) + 1;
          try {
            const db = JSON.parse(localStorage.getItem("bsw_static_store_v7") || "{}");
            db.merchInterestCounts = Object.assign({}, db.merchInterestCounts || {}, merchInterestCounts);
            db.merchInterests = Array.isArray(db.merchInterests) ? db.merchInterests : [];
            db.merchInterests.unshift(
              Object.assign({}, payload, {
                quickVote: false,
                createdAt: new Date().toISOString().slice(0, 16).replace("T", " ")
              })
            );
            localStorage.setItem("bsw_static_store_v7", JSON.stringify(db));
          } catch (_e) {}
          ok = true;
          markVotedForMerch(chosen.id);
          renderMerch();
        }

        if (resBox) {
          resBox.hidden = false;
          resBox.innerHTML = `
            <div class="bsw-quote-success-card">
              <span class="bsw-success-badge">${ok ? "INTRESSE REGISTRERAT ✓" : "SPARAT ✓"}</span>
              <h3 style="margin:6px 0 8px;">Tack! Vi har noterat ditt intresse för ${escapeHtml(chosen.name)} (${escapeHtml(payload.size)})</h3>
              <p style="margin:0;color:var(--text-soft);">Vi skickar ett meddelande till <strong>${escapeHtml(payload.email)}</strong> så fort shopen öppnar!</p>
            </div>
          `;
        }
        form.reset();
      } else {
        const payload = {
          productId: chosen.id,
          productName: chosen.name,
          unitPrice: Number(chosen.price) || 0,
          size: form.size.value,
          quantity: Math.max(1, parseInt(form.quantity.value, 10) || 1),
          customerName: form.customerName.value.trim(),
          phone: form.phone ? form.phone.value.trim() : "",
          email: form.email.value.trim(),
          address: form.address ? form.address.value.trim() : "",
          message: form.comment.value.trim(),
          subscribeNewsletter: Boolean(form.subscribeNewsletter && form.subscribeNewsletter.checked)
        };

        for (const ep of ["/api/merch-order", "api/merch-order.php"]) {
          try {
            const r = await fetch(ep, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            if (r.ok) break;
          } catch (_e) {}
        }

        if (resBox) {
          resBox.hidden = false;
          resBox.innerHTML = `
            <div class="bsw-quote-success-card">
              <span class="bsw-success-badge">BESTÄLLNING MOTTAGEN ✓</span>
              <h3 style="margin:6px 0 8px;">Tack för din beställning, ${escapeHtml(payload.customerName || "vän")}!</h3>
              <p style="margin:0;color:var(--text-soft);">Vi återkommer snart till ${escapeHtml(payload.email)} med leverans- och betalningsbekräftelse.</p>
            </div>
          `;
        }
        form.reset();
      }

      if (btn) btn.disabled = false;
    });
  }

  // --------------------------------------------------------------------------
  // 10. KALENDER & KOMMANDE EVENEMANG (#kalender)
  // --------------------------------------------------------------------------
  async function loadCalendarData() {
    const CFG = window.BACKSTAGE_CONFIG || {};
    calendarEntries = Array.isArray(CFG.defaultCalendar) ? [...CFG.defaultCalendar] : [];

    for (const url of ["/api/calendar", "api/calendar.php"]) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data && data.ok && Array.isArray(data.items) && data.items.length > 0) {
            calendarEntries = data.items;
            break;
          }
        }
      } catch (_e) {}
    }

    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();

    renderCalendarGrid();
    renderUpcomingEvents();
  }

  function getEntriesForDate(dateStr) {
    return calendarEntries.filter((e) => {
      const start = e.date || "";
      const end = e.endDate || start;
      return dateStr >= start && dateStr <= end;
    });
  }

  function renderCalendarGrid() {
    const labelEl = document.getElementById("bsw-cal-month-label");
    const gridEl = document.getElementById("bsw-cal-days-grid");
    if (!labelEl || !gridEl) return;

    const monthNames = [
      "Januari", "Februari", "Mars", "April", "Maj", "Juni",
      "Juli", "Augusti", "September", "Oktober", "November", "December"
    ];
    labelEl.textContent = `${monthNames[calMonth]} ${calYear}`;

    const firstDay = new Date(calYear, calMonth, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const todayIso = new Date().toISOString().slice(0, 10);

    let cells = "";
    for (let i = 0; i < startWeekday; i++) {
      cells += `<div class="bsw-cal-cell is-empty" aria-hidden="true"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const hits = getEntriesForDate(iso);
      const isPast = iso < todayIso;

      let stateClass = "is-free";
      let shortTag = "Ledig";

      if (hits.some((h) => h.availability === "booked")) {
        stateClass = "is-booked";
        shortTag = "Bokad";
      } else if (hits.some((h) => h.kind === "event")) {
        stateClass = "is-event";
        shortTag = "Event";
      } else if (hits.some((h) => h.availability === "partial")) {
        stateClass = "is-partial";
        shortTag = "Pass kvar";
      }

      if (isPast) {
        stateClass = "is-past";
        shortTag = "";
      }

      const selectedCls = selectedDateStr === iso ? "is-selected" : "";
      cells += `
        <button
          type="button"
          class="bsw-cal-cell ${stateClass} ${selectedCls}"
          data-cal-date="${iso}"
          ${isPast ? "disabled" : ""}
        >
          <span class="cal-day-num">${d}</span>
          ${shortTag ? `<span class="cal-day-tag">${escapeHtml(shortTag)}</span>` : ""}
        </button>
      `;
    }

    gridEl.innerHTML = cells;
    gridEl.querySelectorAll("[data-cal-date]").forEach((btn) => {
      btn.addEventListener("click", () => selectCalendarDate(btn.getAttribute("data-cal-date")));
    });
  }

  function selectCalendarDate(iso) {
    selectedDateStr = iso;
    renderCalendarGrid();

    const dateTitle = document.getElementById("bsw-cal-detail-date");
    const statusText = document.getElementById("bsw-cal-detail-status");
    const bookBtn = document.getElementById("bsw-cal-book-date-btn");
    const card = document.getElementById("bsw-cal-selected-detail");
    if (!dateTitle || !statusText || !bookBtn) return;

    const hits = getEntriesForDate(iso);
    dateTitle.textContent = iso;

    if (!hits.length) {
      card.className = "bsw-cal-detail-card is-free";
      statusText.innerHTML =
        "<strong>✅ Alla 3 kvällspass är lediga detta datum!</strong><br>Vardag: 5 500 kr/h · Helg: 7 500 kr/h · Heldag (12 h): 25 000 kr. Klicka nedan för att förifylla datumet i offertformuläret.";
      bookBtn.hidden = false;
      bookBtn.onclick = () => prefillQuoteAndOpen({ dateStr: iso });
      return;
    }

    const fullyBooked = hits.some((h) => h.availability === "booked");
    const detailsHtml = hits
      .map(
        (h) => `
        <div style="margin-top:10px;padding:12px;border-radius:8px;background:var(--bg-stage);border:1px solid var(--border-steel);">
          <strong>${escapeHtml(h.publicTitle || "Bokning / Evenemang")}</strong><br>
          <span style="color:var(--accent-gold);font-size:0.95rem;">🕒 ${escapeHtml(h.timeSlot || "Se tider")}</span>
          ${h.location ? `<br><span style="font-size:0.9rem;color:var(--text-muted);">📍 ${escapeHtml(h.location)}</span>` : ""}
          ${h.description ? `<p style="margin:6px 0 0;font-size:0.94rem;">${escapeHtml(h.description)}</p>` : ""}
        </div>`
      )
      .join("");

    if (fullyBooked) {
      card.className = "bsw-cal-detail-card is-booked";
      statusText.innerHTML = `<strong>🔴 Fullbokat datum</strong>${detailsHtml}<p style="margin-top:10px;">Välj gärna en närliggande dag eller hör av dig om väntelista!</p>`;
      bookBtn.hidden = false;
      bookBtn.onclick = () => prefillQuoteAndOpen({ dateStr: iso });
    } else {
      card.className = "bsw-cal-detail-card is-partial";
      statusText.innerHTML = `<strong>🟡 Lediga kvällspass finns kvar!</strong>${detailsHtml}`;
      bookBtn.hidden = false;
      bookBtn.onclick = () => prefillQuoteAndOpen({ dateStr: iso });
    }
  }

  function renderUpcomingEvents() {
    const wrap = document.getElementById("bsw-upcoming-events-list");
    if (!wrap) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    const events = calendarEntries
      .filter((e) => e.kind === "event" && (e.endDate || e.date) >= todayIso)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    if (!events.length) {
      wrap.innerHTML = `<p style="color:var(--text-muted);">Nya festivaler och turnéstopp presenteras löpande!</p>`;
      return;
    }

    wrap.innerHTML = events
      .map(
        (ev) => `
      <article class="bsw-event-card">
        <div class="bsw-event-date-box">
          <strong>${escapeHtml(ev.date)}${ev.endDate && ev.endDate !== ev.date ? ` → ${escapeHtml(ev.endDate.slice(5))}` : ""}</strong>
          <span>${escapeHtml(ev.location || "Sverige")}</span>
        </div>
        <div class="bsw-event-info">
          <h3>${escapeHtml(ev.publicTitle)}</h3>
          <p>${escapeHtml(ev.description || ev.timeSlot || "")}</p>
          <span style="display:inline-block;font-size:0.92rem;color:var(--accent-gold);margin-top:6px;">🕒 ${escapeHtml(ev.timeSlot || "VIP-pass & Sponsorevent")}</span>
          <div style="margin-top:14px;">
            <button type="button" class="bsw-btn bsw-btn-ghost" data-ev-book="${escapeHtml(ev.date)}" data-ev-id="${escapeHtml(ev.id || "")}">
              <span>Boka detta datum / event</span>
            </button>
          </div>
        </div>
      </article>
    `
      )
      .join("");

    wrap.querySelectorAll("[data-ev-book]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const evId = btn.getAttribute("data-ev-id") || "";
        prefillQuoteAndOpen({
          dateStr: btn.getAttribute("data-ev-book"),
          packageHint: evId.includes("oktoberfest") ? "oktoberfest" : undefined,
          eventType: evId.includes("oktoberfest") ? "oktoberfest" : undefined,
          passengers: evId.includes("oktoberfest") ? 16 : undefined
        });
      });
    });
  }

  function initCalendarControls() {
    const prev = document.getElementById("bsw-cal-prev");
    const next = document.getElementById("bsw-cal-next");
    if (prev) {
      prev.addEventListener("click", () => {
        calMonth -= 1;
        if (calMonth < 0) {
          calMonth = 11;
          calYear -= 1;
        }
        renderCalendarGrid();
      });
    }
    if (next) {
      next.addEventListener("click", () => {
        calMonth += 1;
        if (calMonth > 11) {
          calMonth = 0;
          calYear += 1;
        }
        renderCalendarGrid();
      });
    }
    const defaultBtn = document.getElementById("bsw-cal-book-date-btn");
    if (defaultBtn) {
      defaultBtn.onclick = () => prefillQuoteAndOpen({ dateStr: selectedDateStr });
    }
  }

  // --------------------------------------------------------------------------
  // 11. INLÄGG MED STÖD FÖR INBÄDDADE BILDER & VIDEOKLIPP (#inlagg)
  // --------------------------------------------------------------------------
  function renderInlinePostBody(rawText, groupName) {
    const safe = linkifyContactText(rawText || "");
    const mediaTagRegex = /\[MEDIA:([^\]|]+)(?:\|([^\]]*))?\]/g;
    return safe
      .replace(mediaTagRegex, (_full, rawSrc, rawCap) => {
        const src = String(rawSrc || "").trim();
        const cap = String(rawCap || "").trim();
        if (!src) return "";
        const isVid = isVideoUrl(src);
        return `
          <figure
            class="bsw-post-inline-media"
            tabindex="0"
            role="button"
            data-lightbox-src="${src}"
            data-lightbox-thumb="${src}"
            data-lightbox-type="${isVid ? "video" : "image"}"
            data-lightbox-caption="${cap}"
            data-lightbox-group="${escapeHtml(groupName)}"
          >
            ${
              isVid
                ? `<video src="${src}" muted playsinline preload="metadata"></video><span class="bsw-video-play-pill">▶ SPELA KLIPP</span>`
                : `<img src="${src}" alt="${cap || "Bild i inlägg"}" loading="lazy" />`
            }
            ${cap ? `<figcaption>${cap}</figcaption>` : ""}
          </figure>
        `;
      })
      .replace(/\n/g, "<br>");
  }

  function renderPosts() {
    const grid = document.getElementById("bsw-posts-grid");
    if (!grid) return;

    if (!allPosts.length) {
      grid.innerHTML = `<p style="color:var(--text-muted);">Inga inlägg publicerade ännu.</p>`;
      refreshNewPostsGoldIndicator();
      return;
    }

    grid.innerHTML = allPosts
      .map((post, idx) => {
        const mediaList = Array.isArray(post.media) && post.media.length ? post.media : [];
        const first = mediaList[0] || {
          src: "bilder/bilar/hummer-legends-sida.jpg",
          thumb: "bilder/bilar/hummer-legends-sida.jpg",
          type: "image",
          caption: post.title
        };
        const extraMedia = mediaList.slice(1);
        const isVid = isVideoUrl(first.src, first.type);
        const channels = Array.isArray(post.sharedTo) ? post.sharedTo : [];
        const groupName = `post-media-${idx}`;

        return `
        <article class="bsw-post-card">
          <figure
            class="bsw-post-media-fig"
            tabindex="0"
            role="button"
            aria-label="Öppna ${escapeHtml(post.title || "inlägg")} i helskärm"
            data-lightbox-src="${escapeHtml(first.src)}"
            data-lightbox-thumb="${escapeHtml(first.thumb || first.src)}"
            data-lightbox-type="${isVid ? "video" : "image"}"
            data-lightbox-caption="${escapeHtml(first.caption || post.title)}"
            data-lightbox-group="${groupName}"
          >
            ${
              isVid
                ? `<video src="${escapeHtml(first.src)}" poster="${escapeHtml(first.thumb || "")}" muted loop playsinline preload="metadata"></video>
                   <span class="bsw-video-play-pill">▶ VIDEO</span>`
                : `<img src="${escapeHtml(first.thumb || first.src)}" alt="${escapeHtml(post.title || "Backstage Wheels")}" loading="lazy" />`
            }
          </figure>

          <div class="bsw-post-body">
            <div class="bsw-post-meta-top">
              <span class="bsw-post-date">${escapeHtml(post.createdAt || "")}</span>
              <div class="bsw-post-channels">
                ${channels.map((ch) => `<span class="bsw-channel-pill">✓ ${escapeHtml(ch)}</span>`).join("")}
              </div>
            </div>
            <h2 class="bsw-post-title">${escapeHtml(post.title || "")}</h2>
            <div class="bsw-post-text">${renderInlinePostBody(post.text || "", groupName)}</div>

            ${
              extraMedia.length
                ? `<div class="bsw-post-extra-media-grid">
                    ${extraMedia
                      .map((m) => {
                        const mVid = isVideoUrl(m.src, m.type);
                        return `
                        <figure
                          class="bsw-post-extra-thumb"
                          tabindex="0"
                          role="button"
                          data-lightbox-src="${escapeHtml(m.src)}"
                          data-lightbox-thumb="${escapeHtml(m.thumb || m.src)}"
                          data-lightbox-type="${mVid ? "video" : "image"}"
                          data-lightbox-caption="${escapeHtml(m.caption || post.title)}"
                          data-lightbox-group="${groupName}"
                        >
                          ${
                            mVid
                              ? `<video src="${escapeHtml(m.src)}" muted playsinline preload="metadata"></video><span class="bsw-video-play-pill">▶</span>`
                              : `<img src="${escapeHtml(m.thumb || m.src)}" alt="${escapeHtml(m.caption || post.title)}" loading="lazy" />`
                          }
                        </figure>`;
                      })
                      .join("")}
                   </div>`
                : ""
            }

            ${post.hashtags ? `<p class="bsw-post-tags">${escapeHtml(post.hashtags)}</p>` : ""}

            <div class="bsw-post-actions">
              <button type="button" class="bsw-btn bsw-btn-ghost" data-open-post-idx="${idx}">
                <span>Visa i helskärm</span>
              </button>
              <button type="button" class="bsw-btn bsw-btn-primary" data-tab-target="offert">
                <span>Begär offert</span>
              </button>
            </div>
          </div>
        </article>
      `;
      })
      .join("");

    grid.querySelectorAll("[data-open-post-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".bsw-post-card");
        const fig = card && card.querySelector(".bsw-post-media-fig");
        if (fig) fig.click();
      });
    });

    refreshNewPostsGoldIndicator();
    if (window.BackstageLightbox && typeof window.BackstageLightbox.refresh === "function") {
      window.BackstageLightbox.refresh();
    }
  }

  // --------------------------------------------------------------------------
  // 12. VÅRA BILAR & PRISER (#bilar)
  // --------------------------------------------------------------------------
  function renderFleet() {
    const container = document.getElementById("bsw-fleet-list");
    const selectEl = document.getElementById("offert-bil");
    const CFG = window.BACKSTAGE_CONFIG || {};
    const cars = Array.isArray(CFG.cars) ? CFG.cars : [];

    if (selectEl) {
      selectEl.innerHTML = "";
      cars.forEach((car) => {
        const opt = document.createElement("option");
        opt.value = car.name;
        opt.textContent = car.status === "coming_soon" ? `${car.name} (Specialupplägg)` : car.name;
        selectEl.appendChild(opt);
      });
    }

    if (!container) return;

    container.innerHTML = cars
      .map((car, index) => {
        const groupName = `fleet-car-${index}`;
        const isComingSoon = car.status === "coming_soon";
        const subImages = (car.images || []).slice(1);
        const mainSrc = (car.mainImage && car.mainImage.src) || "bilder/bilar/hummer-legends-sida.jpg";
        const mainCap = (car.mainImage && car.mainImage.caption) || car.name;

        const specsHtml = (car.specs || [])
          .map(
            (s) => `
          <div class="bsw-spec-box">
            <span class="bsw-spec-label">${escapeHtml(s.label)}</span>
            <strong class="bsw-spec-value">${escapeHtml(s.value)}</strong>
          </div>`
          )
          .join("");

        const featuresHtml = (car.features || [])
          .map(
            (f) => `
          <li>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>${escapeHtml(f)}</span>
          </li>`
          )
          .join("");

        const thumbsHtml = subImages
          .map(
            (img) => `
          <figure
            class="bsw-car-thumb-card"
            tabindex="0"
            role="button"
            data-lightbox-src="${escapeHtml(img.src)}"
            data-lightbox-thumb="${escapeHtml(img.src)}"
            data-lightbox-caption="${escapeHtml(img.caption)}"
            data-lightbox-group="${groupName}"
          >
            <img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.caption)}" loading="lazy" />
          </figure>`
          )
          .join("");

        return `
        <article class="bsw-car-showcase ${isComingSoon ? "is-template-car" : ""}">
          <div class="bsw-car-media-col">
            <figure
              class="bsw-car-main-fig"
              tabindex="0"
              role="button"
              data-lightbox-src="${escapeHtml(mainSrc)}"
              data-lightbox-thumb="${escapeHtml(mainSrc)}"
              data-lightbox-caption="${escapeHtml(mainCap)}"
              data-lightbox-group="${groupName}"
            >
              <img src="${escapeHtml(mainSrc)}" alt="${escapeHtml(car.name)}" loading="lazy" />
            </figure>
            <p class="bsw-under-img-hint">🔍 Klicka på huvudbilden eller detaljbilderna för att öppna i helskärm</p>
            ${subImages.length ? `<div class="bsw-car-subthumbs">${thumbsHtml}</div>` : ""}
          </div>

          <div class="bsw-car-details">
            <div>
              <span class="bsw-pkg-badge">${escapeHtml(car.badge || "VIP LIMO")}</span>
              <h2 class="bsw-car-title">${escapeHtml(car.name)}</h2>
              <p class="bsw-car-lead">${escapeHtml(car.shortIntro || "")}</p>
            </div>

            <div class="bsw-car-price-banner">
              <span class="bsw-price-tag-lbl">PRISBILD</span>
              <strong class="bsw-price-tag-val">${escapeHtml(car.price || "Enligt offert")}</strong>
            </div>

            <div class="bsw-specs-grid">${specsHtml}</div>
            <p class="bsw-car-body">${linkifyContactText(car.description || "")}</p>

            <div>
              <h3 class="bsw-subhead">UTRUSTNING &amp; HÖJDPUNKTER</h3>
              <ul class="bsw-feature-list">${featuresHtml}</ul>
            </div>

            <div class="bsw-car-cta-row">
              <button
                type="button"
                class="bsw-btn bsw-btn-primary"
                data-tab-target="offert"
                data-select-car="${escapeHtml(car.name)}"
              >
                <span>Begär offert på denna bil</span>
              </button>
              <button type="button" class="bsw-btn bsw-btn-ghost" data-tab-target="kalender">
                <span>Se lediga datum</span>
              </button>
            </div>
          </div>
        </article>`;
      })
      .join("");
  }

  // --------------------------------------------------------------------------
  // 13. BILDGALLERI MED EVENEMANGSMAPPAR (#galleri)
  // --------------------------------------------------------------------------
  async function loadGallery() {
    const statusText = document.getElementById("bsw-ftp-status-text");
    const CFG = window.BACKSTAGE_CONFIG || {};
    let loaded = null;

    const endpoints = [
      CFG.gallery && CFG.gallery.nodeEndpoint,
      CFG.gallery && CFG.gallery.phpEndpoint,
      "/api/gallery",
      "api/gallery.php"
    ].filter(Boolean);

    for (const url of endpoints) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const ct = res.headers.get("content-type") || "";
        if (res.ok && ct.includes("application/json")) {
          const data = await res.json();
          if (data && Array.isArray(data.images) && data.images.length > 0) {
            loaded = data.images;
            if (Array.isArray(data.folders) && data.folders.length > 0) {
              galleryFolders = data.folders;
            }
            if (statusText) {
              statusText.innerHTML = `Visar <strong>${loaded.length}</strong> bilder &amp; videoklipp i <strong>${galleryFolders.length || 1}</strong> evenemangsmappar.`;
            }
            break;
          }
        }
      } catch (_err) {}
    }

    if (!loaded) {
      try {
        const localDb = JSON.parse(localStorage.getItem("bsw_static_store_v7") || "{}");
        if (Array.isArray(localDb.galleryImages) && localDb.galleryImages.length > 0) {
          loaded = localDb.galleryImages;
          galleryFolders = Array.isArray(localDb.folders) && localDb.folders.length ? localDb.folders : CFG.defaultGalleryFolders || [];
          if (statusText) {
            statusText.innerHTML = `Visar <strong>${loaded.length}</strong> bilder &amp; videoklipp i <strong>${galleryFolders.length || 1}</strong> evenemangsmappar.`;
          }
        }
      } catch (_e) {}
    }

    if (!loaded) {
      loaded = (CFG.fallbackGallery || []).map((item) => ({
        src: item.src,
        thumb: item.thumb || item.src,
        title: item.title,
        type: item.type || (isVideoUrl(item.src) ? "video" : "image"),
        folderSlug: item.folderSlug || "ovrigt",
        folderName: item.folderName || "Övriga bilder"
      }));
      galleryFolders = CFG.defaultGalleryFolders || [];
      if (statusText) {
        statusText.innerHTML = `Visar <strong>${loaded.length}</strong> bilder &amp; videoklipp från galleriet.`;
      }
    }

    allGalleryItems = loaded;
    renderFolderSelectors();
    renderGalleryGrid();
    renderHomeStrip();
  }

  function renderFolderSelectors() {
    const tabsWrap = document.getElementById("bsw-folder-tabs");
    const cardsWrap = document.getElementById("bsw-folders-cards-grid");
    if (!tabsWrap) return;

    const totalCount = allGalleryItems.length;
    const pills = [
      `<button type="button" class="bsw-folder-pill ${activeFolderSlug === "all" ? "is-active" : ""}" data-folder-select="all">
         Alla mappar (${totalCount})
       </button>`
    ];

    galleryFolders.forEach((f) => {
      const count = f.count !== undefined ? f.count : allGalleryItems.filter((i) => i.folderSlug === f.slug).length;
      if (count === 0) return;
      pills.push(`
        <button type="button" class="bsw-folder-pill ${activeFolderSlug === f.slug ? "is-active" : ""}" data-folder-select="${escapeHtml(f.slug)}">
          📁 ${escapeHtml(f.name)} (${count})
        </button>
      `);
    });

    tabsWrap.innerHTML = pills.join("");
    tabsWrap.querySelectorAll("[data-folder-select]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeFolderSlug = btn.getAttribute("data-folder-select") || "all";
        renderFolderSelectors();
        renderGalleryGrid();
      });
    });

    if (cardsWrap) {
      if (activeFolderSlug !== "all") {
        const cur = galleryFolders.find((f) => f.slug === activeFolderSlug);
        cardsWrap.innerHTML = cur
          ? `<div class="bsw-open-folder-banner">
               <div>
                 <span class="bsw-kicker" style="margin-bottom:6px;">ÖPPEN MAPP · ${escapeHtml(cur.date || "")}</span>
                 <h2 style="margin:0 0 4px;">📁 ${escapeHtml(cur.name)}</h2>
                 <p style="margin:0;color:var(--text-soft);">${escapeHtml(cur.description || "")}</p>
               </div>
               <button type="button" class="bsw-btn bsw-btn-ghost" id="bsw-back-all-folders">&larr; Visa alla mappar</button>
             </div>`
          : "";
        const backBtn = document.getElementById("bsw-back-all-folders");
        if (backBtn) {
          backBtn.addEventListener("click", () => {
            activeFolderSlug = "all";
            renderFolderSelectors();
            renderGalleryGrid();
          });
        }
      } else {
        cardsWrap.innerHTML = galleryFolders
          .filter((f) => {
            const c = f.count !== undefined ? f.count : allGalleryItems.filter((i) => i.folderSlug === f.slug).length;
            return c > 0;
          })
          .map((f) => {
            const itemsInFolder = allGalleryItems.filter((i) => i.folderSlug === f.slug);
            const cover = f.cover || (itemsInFolder[0] && (itemsInFolder[0].thumb || itemsInFolder[0].src)) || "bilder/bilar/hummer-legends-sida.jpg";
            const count = f.count !== undefined ? f.count : itemsInFolder.length;
            return `
            <button type="button" class="bsw-folder-card" data-open-folder="${escapeHtml(f.slug)}">
              <div class="bsw-folder-cover">
                <img src="${escapeHtml(cover)}" alt="${escapeHtml(f.name)}" loading="lazy" />
              </div>
              <div class="bsw-folder-meta">
                <span class="folder-date">${escapeHtml(f.date || "Evenemang")} · ${count} st</span>
                <strong>📁 ${escapeHtml(f.name)}</strong>
                <p>${escapeHtml(f.description || "")}</p>
              </div>
            </button>
          `;
          })
          .join("");

        cardsWrap.querySelectorAll("[data-open-folder]").forEach((card) => {
          card.addEventListener("click", () => {
            activeFolderSlug = card.getAttribute("data-open-folder");
            renderFolderSelectors();
            renderGalleryGrid();
          });
        });
      }
    }
  }

  function renderGalleryGrid() {
    const grid = document.getElementById("bsw-gallery-grid");
    const countEl = document.getElementById("bsw-gallery-count");
    if (!grid) return;

    const filtered =
      activeFolderSlug === "all"
        ? allGalleryItems
        : allGalleryItems.filter((it) => it.folderSlug === activeFolderSlug);

    if (countEl) countEl.textContent = `${filtered.length} objekt`;

    grid.innerHTML = filtered
      .map((item) => {
        const isVid = isVideoUrl(item.src, item.type);
        const thumbUrl = item.thumb || item.src;

        return `
        <figure
          class="bsw-gallery-card"
          tabindex="0"
          role="button"
          aria-label="Öppna ${escapeHtml(item.title)} i helskärm"
          data-lightbox-src="${escapeHtml(item.src)}"
          data-lightbox-thumb="${escapeHtml(thumbUrl)}"
          data-lightbox-type="${isVid ? "video" : "image"}"
          data-lightbox-caption="${escapeHtml(item.title)}${item.folderName ? ` — ${escapeHtml(item.folderName)}` : ""}"
          data-lightbox-group="main-gallery"
        >
          <div class="bsw-gallery-img-box">
            <img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" />
            ${isVid ? `<span class="bsw-video-play-pill">▶ VIDEO</span>` : ""}
          </div>
          <figcaption class="bsw-gallery-caption-bar">
            <span class="bsw-gallery-title">${escapeHtml(item.title)}</span>
            <span class="bsw-gallery-dim">${escapeHtml(item.folderName || (isVid ? "Video" : "Foto"))}</span>
          </figcaption>
        </figure>`;
      })
      .join("");

    if (window.BackstageLightbox && typeof window.BackstageLightbox.refresh === "function") {
      window.BackstageLightbox.refresh();
    }
  }

  function renderHomeStrip() {
    const strip = document.getElementById("bsw-home-gallery-strip");
    if (!strip) return;
    const preview = allGalleryItems.slice(0, 4);

    strip.innerHTML = preview
      .map((item) => {
        const isVid = isVideoUrl(item.src, item.type);
        const thumbUrl = item.thumb || item.src;
        return `
        <figure
          class="bsw-home-shot-clean"
          tabindex="0"
          role="button"
          data-lightbox-src="${escapeHtml(item.src)}"
          data-lightbox-thumb="${escapeHtml(thumbUrl)}"
          data-lightbox-type="${isVid ? "video" : "image"}"
          data-lightbox-caption="${escapeHtml(item.title)}"
          data-lightbox-group="home-strip"
        >
          <div class="shot-media">
            <img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" />
            ${isVid ? `<span class="bsw-video-play-pill">▶ VIDEO</span>` : ""}
          </div>
          <figcaption>${escapeHtml(item.title)}</figcaption>
        </figure>`;
      })
      .join("");

    if (window.BackstageLightbox && typeof window.BackstageLightbox.refresh === "function") {
      window.BackstageLightbox.refresh();
    }
  }

  function initGalleryToolbar() {
    const refreshBtn = document.getElementById("bsw-refresh-gallery");
    if (refreshBtn) refreshBtn.addEventListener("click", () => loadGallery());
  }

  // --------------------------------------------------------------------------
  // 14. OFFERTFORMULÄR (#offert)
  // --------------------------------------------------------------------------
  function initQuoteForm() {
    const form = document.getElementById("bsw-quote-form");
    const resultBox = document.getElementById("bsw-quote-result");
    const dateInput = document.getElementById("offert-datum");

    if (dateInput) {
      const today = new Date().toISOString().split("T")[0];
      dateInput.min = today;
    }

    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      data.subscribeNewsletter = Boolean(form.subscribeNewsletter && form.subscribeNewsletter.checked);

      const CFG = window.BACKSTAGE_CONFIG || {};
      const emailList = parseEmailItems(CFG.contactEmail || "bokning@backstagewheels.se");
      const targetEmail = emailList.length
        ? emailList[0].label
        : String(CFG.contactEmail || "bokning@backstagewheels.se").trim();

      const summary = [
        `OFFERTFÖRFRÅGAN – BACKSTAGE WHEELS`,
        `----------------------------------------`,
        `Önskad bil:        ${data.bil}`,
        `Typ av körning:    ${data.eventTyp}`,
        `Önskat datum:      ${data.datum} kl. ${data.starttid}`,
        `Upplägg / paket:   ${data.kortid}`,
        `Antal passagerare: ${data.passagerare} st`,
        `Upphämtning:       ${data.fran}`,
        `Destination:       ${data.till}`,
        ``,
        `KONTAKTUPPGIFTER`,
        `Namn / Företag:    ${data.namn}`,
        `Telefon:           ${data.telefon}`,
        `E-post:            ${data.epost}`,
        `Övriga önskemål:   ${data.meddelande || "-"}`
      ].join("\n");

      let savedServer = false;
      let resolvedRecipient = targetEmail;
      for (const ep of ["/api/offert", "api/offert.php"]) {
        try {
          const r = await fetch(ep, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
          });
          if (r.ok) {
            savedServer = true;
            try {
              const respJson = await r.json();
              if (respJson && respJson.recipient) resolvedRecipient = respJson.recipient;
            } catch (_ignore) {}
            break;
          }
        } catch (_e) {}
      }

      if (!savedServer) {
        try {
          const db = JSON.parse(localStorage.getItem("bsw_static_store_v7") || "{}");
          db.quotes = Array.isArray(db.quotes) ? db.quotes : [];
          db.quotes.unshift(
            Object.assign({}, data, {
              receivedAt: new Date().toISOString().slice(0, 16).replace("T", " ")
            })
          );
          localStorage.setItem("bsw_static_store_v7", JSON.stringify(db));
        } catch (_e) {}
      }

      const subject = `Offertförfrågan ${data.datum} – ${data.bil} (${data.namn})`;
      const mailHref = toMailtoHref(resolvedRecipient, subject, summary);

      if (resultBox) {
        resultBox.hidden = false;
        resultBox.innerHTML = `
          <div class="bsw-quote-success-card">
            <span class="bsw-success-badge">
              ${savedServer ? "FÖRFRÅGAN REGISTRERAD ✓" : " REDO ATT SKICKAS ✓"}
            </span>
            <h3 style="margin:6px 0 8px;">Tack ${escapeHtml(data.namn)}! Vi återkommer snabbt med prisförslag</h3>
            <p style="color:var(--text-soft);margin:0 0 12px;">
              ${
                savedServer
                  ? `Din förfrågan har sparats till <a href="${escapeHtml(mailHref)}" class="bsw-inline-contact-link">${escapeHtml(resolvedRecipient)}</a>.`
                  : "Klicka på knappen nedan om du även vill skicka en kopia direkt via ditt e-postprogram."
              }
            </p>
            <pre class="bsw-quote-summary-pre">${escapeHtml(summary)}</pre>
            <div class="bsw-quote-result-actions">
              <a class="bsw-btn bsw-btn-primary" href="${escapeHtml(mailHref)}">Öppna i e-postprogram (${escapeHtml(resolvedRecipient)})</a>
              <button type="button" class="bsw-btn bsw-btn-ghost" id="bsw-copy-quote-btn">Kopiera texten</button>
            </div>
          </div>`;

        const copyBtn = document.getElementById("bsw-copy-quote-btn");
        if (copyBtn && navigator.clipboard) {
          copyBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(summary).then(() => {
              copyBtn.textContent = "Kopierat ✓";
            });
          });
        }
        resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }

  // --------------------------------------------------------------------------
  // 15. MOBIL-EXKLUSIV PWA-INSTALLATION (ENDAST MOBIL & BARA OM APPEN SAKNAS!)
  // --------------------------------------------------------------------------
  function isStrictMobileDevice() {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean") {
      return navigator.userAgentData.mobile;
    }
    const ua = navigator.userAgent || "";
    const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const hasTouch = (navigator.maxTouchPoints || 0) > 0 || "ontouchstart" in window;
    const narrowScreen = Math.min(window.screen.width || 9999, window.innerWidth || 9999) <= 900;
    return Boolean(mobileUa && hasTouch && narrowScreen);
  }

  async function isPwaAlreadyInstalled() {
    try {
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
      if (window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches) return true;
      if (window.navigator.standalone === true) return true;
      if (document.referrer && document.referrer.startsWith("android-app://")) return true;
      if (localStorage.getItem("bsw_pwa_installed") === "1") return true;
      if (typeof navigator.getInstalledRelatedApps === "function") {
        const related = await navigator.getInstalledRelatedApps();
        if (Array.isArray(related) && related.length > 0) return true;
      }
    } catch (_e) {}
    return false;
  }

  async function initMobileOnlyPwa() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }

    const banner = document.getElementById("bsw-mobile-pwa-banner");
    const installBtn = document.getElementById("bsw-mobile-pwa-install");
    const dismissBtn = document.getElementById("bsw-mobile-pwa-dismiss");
    const descEl = document.getElementById("bsw-mobile-pwa-desc");
    if (!banner || !installBtn || !dismissBtn) return;

    // 1. Visa ALDRIG på dator/desktop!
    if (!isStrictMobileDevice()) {
      banner.hidden = true;
      return;
    }

    // 2. Visa ALDRIG om appen redan är installerad!
    if (await isPwaAlreadyInstalled()) {
      banner.hidden = true;
      return;
    }

    // Respektera om besökaren stängt rutan under samma session
    try {
      if (sessionStorage.getItem("bsw_pwa_dismissed") === "1") {
        banner.hidden = true;
        return;
      }
    } catch (_e) {}

    const isIosSafari =
      /iPhone|iPad|iPod/i.test(navigator.userAgent || "") &&
      /WebKit/i.test(navigator.userAgent || "") &&
      !/CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent || "");

    window.addEventListener("beforeinstallprompt", async (e) => {
      e.preventDefault();
      if (!isStrictMobileDevice() || (await isPwaAlreadyInstalled())) return;
      deferredPwaPrompt = e;
      banner.hidden = false;
    });

    window.addEventListener("appinstalled", () => {
      try {
        localStorage.setItem("bsw_pwa_installed", "1");
      } catch (_e) {}
      deferredPwaPrompt = null;
      banner.hidden = true;
    });

    // På iPhone/iOS Safari (som saknar beforeinstallprompt) visas mobilguiden om appen ej är installerad
    if (isIosSafari) {
      if (descEl) {
        descEl.textContent = "Tryck på Dela-ikonen ⬆️ i Safari och välj 'Lägg till på hemskärmen'!";
      }
      installBtn.textContent = "Så gör du";
      banner.hidden = false;
    }

    installBtn.addEventListener("click", async () => {
      if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        try {
          const choice = await deferredPwaPrompt.userChoice;
          if (choice && choice.outcome === "accepted") {
            localStorage.setItem("bsw_pwa_installed", "1");
            banner.hidden = true;
          }
        } catch (_e) {}
        deferredPwaPrompt = null;
      } else if (isIosSafari && descEl) {
        descEl.innerHTML =
          "<strong>1.</strong> Tryck på <strong>Dela ⬆️</strong> längst ner i Safari · <strong>2.</strong> Välj <strong>Lägg till på hemskärmen</strong>.";
      }
    });

    dismissBtn.addEventListener("click", () => {
      banner.hidden = true;
      try {
        sessionStorage.setItem("bsw_pwa_dismissed", "1");
      } catch (_e) {}
    });
  }

  function initOwnerShortcut() {
    const panelPage = "bw-" + "\x61dmin.html";
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && String(e.key || "").toLowerCase() === "k") {
        e.preventDefault();
        window.location.href = panelPage;
      }
    });
    let tapCount = 0;
    let tapTimer = null;
    const yr = document.getElementById("bsw-year");
    if (yr) {
      yr.addEventListener("click", () => {
        tapCount += 1;
        clearTimeout(tapTimer);
        if (tapCount >= 5) {
          tapCount = 0;
          window.location.href = panelPage;
          return;
        }
        tapTimer = setTimeout(() => {
          tapCount = 0;
        }, 1800);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    initThemeToggle();
    initOwnerShortcut();
    await loadLiveSettingsAndPosts();
    applyBrandingAndContacts();
    renderEveningPasses();
    renderPackages();
    renderB2bSegments();
    renderCityLandingPages();
    renderPosts();
    renderFleet();
    renderMerch();
    initSplitCostCalculator();
    initNewsletterForms();
    initMerchForm();
    initNavigation();
    initGalleryToolbar();
    initCalendarControls();
    initQuoteForm();
    await Promise.all([loadGallery(), loadCalendarData()]);
    await initMobileOnlyPwa();
  });
})();
