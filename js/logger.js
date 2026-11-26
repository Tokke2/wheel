/**
 * ============================================================================
 * BACKSTAGE WHEELS — AVANCERAD FELSÖKNINGSLOGGARE (js/logger.js)
 * ============================================================================
 * Fångar tyst tekniska händelser, JS-fel, nätverksstatus, laddningstider och
 * mediafel i bakgrunden. Ingenting av detta visas någonsin för vanliga
 * besökare – loggen kan ENDAST läsas inne på den lösenordsskyddade adminpanelen.
 */

(function () {
  "use strict";

  const LOCAL_LOG_KEY = "bsw_debug_ringbuffer_v1";
  const MAX_LOCAL_ENTRIES = 200;
  const sessionId = "sess-" + Math.random().toString(36).slice(2, 9);

  function getRingBuffer() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_LOG_KEY) || "[]");
    } catch (_e) {
      return [];
    }
  }

  function pushLocalEntry(entry) {
    try {
      const list = getRingBuffer();
      list.unshift(entry);
      if (list.length > MAX_LOCAL_ENTRIES) list.length = MAX_LOCAL_ENTRIES;
      localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(list));
    } catch (_e) {
      // Ignorera lagringskvot
    }
  }

  function record(level, category, message, details) {
    const entry = {
      id: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
      ts: new Date().toISOString(),
      timeSv: new Date().toLocaleString("sv-SE"),
      level: String(level || "INFO").toUpperCase(),
      category: String(category || "APP").toUpperCase(),
      message: String(message || ""),
      details: details || null,
      url: window.location.hash || "#hem",
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      sessionId
    };

    pushLocalEntry(entry);

    // Skicka tyst till serverloggen om backend finns tillgänglig
    for (const ep of ["/api/admin?action=log_event", "api/admin.php?action=log_event"]) {
      fetch(ep, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "BSW-Admin"
        },
        body: JSON.stringify(entry),
        keepalive: true
      })
        .then((r) => (r.ok ? true : Promise.reject()))
        .catch(() => {});
      break;
    }
  }

  // Fånga obehandlade JavaScript-fel
  window.addEventListener("error", function (event) {
    // Resursladdningsfel (t.ex. saknad bild eller videofil)
    if (event.target && (event.target.tagName === "IMG" || event.target.tagName === "VIDEO")) {
      record("WARN", "MEDIA", `Kunde inte ladda mediafil: ${event.target.currentSrc || event.target.src}`, {
        tag: event.target.tagName,
        src: event.target.getAttribute("src")
      });
      return;
    }

    record("ERROR", "JS_RUNTIME", event.message || "Okänt skriptfel", {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error && event.error.stack ? String(event.error.stack).slice(0, 800) : null
    });
  }, true);

  // Fånga obehandlade Promise-avvisningar
  window.addEventListener("unhandledrejection", function (event) {
    const reason = event.reason;
    record("ERROR", "PROMISE", reason && reason.message ? reason.message : String(reason), {
      stack: reason && reason.stack ? String(reason.stack).slice(0, 800) : null
    });
  });

  // Logga nätverksförändringar (viktigt för mobilappen ute på vägarna)
  window.addEventListener("offline", function () {
    record("WARN", "NETWORK", "Enheten gick offline – växlar till cachat läge i mobilappen");
  });
  window.addEventListener("online", function () {
    record("INFO", "NETWORK", "Nätverksanslutning återställd (online)");
  });

  // Logga sidstart & prestanda när sidan laddat klart
  window.addEventListener("load", function () {
    setTimeout(function () {
      let loadMs = null;
      if (window.performance && performance.getEntriesByType) {
        const nav = performance.getEntriesByType("navigation")[0];
        if (nav) loadMs = Math.round(nav.loadEventEnd - nav.startTime);
      }
      record("INFO", "PERF", "Sidan initierad", {
        loadTimeMs: loadMs,
        userAgent: navigator.userAgent,
        standalonePwa:
          window.matchMedia("(display-mode: standalone)").matches || Boolean(navigator.standalone)
      });
    }, 300);
  });

  window.BackstageLogger = {
    log: record,
    getLocalLogs: getRingBuffer,
    clearLocalLogs: function () {
      try {
        localStorage.removeItem(LOCAL_LOG_KEY);
      } catch (_e) {}
    }
  };
})();
