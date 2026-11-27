/**
 * ============================================================================
 * BACKSTAGE WHEELS — SÄKER SERVER, KRYPTERAT VALV, KALENDER & BILDMAPPAR
 * ============================================================================
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

// QR-generator & mediaoptimering: 100% ren JavaScript/Node (inga externa processer, ingen python)
let npmQr = null;
try {
  npmQr = require("qrcode");
} catch (_e) {
  npmQr = null;
}
let sharpLib = null;
try {
  sharpLib = require("sharp");
  sharpLib.cache(false); // minimalt minnesavtryck (R11)
} catch (_e) {
  sharpLib = null; // reserv: originalfiler skickas oförändrade
}

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const GALLERY_DIR = path.join(ROOT, "bilder", "galleri");
const CACHE_DIR = path.join(GALLERY_DIR, "_cache");
const DATA_DIR = path.join(ROOT, "data");

const SETTINGS_FILE = path.join(DATA_DIR, "site-settings.json");
const AUTH_FILE = path.join(DATA_DIR, "admin-auth.json");
const VAULT_FILE = path.join(DATA_DIR, "social-vault.enc.json");
const VAULT_KEY_FILE = path.join(DATA_DIR, ".vault.key");
const POSTS_FILE = path.join(DATA_DIR, "posts.json");
const MERCH_FILE = path.join(DATA_DIR, "merch.json");
const MERCH_ORDERS_FILE = path.join(DATA_DIR, "merch-orders.json");
const MERCH_INTEREST_FILE = path.join(DATA_DIR, "merch-interest.json");
const PRINT_SVG_DIR = path.join(DATA_DIR, "print-svg");
const PRINT_SVG_META_FILE = path.join(DATA_DIR, "print-svg-meta.json");
const SUBSCRIBERS_FILE = path.join(DATA_DIR, "subscribers.json");
const CAMPAIGNS_FILE = path.join(DATA_DIR, "campaigns.json");
const CALENDAR_FILE = path.join(DATA_DIR, "calendar.json");
const FOLDERS_META_FILE = path.join(DATA_DIR, "gallery-folders.json");
const QUOTES_FILE = path.join(DATA_DIR, "offert-logg.json");
const REVIEWS_FILE = path.join(DATA_DIR, "reviews.json");
const GASTFOTO_META_FILE = path.join(DATA_DIR, "gastfoto-meta.json");
const GASTFOTO_PENDING_DIR = path.join(DATA_DIR, "gastfoto-pending");
const GASTFOTO_RATE_FILE = path.join(DATA_DIR, "gastfoto-rate.json");

const MASTER_ADMIN_EMAIL = "rl@tadega.com";
const PASSWORD_EXPIRY_DAYS = 20;
const PASSWORD_EXPIRY_MS = PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 timmar

// Brute-force-skydd i minnet per IP
const loginRateMap = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minuter

// Cache för inkommande Google Calendar .ics
let gcalCache = { fetchedAt: 0, items: [], lastError: null };

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".ics": "text/calendar; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
  ".ogv": "video/ogg"
};

const IMAGE_EXT_REGEX = /\.(jpe?g|png|webp|gif)$/i;
const VIDEO_EXT_REGEX = /\.(mp4|webm|mov|m4v|ogv)$/i;

function ensureDirs() {
  [
    GALLERY_DIR,
    CACHE_DIR,
    DATA_DIR,
    path.join(ROOT, "bilder", "logo"),
    path.join(ROOT, "bilder", "inlagg"),
    path.join(ROOT, "bilder", "merch")
  ].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function loadJson(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch (_e) {}
  return fallback;
}

function saveJson(file, obj) {
  ensureDirs();
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), "utf8");
}

// ----------------------------------------------------------------------------
// LOGGMOTOR (R10): fellog (aktiva fel) + applog + dagligt arkiv (raderas efter 7 dagar)
// In-memory buffert + debounced flush (R12: undvik rewrite-per-händelse)
// ----------------------------------------------------------------------------
const LOG_DIR = path.join(DATA_DIR, "logs");
const FELLOG_FILE = path.join(LOG_DIR, "fellog.json");
const APPLOG_FILE = path.join(LOG_DIR, "applog.json");
const LOG_ARCHIVE_DIR = path.join(LOG_DIR, "arkiv");
const APPLOG_MAX = 1000;
const FELLOG_MAX = 200;

const logMemory = { fellog: null, applog: null, flushTimer: null };

function logLoadState() {
  if (logMemory.applog === null) logMemory.applog = loadJson(APPLOG_FILE, []);
  if (logMemory.fellog === null) logMemory.fellog = loadJson(FELLOG_FILE, []);
}

function logScheduleFlush() {
  if (logMemory.flushTimer) return;
  logMemory.flushTimer = setTimeout(() => {
    logMemory.flushTimer = null;
    try {
      saveJson(APPLOG_FILE, logMemory.applog || []);
      saveJson(FELLOG_FILE, logMemory.fellog || []);
    } catch (_e) {}
  }, 1500);
}

function logDayKey(ms) {
  return new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" }).replaceAll("-", "-");
}

// Flyttar gårdagens loggposter till arkivfil & raderar arkiv äldre än 7 dagar (R10)
function runLogRetention() {
  try {
    ensureDirs();
    fs.mkdirSync(LOG_ARCHIVE_DIR, { recursive: true });
    logLoadState();
    const now = new Date();
    const yesterdayKey = new Date(now.getTime() - 24 * 3600 * 1000)
      .toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" })
      .replace(/\./g, "-");
    const isYesterday = (timeSv) => String(timeSv || "").startsWith(yesterdayKey.replace(/\./g, "."));

    for (const [key, file] of [["applog", APPLOG_FILE], ["fellog", FELLOG_FILE]]) {
      const list = logMemory[key] || [];
      const old = list.filter((l) => isYesterday(l.timeSv));
      if (!old.length) continue;
      const archiveFile = path.join(LOG_ARCHIVE_DIR, `${yesterdayKey.replace(/\./g, "-")}-${key}.json`);
      const archive = loadJson(archiveFile, []);
      const merged = old.concat(archive);
      if (merged.length > 5000) merged.length = 5000;
      saveJson(archiveFile, merged);
      logMemory[key] = list.filter((l) => !isYesterday(l.timeSv));
      saveJson(file, logMemory[key]);
    }

    // Radera arkivfiler äldre än 7 dagar
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    for (const f of fs.readdirSync(LOG_ARCHIVE_DIR)) {
      const m = /^(\d{4}-\d{2}-\d{2})-/.exec(f);
      if (!m) continue;
      if (Date.parse(m[1] + "T23:59:59") < cutoff) {
        fs.unlinkSync(path.join(LOG_ARCHIVE_DIR, f));
      }
    }
  } catch (_e) {}
}

function writeDebugLog(level, category, message, details = null) {
  try {
    ensureDirs();
    logLoadState();
    const entry = {
      id: crypto.randomBytes(6).toString("hex"),
      ts: new Date().toISOString(),
      timeSv: formatSvDate(Date.now()),
      level: String(level || "INFO").toUpperCase(),
      category: String(category || "SYSTEM").toUpperCase(),
      message: String(message || "").slice(0, 500),
      details: details || null
    };
    (logMemory.applog || (logMemory.applog = [])).unshift(entry);
    if (logMemory.applog.length > APPLOG_MAX) logMemory.applog.length = APPLOG_MAX;

    // FELLOG: alla aktiva fel (ERROR/SECURITY) — dedupe på kategori+meddelande, räknare
    const lvl = entry.level;
    if (lvl === "ERROR" || lvl === "SECURITY") {
      const felKey = crypto.createHash("md5").update(`${lvl}|${entry.category}|${entry.message}`).digest("hex").slice(0, 12);
      const fellog = logMemory.fellog || (logMemory.fellog = []);
      const existing = fellog.find((f) => f.key === felKey);
      if (existing) {
        existing.count += 1;
        existing.lastSeenTs = entry.ts;
        existing.lastSeenTimeSv = entry.timeSv;
      } else {
        fellog.unshift({
          key: felKey,
          id: entry.id,
          level: lvl,
          category: entry.category,
          message: entry.message,
          details: entry.details,
          count: 1,
          firstSeenTs: entry.ts,
          firstSeenTimeSv: entry.timeSv,
          lastSeenTs: entry.ts,
          lastSeenTimeSv: entry.timeSv
        });
        if (fellog.length > FELLOG_MAX) fellog.length = FELLOG_MAX;
      }
    }
    logScheduleFlush();
  } catch (_e) {}
}

// Adminåtgärd: fel markeras åtgärdat → tas bort ur felloggen (R10), händelsen loggas i apploggen
function resolveErrorByKey(key) {
  logLoadState();
  const fellog = logMemory.fellog || [];
  const idx = fellog.findIndex((f) => f.key === key);
  if (idx < 0) return false;
  const f = fellog[idx];
  fellog.splice(idx, 1);
  (logMemory.applog || (logMemory.applog = [])).unshift({
    id: crypto.randomBytes(6).toString("hex"),
    ts: new Date().toISOString(),
    timeSv: formatSvDate(Date.now()),
    level: "INFO",
    category: "ERROR_RESOLVED",
    message: `Fel markerat åtgärdat: [${f.category}] ${f.message} (${f.count} förekomster)`,
    details: null
  });
  if (logMemory.applog.length > APPLOG_MAX) logMemory.applog.length = APPLOG_MAX;
  logScheduleFlush();
  return true;
}

function formatSvDate(ms) {
  return new Date(ms).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" });
}


// ----------------------------------------------------------------------------
// AES-256-GCM KRYPTERAT VALV FÖR SOCIALA MEDIER & GOOGLE KALENDER
// ----------------------------------------------------------------------------
function getOrCreateVaultKey() {
  ensureDirs();
  if (fs.existsSync(VAULT_KEY_FILE)) {
    const hex = fs.readFileSync(VAULT_KEY_FILE, "utf8").trim();
    if (hex.length === 64) return Buffer.from(hex, "hex");
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(VAULT_KEY_FILE, key.toString("hex"), { mode: 0o600 });
  return key;
}

function readEncryptedVault() {
  const defaults = {
    autoPostEveryEntry: true,
    instagramEnabled: true,
    instagramAccountId: "",
    instagramAccessToken: "",
    facebookEnabled: true,
    facebookPageId: "",
    facebookPageToken: "",
    webhookEnabled: true,
    webhookUrl: "",
    webhookSecret: "",
    defaultHashtags: "#backstagewheels #hyralimousine #hummerlimo #hardrock",
    googleCalendarIcsUrl: "",
    outboundIcsKey: crypto.randomBytes(12).toString("hex")
  };

  if (!fs.existsSync(VAULT_FILE)) return defaults;
  try {
    const raw = JSON.parse(fs.readFileSync(VAULT_FILE, "utf8"));
    const key = getOrCreateVaultKey();
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(raw.iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(raw.tag, "hex"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(raw.ciphertext, "hex")),
      decipher.final()
    ]);
    return Object.assign({}, defaults, JSON.parse(dec.toString("utf8")));
  } catch (_e) {
    return defaults;
  }
}

function saveEncryptedVault(vaultObj) {
  const key = getOrCreateVaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(vaultObj), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  saveJson(VAULT_FILE, {
    alg: "AES-256-GCM",
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    ciphertext: encrypted.toString("hex"),
    updatedAt: formatSvDate(Date.now())
  });
}

function maskSecret(val) {
  const s = String(val || "").trim();
  if (!s) return "";
  if (s.length <= 6) return "••••••";
  return "••••••••••••" + s.slice(-4);
}

function getMaskedVaultStatus() {
  const v = readEncryptedVault();
  let webhookHost = "";
  try {
    if (v.webhookUrl) webhookHost = new URL(v.webhookUrl).host;
  } catch (_e) {}

  return {
    encryption: "AES-256-GCM",
    autoPostEveryEntry: v.autoPostEveryEntry !== false,
    instagramEnabled: v.instagramEnabled !== false,
    instagramAccountId: v.instagramAccountId || "",
    instagramTokenMasked: maskSecret(v.instagramAccessToken),
    instagramConnected: Boolean(v.instagramAccountId && v.instagramAccessToken),
    facebookEnabled: v.facebookEnabled !== false,
    facebookPageId: v.facebookPageId || "",
    facebookTokenMasked: maskSecret(v.facebookPageToken),
    facebookConnected: Boolean(v.facebookPageId && v.facebookPageToken),
    webhookEnabled: v.webhookEnabled !== false,
    webhookHost,
    webhookUrlMasked: v.webhookUrl ? `https://${webhookHost}/••••` : "",
    webhookSecretMasked: maskSecret(v.webhookSecret),
    webhookConnected: Boolean(v.webhookUrl),
    defaultHashtags: v.defaultHashtags || "#backstagewheels #hyralimousine",
    googleCalendarConnected: Boolean(v.googleCalendarIcsUrl),
    googleCalendarMasked: v.googleCalendarIcsUrl ? "Google iCal (.ics) ansluten ✓" : "",
    googleCalendarLastSync: gcalCache.fetchedAt ? formatSvDate(gcalCache.fetchedAt) : null,
    googleCalendarError: gcalCache.lastError || null,
    outboundIcsPath: `/api/calendar.ics`
  };
}

// ----------------------------------------------------------------------------
// BRUTE-FORCE-SKYDD & SÄKER AUTENTISERING
// ----------------------------------------------------------------------------
function getClientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xff || req.socket.remoteAddress || "unknown";
}

function checkRateLimit(ip) {
  const now = Date.now();
  const rec = loginRateMap.get(ip);
  if (!rec) return { blocked: false };
  if (now - rec.firstAt > LOCKOUT_WINDOW_MS) {
    loginRateMap.delete(ip);
    return { blocked: false };
  }
  if (rec.count >= MAX_FAILED_ATTEMPTS) {
    const minsLeft = Math.max(1, Math.ceil((LOCKOUT_WINDOW_MS - (now - rec.firstAt)) / 60000));
    return { blocked: true, minsLeft };
  }
  return { blocked: false };
}

function recordFailedAttempt(ip, reason) {
  const now = Date.now();
  const rec = loginRateMap.get(ip) || { count: 0, firstAt: now };
  if (now - rec.firstAt > LOCKOUT_WINDOW_MS) {
    rec.count = 1;
    rec.firstAt = now;
  } else {
    rec.count += 1;
  }
  loginRateMap.set(ip, rec);
  writeDebugLog("SECURITY", "BRUTEFORCE_GUARD", `Misslyckat inloggningsförsök (${rec.count}/${MAX_FAILED_ATTEMPTS})`, {
    ip,
    reason
  });
}

function clearFailedAttempts(ip) {
  loginRateMap.delete(ip);
}

function hashPassword(plain, saltHex) {
  const salt = saltHex || crypto.randomBytes(16).toString("hex");
  const derived = crypto.pbkdf2Sync(plain, salt, 120000, 32, "sha256").toString("hex");
  return { salt, hash: derived };
}

function timingSafeHexEqual(a, b) {
  const ba = Buffer.from(String(a || ""), "utf8");
  const bb = Buffer.from(String(b || ""), "utf8");
  if (ba.length !== bb.length || ba.length === 0) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function verifyPassword(plain, authObj) {
  if (!authObj || !authObj.hash || !authObj.salt) return false;
  const check = hashPassword(plain, authObj.salt);
  return timingSafeHexEqual(check.hash, authObj.hash);
}

function getPasswordStatus(authObj) {
  if (!authObj || !authObj.hash || !authObj.passwordChangedAt) {
    return { initialized: false, expired: false, daysLeft: PASSWORD_EXPIRY_DAYS };
  }
  const now = Date.now();
  const elapsed = Math.max(0, now - authObj.passwordChangedAt);
  const expired = elapsed >= PASSWORD_EXPIRY_MS;
  const daysLeft = expired ? 0 : Math.ceil((PASSWORD_EXPIRY_MS - elapsed) / (24 * 60 * 60 * 1000));
  return {
    initialized: true,
    expired,
    daysLeft,
    changedAtIso: formatSvDate(authObj.passwordChangedAt),
    expiresAtIso: formatSvDate(authObj.passwordChangedAt + PASSWORD_EXPIRY_MS)
  };
}

function isTokenAuthenticated(req, tokenFromBody) {
  const auth = loadJson(AUTH_FILE, null);
  const headerToken = req.headers["x-admin-token"];
  const candidate = String(headerToken || tokenFromBody || "").trim();
  if (!auth || !auth.sessionToken || !candidate) return false;
  if (!timingSafeHexEqual(candidate, auth.sessionToken)) return false;
  if (auth.sessionIssuedAt && Date.now() - auth.sessionIssuedAt > SESSION_TTL_MS) return false;
  const st = getPasswordStatus(auth);
  return st.initialized && !st.expired;
}

function verifySameOrigin(req) {
  // Tillåt om anpassad admin-header skickats (skyddar mot cross-site HTML form CSRF)
  if (req.headers["x-requested-with"] === "BSW-Admin") return true;
  const origin = req.headers["origin"];
  // Saknad Origin eller "null" (t.ex. i sandboxad förhandsgransknings-iframe)
  if (!origin || origin === "null") return true;
  const rawHost = String(req.headers["x-forwarded-host"] || req.headers["host"] || "")
    .split(",")[0]
    .trim();
  const host = String(req.headers["host"] || "").trim();
  try {
    const oHost = new URL(origin).host;
    return oHost === rawHost || oHost === host;
  } catch (_e) {
    return false;
  }
}

// ----------------------------------------------------------------------------
// BILDOPTIMERING & VIDEOPOSTER
// ----------------------------------------------------------------------------
async function optimizeUploadedMediaInPlace(savedPath) {
  const ext = path.extname(savedPath).toLowerCase();
  const statBefore = fs.existsSync(savedPath) ? fs.statSync(savedPath).size : 0;

  if (VIDEO_EXT_REGEX.test(ext)) {
    // Video: inga externa verktyg behövs — webbläsaren visar första bildrutan själv
    return {
      finalPath: savedPath,
      posterPath: null,
      beforeKb: Math.round(statBefore / 1024),
      afterKb: Math.round(statBefore / 1024),
      savedPercent: 0,
      type: "video"
    };
  }

  if (!IMAGE_EXT_REGEX.test(ext) || ext === ".gif") {
    return {
      finalPath: savedPath,
      beforeKb: Math.round(statBefore / 1024),
      afterKb: Math.round(statBefore / 1024),
      savedPercent: 0,
      type: "image"
    };
  }

  const webpTarget = savedPath.replace(/\.[^.]+$/, ".webp");
  try {
    if (!sharpLib) throw new Error("sharp saknas");
    const info = await sharpLib(savedPath)
      .rotate() // EXIF-autoorientering
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86, effort: 4 })
      .toFile(webpTarget);
    if (path.resolve(webpTarget) !== path.resolve(savedPath) && fs.existsSync(savedPath)) {
      fs.unlinkSync(savedPath); // originalet raderas först när omkodningen lyckats
    }
    const statAfter = fs.existsSync(webpTarget) ? fs.statSync(webpTarget).size : statBefore;
    const savedPct = statBefore > 0 ? Math.max(0, Math.round((1 - statAfter / statBefore) * 100)) : 0;
    return {
      finalPath: webpTarget,
      dims: `${info.width || 0}x${info.height || 0}`,
      beforeKb: Math.max(1, Math.round(statBefore / 1024)),
      afterKb: Math.max(1, Math.round(statAfter / 1024)),
      savedPercent: savedPct,
      type: "image"
    };
  } catch (err) {
    writeDebugLog("WARN", "OPTIMIZER", `Kunde inte omkoda ${path.basename(savedPath)} — originalet behålls`, { error: String((err && err.message) || err).slice(0, 200) });
    return {
      finalPath: savedPath,
      beforeKb: Math.round(statBefore / 1024),
      afterKb: Math.round(statBefore / 1024),
      savedPercent: 0,
      type: "image"
    };
  }
}

// ----------------------------------------------------------------------------
// MAPPBASERAT GALLERI (UNDERKATALOGER PER EVENEMANG + ROTMAPP)
// ----------------------------------------------------------------------------
function sanitizeSlug(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function prettifyName(raw) {
  return String(raw || "")
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[-_\s]+/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function buildGalleryAndFoldersCache() {
  ensureDirs();
  const folderMetaList = loadJson(FOLDERS_META_FILE, []);
  const folderMetaMap = new Map(folderMetaList.map((f) => [f.slug, f]));

  // Upptäck alla undermappar i bilder/galleri/ (inklusive FTP-uppladdade mappar!)
  const diskEntries = fs.readdirSync(GALLERY_DIR, { withFileTypes: true });
  const subDirs = diskEntries
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "_cache")
    .map((d) => d.name);

  // Behåll ordningen från gallery-folders.json först, lägg sedan till nya FTP-mappar
  const orderedSlugs = [
    ...folderMetaList.map((f) => f.slug).filter((s) => subDirs.includes(s)),
    ...subDirs.filter((s) => !folderMetaMap.has(s))
  ];

  const allFileTasks = [];

  // 1. Filer i varje evenemangsmapp
  orderedSlugs.forEach((slug) => {
    const dirPath = path.join(GALLERY_DIR, slug);
    const fMeta = folderMetaMap.get(slug) || {
      slug,
      name: prettifyName(slug),
      date: "",
      description: ""
    };
    fs.readdirSync(dirPath)
      .filter((f) => !f.startsWith(".") && !f.endsWith("-poster.webp") && (IMAGE_EXT_REGEX.test(f) || VIDEO_EXT_REGEX.test(f)))
      .sort()
      .forEach((f) => {
        allFileTasks.push({
          absPath: path.join(dirPath, f),
          relPath: `bilder/galleri/${slug}/${f}`,
          filename: f,
          folderSlug: slug,
          folderName: fMeta.name || prettifyName(slug)
        });
      });
  });

  // 2. Eventuella filer direkt i bilder/galleri/ (utan undermapp)
  diskEntries
    .filter((d) => d.isFile() && !d.name.startsWith(".") && !d.name.endsWith("-poster.webp") && (IMAGE_EXT_REGEX.test(d.name) || VIDEO_EXT_REGEX.test(d.name)))
    .map((d) => d.name)
    .sort()
    .forEach((f) => {
      allFileTasks.push({
        absPath: path.join(GALLERY_DIR, f),
        relPath: `bilder/galleri/${f}`,
        filename: f,
        folderSlug: "ovrigt",
        folderName: "Övriga bilder & klipp"
      });
    });

  const items = [];
  let totalOrig = 0;
  let totalOpt = 0;
  if (!sharpLib) {
    writeDebugLog("WARN", "GALLERY_SCAN", "sharp (JS-bildoptimering) saknas — galleriet skannas med originalfiler");
  }
  for (const t of allFileTasks) {
    const srcPath = t.absPath;
    if (!fs.existsSync(srcPath)) continue;
    let origBytes = 0;
    try {
      origBytes = fs.statSync(srcPath).size;
    } catch (_e) {}
    const ext = path.extname(t.filename).toLowerCase();
    const uid = crypto.createHash("md5").update(t.relPath).digest("hex").slice(0, 10);

    if (VIDEO_EXT_REGEX.test(ext)) {
      // Video: webbläsaren renderar klippet direkt (ingen ffmpeg/python behövs)
      items.push({
        filename: t.filename,
        src: t.relPath,
        full: t.relPath,
        thumb: t.relPath,
        type: "video",
        folderSlug: t.folderSlug,
        folderName: t.folderName,
        sizeKb: Math.round(origBytes / 1024)
      });
      continue;
    }

    const thumbPath = path.join(CACHE_DIR, `thumb_${uid}.webp`);
    const fullPath = path.join(CACHE_DIR, `full_${uid}.webp`);
    let srcMtime = 0;
    try {
      srcMtime = fs.statSync(srcPath).mtimeMs;
    } catch (_e) {}
    let needFull = true;
    let needThumb = true;
    try {
      needFull = !fs.existsSync(fullPath) || fs.statSync(fullPath).mtimeMs < srcMtime;
      needThumb = !fs.existsSync(thumbPath) || fs.statSync(thumbPath).mtimeMs < srcMtime;
    } catch (_e) {}

    try {
      if (!sharpLib) throw new Error("sharp saknas");
      if (needFull) {
        await sharpLib(srcPath).rotate().resize(1920, 1920, { fit: "inside", withoutEnlargement: true }).webp({ quality: 86, effort: 4 }).toFile(fullPath);
      }
      if (needThumb) {
        await sharpLib(srcPath).rotate().resize(680, 680, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toFile(thumbPath);
      }
      const meta = await sharpLib(fullPath).metadata();
      const optBytes = fs.statSync(fullPath).size;
      totalOrig += origBytes;
      totalOpt += optBytes;
      items.push({
        filename: t.filename,
        src: t.relPath,
        full: `bilder/galleri/_cache/full_${uid}.webp`,
        thumb: `bilder/galleri/_cache/thumb_${uid}.webp`,
        type: "image",
        folderSlug: t.folderSlug,
        folderName: t.folderName,
        width: meta.width || 0,
        height: meta.height || 0,
        sizeKb: Math.round(optBytes / 1024)
      });
    } catch (_e) {
      // Per-fil-reserv: skicka originalet (full kvalitet, webbläsaren skalar)
      items.push({
        filename: t.filename,
        src: t.relPath,
        full: t.relPath,
        thumb: t.relPath,
        type: "image",
        folderSlug: t.folderSlug,
        folderName: t.folderName,
        sizeKb: Math.round(origBytes / 1024)
      });
    }
  }

  const savedPercent = totalOrig > 0 && totalOpt < totalOrig ? Math.round((1 - totalOpt / totalOrig) * 100) : 0;

  // Bygg sammanställning av mappar med omslagsbild & antal objekt
  const foldersSummary = orderedSlugs.map((slug) => {
    const meta = folderMetaMap.get(slug) || { slug, name: prettifyName(slug), date: "", description: "" };
    const inFolder = items.filter((i) => i.folderSlug === slug);
    return {
      slug,
      name: meta.name || prettifyName(slug),
      date: meta.date || "",
      description: meta.description || "",
      count: inFolder.length,
      coverThumb: (inFolder[0] && inFolder[0].thumb) || "bilder/bilar/hummer-legends-sida.jpg"
    };
  });

  const rootItems = items.filter((i) => i.folderSlug === "ovrigt");
  if (rootItems.length) {
    foldersSummary.push({
      slug: "ovrigt",
      name: "Övriga bilder & klipp",
      date: "",
      description: "Uppladdade filer i huvudmappen.",
      count: rootItems.length,
      coverThumb: rootItems[0].thumb
    });
  }

  return { items, folders: foldersSummary, savedPercent };
}

// ----------------------------------------------------------------------------
// QR-KOD GENERATOR
// ----------------------------------------------------------------------------
async function regenerateInstagramQr(igUrl) {
  if (!igUrl || !npmQr || typeof npmQr.toFile !== "function") return false;
  const qrPath = path.join(ROOT, "bilder", "qr-instagram.png");
  try {
    await npmQr.toFile(qrPath, String(igUrl), {
      errorCorrectionLevel: "H",
      margin: 2,
      scale: 12,
      color: { dark: "#f97316", light: "#0e0f14" }
    });
    return fs.existsSync(qrPath);
  } catch (_e) {
    return false;
  }
}

// Genererar en QR-PNG på godtycklig URL (100% JavaScript via npm-paketet qrcode).
async function generateQrPng(targetUrl, outPath) {
  if (!targetUrl || !outPath) return false;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  // 1) npm-paketet "qrcode" (ingen extern process, fungerar överallt)
  if (npmQr && typeof npmQr.toFile === "function") {
    try {
      await npmQr.toFile(outPath, String(targetUrl), {
        errorCorrectionLevel: "H",
        margin: 2,
        scale: 12,
        color: { dark: "#0b0c10", light: "#ffffff" }
      });
      return fs.existsSync(outPath);
    } catch (_e) {}
  }
  return false;
}

// ----------------------------------------------------------------------------
// PÅMINNELSEFÖNSTER (BW BOT) — BW Bot i panelen är enda aviseringskanalen
// (SMS/Telegram-tjänster är borttagna: kostnadsfritt & utan externa beroenden)
// ----------------------------------------------------------------------------
function reminderConfig() {
  const cfg = loadJson(SETTINGS_FILE, {});
  const legacy = cfg.smsSettings || {};
  const r = cfg.reminderSettings || {};
  return { hoursBefore: Number(r.hoursBefore ?? legacy.hoursBefore ?? 24) };
}

// ----------------------------------------------------------------------------
// FLERSPRÅKIG OFFERTMEJL (#10) + AUTOMATISK UPPFÖLJNING (#4) + MALLREDAKTÖR (#9)
// ----------------------------------------------------------------------------
function quoteEmailTemplates(lang, name, custom) {
  const lang_ = ["sv", "en", "de"].includes(String(lang)) ? String(lang) : "sv";
  const c = custom || {};
  const pick = (key, fallback) => {
    const v = String(c[key] || "").trim();
    return v ? v.replace(/\{\{namn\}\}/g, name ? " " + name : "") : fallback;
  };
  const T = {
    sv: {
      confirmSubject: pick("confirmSubjectSv", "Vi har tagit emot din offertförfrågan – Backstage Wheels"),
      followSubject: pick("followSubjectSv", "Har du frågor kring din offertförfrågan? – Backstage Wheels"),
      confirm: pick("confirmSv", `Hej${name ? " " + name : ""}!\n\nTack för din offertförfrågan till Backstage Wheels! Vi har den nu och återkommer med prisförslag så snabbt vi kan (normalt inom 24 timmar).\n\nVill du ändra något? Svara bara på det här mejlet eller ring oss.\n\nRock on!\nBackstage Wheels · 10 m Hummer H2 "Legends of Rock"\nbackstagewheels.se`),
      follow: pick("followSv", `Hej${name ? " " + name : ""}!\n\nVi skickade en offertbekräftelse till dig för några dagar sedan men har inte hört från dig ännu.\n\nÄr datumet fortfarande aktuellt? Vill du justera upplägget eller har du frågor om pris? Svara på det här mejlet – vi anpassar gärna offerten efter dina önskemål.\n\nBackstage Wheels · backstagewheels.se`)
    },
    en: {
      confirmSubject: pick("confirmSubjectEn", "We have received your quote request – Backstage Wheels"),
      followSubject: pick("followSubjectEn", "Any questions about your quote request? – Backstage Wheels"),
      confirm: pick("confirmEn", `Hi${name ? " " + name : ""}!\n\nThank you for your quote request to Backstage Wheels! We have it now and will get back to you with a price proposal as soon as we can (normally within 24 hours).\n\nWant to change anything? Just reply to this email or give us a call.\n\nRock on!\nBackstage Wheels · 10 m Hummer H2 "Legends of Rock"\nbackstagewheels.se`),
      follow: pick("followEn", `Hi${name ? " " + name : ""}!\n\nWe sent you a quote confirmation a few days ago but haven't heard back from you yet.\n\nIs your date still available? Would you like to adjust the setup or do you have questions about pricing? Just reply to this email – we're happy to tailor the offer.\n\nBackstage Wheels · backstagewheels.se`)
    },
    de: {
      confirmSubject: pick("confirmSubjectDe", "Wir haben Ihre Angebotsanfrage erhalten – Backstage Wheels"),
      followSubject: pick("followSubjectDe", "Fragen zu Ihrer Angebotsanfrage? – Backstage Wheels"),
      confirm: pick("confirmDe", `Hallo${name ? " " + name : ""}!\n\nDanke für Ihre Angebotsanfrage an Backstage Wheels! Wir haben sie erhalten und melden uns so schnell wie möglich mit einem Preisvorschlag (normalerweise innerhalb von 24 Stunden).\n\nMöchten Sie etwas ändern? Antworten Sie einfach auf diese E-Mail oder rufen Sie uns an.\n\nRock on!\nBackstage Wheels · 10 m Hummer H2 "Legends of Rock"\nbackstagewheels.se`),
      follow: pick("followDe", `Hallo${name ? " " + name : ""}!\n\nWir haben vor einigen Tagen eine Angebotsbestätigung an Sie gesendet, aber noch nichts von Ihnen gehört.\n\nIst Ihr Datum weiterhin aktuell? Möchten Sie das Setup anpassen oder haben Sie Fragen zum Preis? Antworten Sie einfach auf diese E-Mail – wir passen das Angebot gerne an.\n\nBackstage Wheels · backstagewheels.se`)
    }
  };
  return T[lang_];
}

function quoteDateMs(q) {
  const t = Date.parse(String(q.receivedAtIso || "").replace(" ", "T"));
  if (Number.isFinite(t)) return t;
  const t2 = Date.parse(String(q.receivedAt || "").replace(" ", "T"));
  return Number.isFinite(t2) ? t2 : NaN;
}

function sendQuoteConfirmation(q) {
  const cfg = loadJson(SETTINGS_FILE, {});
  const fromEmail = String(cfg.contactEmail || "bokning@backstagewheels.se").trim();
  const to = String(q.epost || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) return false;
  const t = quoteEmailTemplates(q.sprak, String(q.namn || "").trim(), cfg.emailTemplates);
  const body = `<div style="font-family:Arial,sans-serif;background:#090a0f;color:#f8fafc;padding:24px;">
    <div style="max-width:600px;margin:0 auto;background:#141722;border:1px solid #2e3448;border-radius:10px;padding:24px;line-height:1.7;white-space:pre-line;font-size:15px;">${escapeHtmlServer(t.confirm)}</div>
  </div>`;
  return Boolean(sendSingleEmail(to, t.confirmSubject, body, fromEmail));
}

function sendQuoteFollowUp(q) {
  const cfg = loadJson(SETTINGS_FILE, {});
  const fromEmail = String(cfg.contactEmail || "bokning@backstagewheels.se").trim();
  const to = String(q.epost || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) return false;
  const t = quoteEmailTemplates(q.sprak, String(q.namn || "").trim(), cfg.emailTemplates);
  const body = `<div style="font-family:Arial,sans-serif;background:#090a0f;color:#f8fafc;padding:24px;">
    <div style="max-width:600px;margin:0 auto;background:#141722;border:1px solid #2e3448;border-radius:10px;padding:24px;line-height:1.7;white-space:pre-line;font-size:15px;">${escapeHtmlServer(t.follow)}</div>
  </div>`;
  return Boolean(sendSingleEmail(to, t.followSubject, body, fromEmail));
}

// Följer automatiskt upp offerter som ligger utan svar i 3 dagar (max 1 uppföljning/offert)
const FOLLOW_UP_AFTER_MS = 3 * 24 * 3600 * 1000;
let followUpTimer = null;
function startFollowUpLoop() {
  if (followUpTimer) clearInterval(followUpTimer);
  const runCheck = () => {
    try {
      const quotes = loadJson(QUOTES_FILE, []);
      if (!Array.isArray(quotes) || !quotes.length) return;
      const now = Date.now();
      let changed = false;
      for (const q of quotes) {
        if (!q || q.followUpSentAt) continue;
        const t = quoteDateMs(q);
        if (!Number.isFinite(t) || now - t < FOLLOW_UP_AFTER_MS) continue;
        if (sendQuoteFollowUp(q)) {
          q.followUpSentAt = new Date().toISOString();
          changed = true;
          writeDebugLog("INFO", "QUOTE_FOLLOWUP", `Automatisk offertuppföljning mejlad till ${q.epost}`);
        }
      }
      if (changed) saveJson(QUOTES_FILE, quotes);
    } catch (e) {
      writeDebugLog("ERROR", "QUOTE_FOLLOWUP", `Uppföljningsloopfel: ${e.message}`);
    }
  };
  followUpTimer = setInterval(runCheck, 6 * 3600 * 1000);
  setTimeout(runCheck, 45000);
}

// Beräknar bokningar inom påminnelsefönstret (används av BW Bot-feeden)
function getDueReminders(nowMs) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const windowMs = Math.max(1, reminderConfig().hoursBefore) * 3600 * 1000;
  const items = loadJson(CALENDAR_FILE, []);
  const out = [];
  for (const it of Array.isArray(items) ? items : []) {
    if (!it || !it.date) continue;
    const slotTime = String(it.timeSlot || "").match(/(\d{1,2}:\d{2})/);
    const startMs = Date.parse(`${it.date}T${slotTime ? slotTime[1] : "20:00"}:00`);
    if (!Number.isFinite(startMs)) continue;
    const untilStart = startMs - now;
    if (untilStart <= 0 || untilStart > windowMs) continue;
    const key = `rem-${it.id || `${it.date}_${slotTime ? slotTime[1] : ""}_${String(it.publicTitle || it.adminTitle || "").slice(0, 40)}`}`;
    out.push({
      key,
      date: it.date,
      time: slotTime ? slotTime[1] : "20:00",
      title: String(it.publicTitle || it.adminTitle || "Bokning").slice(0, 80),
      minutesUntil: Math.max(0, Math.round(untilStart / 60000))
    });
  }
  out.sort((a, b) => a.minutesUntil - b.minutesUntil);
  return out;
}

// ----------------------------------------------------------------------------
// GÄSTFOTO VIA QR (#21) — modererad uppladdning
// ----------------------------------------------------------------------------
const GUEST_IMG_MAGIC = [
  { type: "jpg", bytes: [0xff, 0xd8, 0xff] },
  { type: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: "webp", bytes: null } // valideras via RIFF-huvud nedan
];
const GASTFOTO_MAX_BYTES = 8 * 1024 * 1024;
const GASTFOTO_DAILY_LIMIT = 6;

function detectGuestImageType(buf) {
  if (!buf || buf.length < 16) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

function guestRateKeyIp(req) {
  const ip = getClientIp(req) || "okänd";
  const day = new Date().toISOString().slice(0, 10);
  return `${day}_${ip}`;
}

function guestUploadAllowed(req) {
  const key = guestRateKeyIp(req);
  const rates = loadJson(GASTFOTO_RATE_FILE, {});
  if (!rates[key]) return true;
  if (rates[key].day !== new Date().toISOString().slice(0, 10)) return true;
  return rates[key].count < GASTFOTO_DAILY_LIMIT;
}

function guestUploadCount(req) {
  const rates = loadJson(GASTFOTO_RATE_FILE, {});
  const key = guestRateKeyIp(req);
  const entry = rates[key];
  if (!entry || entry.day !== new Date().toISOString().slice(0, 10)) return 0;
  return entry.count || 0;
}

function guestUploadTick(req) {
  const key = guestRateKeyIp(req);
  const day = new Date().toISOString().slice(0, 10);
  const rates = loadJson(GASTFOTO_RATE_FILE, {});
  const entry = rates[key] && rates[key].day === day ? rates[key] : { day, count: 0 };
  entry.count += 1;
  rates[key] = entry;
  // Städa bort gamla dagar (minneshantering)
  for (const k of Object.keys(rates)) {
    if (rates[k].day !== day) delete rates[k];
  }
  saveJson(GASTFOTO_RATE_FILE, rates);
}

function decodeDataUrlImage(dataUrl) {
  const m = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ""));
  if (!m) return null;
  try {
    return Buffer.from(m[2].replace(/\s+/g, ""), "base64");
  } catch (_e) {
    return null;
  }
}

function guestMetaList() {
  return loadJson(GASTFOTO_META_FILE, []);
}

function approvedGuestPhotos() {
  const meta = guestMetaList().filter((m) => m.status === "approved");
  const outDir = path.join(ROOT, "bilder", "galleri", "gastfoton");
  const files = new Set();
  try {
    if (fs.existsSync(outDir)) fs.readdirSync(outDir).forEach((f) => files.add(f));
  } catch (_e) {}
  return meta.filter((m) => files.has(m.filename));
}


// ----------------------------------------------------------------------------
// GOOGLE CALENDAR (.ICS) PARSER & UTGÅENDE .ICS FEED
// ----------------------------------------------------------------------------
function fetchUrlText(targetUrl) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(targetUrl);
      const lib = u.protocol === "https:" ? https : http;
      const req = lib.get(targetUrl, { timeout: 8000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrlText(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      });
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Timeout"));
      });
    } catch (err) {
      reject(err);
    }
  });
}

function parseIcsEvents(icsText) {
  const unfolded = String(icsText || "").replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1);
  const parsed = [];

  blocks.forEach((blk, idx) => {
    const body = blk.split("END:VEVENT")[0] || "";
    const lines = body.split(/\r?\n/);
    let dtStart = "";
    let dtEnd = "";
    let summary = "";
    let location = "";
    let uid = `gcal-${idx}`;

    lines.forEach((line) => {
      const colon = line.indexOf(":");
      if (colon === -1) return;
      const keyPart = line.slice(0, colon).toUpperCase();
      const val = line.slice(colon + 1).trim();
      if (keyPart.startsWith("DTSTART")) dtStart = val;
      else if (keyPart.startsWith("DTEND")) dtEnd = val;
      else if (keyPart.startsWith("SUMMARY")) summary = val.replace(/\\,/g, ",").replace(/\\n/g, " ");
      else if (keyPart.startsWith("LOCATION")) location = val.replace(/\\,/g, ",");
      else if (keyPart === "UID") uid = val;
    });

    const parseIcsDate = (raw) => {
      const m = String(raw || "").match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
      if (!m) return null;
      return {
        date: `${m[1]}-${m[2]}-${m[3]}`,
        time: m[4] && m[5] ? `${m[4]}:${m[5]}` : null
      };
    };

    const s = parseIcsDate(dtStart);
    if (!s) return;
    const e = parseIcsDate(dtEnd) || s;

    const lowerSum = summary.toLowerCase();
    const isPublicEvent = /(event|festival|träff|elmia|vallåkra|sweden rock|cruising|mässa|öppet)/i.test(summary);
    const isPartial = /(delvis|pass|kväll ledig|dag ledig)/i.test(lowerSum);

    const timeSlot = s.time
      ? `${s.time}${e.time ? "–" + e.time : ""} (Google Kalender)`
      : "Bokad i Google Kalender";

    parsed.push({
      id: "gcal-" + crypto.createHash("md5").update(uid + dtStart).digest("hex").slice(0, 10),
      source: "google_calendar",
      date: s.date,
      endDate: e.date,
      kind: isPublicEvent ? "event" : "booking",
      availability: isPartial ? "partial" : "booked",
      timeSlot,
      publicTitle: isPublicEvent ? summary : "Upptagen / Bokad körning",
      adminTitle: summary || "Google Kalender-bokning",
      location: location || ""
    });
  });

  return parsed;
}

async function getGoogleCalendarItems(forceRefresh = false) {
  const vault = readEncryptedVault();
  const url = String(vault.googleCalendarIcsUrl || "").trim();
  if (!url) return [];

  const now = Date.now();
  if (!forceRefresh && gcalCache.fetchedAt && now - gcalCache.fetchedAt < 5 * 60 * 1000) {
    return gcalCache.items;
  }

  try {
    const rawIcs = await fetchUrlText(url);
    const items = parseIcsEvents(rawIcs);
    gcalCache = { fetchedAt: now, items, lastError: null };
    writeDebugLog("INFO", "GOOGLE_CALENDAR", `Synkade ${items.length} poster från Google Kalender`);
    return items;
  } catch (err) {
    gcalCache.lastError = err.message;
    writeDebugLog("WARN", "GOOGLE_CALENDAR", `Kunde inte nå Google Kalender iCal: ${err.message}`);
    return gcalCache.items || [];
  }
}

function generateOutboundIcs(items) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Backstage Wheels//Boknings- och Eventkalender//SV",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Backstage Wheels – Körningar & Evenemang",
    "X-WR-TIMEZONE:Europe/Stockholm"
  ];

  const dtStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  items.forEach((ev) => {
    if (!ev.date) return;
    const dStart = String(ev.date).replace(/-/g, "");
    const endRaw = ev.endDate || ev.date;
    // För heldag i iCal är DTEND exklusivt (+1 dag)
    const endObj = new Date(endRaw + "T12:00:00Z");
    endObj.setUTCDate(endObj.getUTCDate() + 1);
    const dEnd = endObj.toISOString().slice(0, 10).replace(/-/g, "");

    const summary = String(ev.publicTitle || "Backstage Wheels").replace(/[\r\n,]/g, " ");
    const desc = String(ev.description || ev.timeSlot || "").replace(/[\r\n]/g, "\\n");
    const loc = String(ev.location || "Sverige").replace(/[\r\n,]/g, " ");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.id || dStart}@backstagewheels.se`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dStart}`);
    lines.push(`DTEND;VALUE=DATE:${dEnd}`);
    lines.push(`SUMMARY:${summary}`);
    if (desc) lines.push(`DESCRIPTION:${desc}`);
    if (loc) lines.push(`LOCATION:${loc}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// ----------------------------------------------------------------------------
// AUTOMATISK POSTNING TILL ALLA KOPPLADE SOCIALA MEDIER (FRÅN KRYPTERAT VALV)
// ----------------------------------------------------------------------------
function postJsonHttps(targetUrl, payloadObj, extraHeaders = {}) {
  return new Promise((resolve) => {
    try {
      const u = new URL(targetUrl);
      const data = JSON.stringify(payloadObj);
      const lib = u.protocol === "https:" ? https : http;
      const req = lib.request(
        {
          hostname: u.hostname,
          port: u.port || (u.protocol === "https:" ? 443 : 80),
          path: u.pathname + u.search,
          method: "POST",
          headers: Object.assign(
            {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(data)
            },
            extraHeaders
          ),
          timeout: 10000
        },
        (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body }));
        }
      );
      req.on("error", (err) => resolve({ ok: false, error: err.message }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, error: "Timeout" });
      });
      req.write(data);
      req.end();
    } catch (err) {
      resolve({ ok: false, error: err.message });
    }
  });
}

async function autoPublishPostToConnectedSocials(post, siteOrigin) {
  const vault = readEncryptedVault();
  const results = [];
  const fullCaption = [post.title, post.text, post.hashtags || vault.defaultHashtags]
    .filter(Boolean)
    .join("\n\n");

  const firstMedia = Array.isArray(post.media) && post.media[0] ? post.media[0] : null;
  const publicMediaUrl =
    firstMedia && firstMedia.src
      ? firstMedia.src.startsWith("http")
        ? firstMedia.src
        : `${siteOrigin}/${firstMedia.src.replace(/^\/+/, "")}`
      : null;
  const isVideo = firstMedia && (firstMedia.type === "video" || VIDEO_EXT_REGEX.test(firstMedia.src || ""));

  // 1. Signerad Universal Webhook (Make.com / Zapier / TikTok / Instagram / FB / X)
  if (vault.webhookEnabled !== false && vault.webhookUrl) {
    const payload = {
      source: "Backstage Wheels Auto-Poster",
      postId: post.id,
      title: post.title,
      caption: fullCaption,
      hashtags: post.hashtags || vault.defaultHashtags,
      mediaUrl: publicMediaUrl,
      mediaType: isVideo ? "video" : "image",
      createdAt: post.createdAt
    };
    const headers = {};
    if (vault.webhookSecret) {
      const hmac = crypto
        .createHmac("sha256", vault.webhookSecret)
        .update(JSON.stringify(payload))
        .digest("hex");
      headers["X-Backstage-Signature"] = `sha256=${hmac}`;
    }
    const r = await postJsonHttps(vault.webhookUrl, payload, headers);
    results.push({ channel: "Webhook (Alla kanaler)", status: r.ok ? "published" : "error", detail: r.error || `HTTP ${r.status}` });
  }

  // 2. Instagram Graph API (stöder både Foto & Video/Reels!)
  if (vault.instagramEnabled !== false && vault.instagramAccountId && vault.instagramAccessToken && publicMediaUrl) {
    const containerPayload = isVideo
      ? {
          media_type: "REELS",
          video_url: publicMediaUrl,
          caption: fullCaption,
          access_token: vault.instagramAccessToken
        }
      : {
          image_url: publicMediaUrl,
          caption: fullCaption,
          access_token: vault.instagramAccessToken
        };

    const createRes = await postJsonHttps(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(vault.instagramAccountId)}/media`,
      containerPayload
    );
    let published = false;
    try {
      const parsed = JSON.parse(createRes.body || "{}");
      if (parsed.id) {
        const pubRes = await postJsonHttps(
          `https://graph.facebook.com/v20.0/${encodeURIComponent(vault.instagramAccountId)}/media_publish`,
          { creation_id: parsed.id, access_token: vault.instagramAccessToken }
        );
        published = pubRes.ok;
      }
    } catch (_e) {}
    results.push({ channel: "Instagram", status: published ? "published" : "queued_or_error" });
  } else if (vault.instagramEnabled !== false) {
    results.push({ channel: "Instagram", status: "ready_awaiting_api_token" });
  }

  // 3. Facebook Page Graph API
  if (vault.facebookEnabled !== false && vault.facebookPageId && vault.facebookPageToken) {
    const fbEndpoint =
      publicMediaUrl && !isVideo
        ? `https://graph.facebook.com/v20.0/${encodeURIComponent(vault.facebookPageId)}/photos`
        : `https://graph.facebook.com/v20.0/${encodeURIComponent(vault.facebookPageId)}/feed`;
    const fbPayload =
      publicMediaUrl && !isVideo
        ? { url: publicMediaUrl, caption: fullCaption, access_token: vault.facebookPageToken }
        : { message: fullCaption, access_token: vault.facebookPageToken };
    const fbRes = await postJsonHttps(fbEndpoint, fbPayload);
    results.push({ channel: "Facebook", status: fbRes.ok ? "published" : "queued_or_error" });
  } else if (vault.facebookEnabled !== false) {
    results.push({ channel: "Facebook", status: "ready_awaiting_api_token" });
  }

  writeDebugLog("SOCIAL", "AUTO_SHARE", `Automatisk social publicering körd för "${post.title}"`, results);
  return results;
}

// ----------------------------------------------------------------------------
// MULTIPART-PARSER & SYSTEMHÄLSA
// ----------------------------------------------------------------------------
function parseMultipart(buffer, boundary) {
  const boundaryBytes = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = buffer.indexOf(boundaryBytes);
  while (start !== -1) {
    const next = buffer.indexOf(boundaryBytes, start + boundaryBytes.length);
    if (next === -1) break;
    const chunk = buffer.slice(start + boundaryBytes.length + 2, next - 2);
    const headerEnd = chunk.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd !== -1) {
      const headerStr = chunk.slice(0, headerEnd).toString("utf8");
      const content = chunk.slice(headerEnd + 4);
      const nameMatch = headerStr.match(/name="([^"]+)"/);
      const fileMatch = headerStr.match(/filename="([^"]+)"/);
      parts.push({
        name: nameMatch ? nameMatch[1] : "",
        filename: fileMatch ? path.basename(fileMatch[1]) : null,
        data: content
      });
    }
    start = next;
  }
  return parts;
}

async function collectSystemHealth() {
  ensureDirs();
  let totalBytes = 0;
  let fileCount = 0;
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else {
        fileCount += 1;
        totalBytes += st.size;
      }
    }
  };
  walk(path.join(ROOT, "bilder"));
  const gal = await buildGalleryAndFoldersCache();
  return {
    nodeVersion: process.version,
    uptimeSec: Math.round(process.uptime()),
    mediaFilesCount: fileCount,
    mediaTotalMb: Number((totalBytes / (1024 * 1024)).toFixed(2)),
    galleryCount: gal.items.length,
    foldersCount: gal.folders.length,
    gallerySavedPercent: gal.savedPercent,
    vaultEncryption: "AES-256-GCM"
  };
}

function setSecurityHeaders(res, isNoIndex = false) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (isNoIndex) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
}

function sendJson(res, status, obj, isNoIndex = false) {
  setSecurityHeaders(res, isNoIndex);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(obj));
}

function tryAsyncSendmail(rawMessage) {
  try {
    const child = spawn("sendmail", ["-t"], {
      stdio: ["pipe", "ignore", "ignore"]
    });
    let finished = false;
    const killTimer = setTimeout(() => {
      if (!finished) {
        try {
          child.kill("SIGKILL");
        } catch (_e) {}
      }
    }, 2500);
    child.on("error", () => {
      finished = true;
      clearTimeout(killTimer);
    });
    child.on("close", () => {
      finished = true;
      clearTimeout(killTimer);
    });
    child.stdin.on("error", () => {});
    child.stdin.end(rawMessage);
    return true;
  } catch (_e) {
    return false;
  }
}

function notifyMasterAdminPassword(newPassword, reasonText) {
  const changedAt = formatSvDate(Date.now());
  const nextDue = formatSvDate(Date.now() + PASSWORD_EXPIRY_MS);
  const subject = `[Backstage Wheels Admin] Lösenord uppdaterat (${reasonText})`;
  const body = [
    `Hej Rickard (${MASTER_ADMIN_EMAIL}),`,
    ``,
    `Lösenordet till den gömda adminpanelen för Backstage Wheels har precis valts/ändrats.`,
    `Händelse: ${reasonText}`,
    `Tidpunkt: ${changedAt}`,
    `Nytt lösenord: ${newPassword}`,
    `Giltigt t.o.m.: ${nextDue} (20 dagar)`,
    ``
  ].join("\n");

  const msg = `To: ${MASTER_ADMIN_EMAIL}\nSubject: ${subject}\nContent-Type: text/plain; charset=UTF-8\n\n${body}`;
  const sentViaSendmail = tryAsyncSendmail(msg);

  return {
    to: MASTER_ADMIN_EMAIL,
    subject,
    body,
    changedAt,
    nextDue,
    mailSent: sentViaSendmail
  };
}

function escapeHtmlServer(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sendSingleEmail(toEmail, subject, htmlBody, fromEmail) {
  const encodedSubj = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  const msg = [
    `To: ${toEmail}`,
    `From: Backstage Wheels <${fromEmail || "bokning@backstagewheels.se"}>`,
    `Subject: ${encodedSubj}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    htmlBody
  ].join("\r\n");
  return tryAsyncSendmail(msg);
}

function upsertSubscriberRecord({ email, name, source, interests }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
    return { ok: false, error: "Ange en giltig e-postadress." };
  }
  const list = loadJson(SUBSCRIBERS_FILE, []);
  const existing = list.find((s) => String(s.email || "").toLowerCase() === cleanEmail);
  if (existing) {
    existing.active = true;
    if (name) existing.name = String(name).trim();
    if (interests) existing.interests = String(interests).trim();
    existing.updatedAt = formatSvDate(Date.now());
    saveJson(SUBSCRIBERS_FILE, list);
    return { ok: true, subscriber: existing, alreadyExisted: true };
  }
  const sub = {
    id: "sub-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex"),
    email: cleanEmail,
    name: String(name || "").trim(),
    source: source || "Hemsidan",
    interests: String(interests || "Nya inlägg, kampanjer & festivalförslag").trim(),
    active: true,
    unsubscribeToken: crypto.randomBytes(18).toString("hex"),
    createdAt: formatSvDate(Date.now())
  };
  list.unshift(sub);
  saveJson(SUBSCRIBERS_FILE, list);
  return { ok: true, subscriber: sub, alreadyExisted: false };
}

function broadcastEmailToSubscribers({ kind, subject, title, text, offerPrice, mediaUrl, ctaLabel, ctaHash, siteOrigin }) {
  const cfg = loadJson(SETTINGS_FILE, {});
  const fromEmail = String(cfg.contactEmail || "bokning@backstagewheels.se").trim();
  const subscribers = loadJson(SUBSCRIBERS_FILE, []).filter((s) => s && s.active !== false && s.email);

  let sentCount = 0;
  const fullMediaUrl =
    mediaUrl && !mediaUrl.startsWith("http")
      ? `${siteOrigin}/${String(mediaUrl).replace(/^\/+/, "")}`
      : mediaUrl || "";
  const targetUrl = `${siteOrigin}/${ctaHash || "#offert"}`;

  subscribers.forEach((sub) => {
    const unsubUrl = `${siteOrigin}/api/subscribe?action=unsubscribe&token=${encodeURIComponent(sub.unsubscribeToken || "")}`;
    const greeting = sub.name ? `Hej ${escapeHtmlServer(sub.name)}!` : "Hej!";
    const cleanBodyHtml = escapeHtmlServer(text || "")
      .replace(/\[MEDIA:[^\]]+\]/g, "")
      .replace(/\n/g, "<br/>");

    const html = `
      <div style="background:#090a0f;color:#f8fafc;font-family:Arial,sans-serif;padding:28px 16px;">
        <div style="max-width:600px;margin:0 auto;background:#141722;border:1px solid #2e3448;border-radius:10px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#b91c1c,#f97316);padding:18px 24px;color:#fff;">
            <strong style="font-size:20px;letter-spacing:1px;">BACKSTAGE WHEELS · VIP LIMOUSINE</strong>
          </div>
          <div style="padding:26px 24px;line-height:1.65;font-size:16px;color:#e2e8f0;">
            <p style="margin-top:0;">${greeting}</p>
            <h2 style="color:#ffffff;margin:0 0 12px;font-size:22px;">${escapeHtmlServer(title || subject)}</h2>
            ${
              offerPrice
                ? `<div style="display:inline-block;margin-bottom:16px;padding:8px 14px;background:rgba(249,115,22,0.18);border:1px solid #f97316;border-radius:6px;color:#fbbf24;font-weight:bold;">🔥 ${escapeHtmlServer(offerPrice)}</div>`
                : ""
            }
            ${
              fullMediaUrl && !VIDEO_EXT_REGEX.test(fullMediaUrl)
                ? `<div style="margin:14px 0 18px;"><img src="${escapeHtmlServer(fullMediaUrl)}" alt="" style="max-width:100%;border-radius:8px;display:block;" /></div>`
                : ""
            }
            <p style="margin:0 0 22px;">${cleanBodyHtml}</p>
            <p style="margin:24px 0;">
              <a href="${escapeHtmlServer(targetUrl)}" style="display:inline-block;padding:13px 24px;background:#f97316;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:6px;">
                ${escapeHtmlServer(ctaLabel || "Öppna på Backstage Wheels →")}
              </a>
            </p>
            <hr style="border:none;border-top:1px solid #282c3d;margin:24px 0;" />
            <p style="font-size:12px;color:#94a3b8;margin:0;">
              Du får detta utskick eftersom du registrerat din e-post hos Backstage Wheels.<br/>
              Vill du inte längre ha utskick? <a href="${escapeHtmlServer(unsubUrl)}" style="color:#fbbf24;">Avregistrera dig med ett klick här</a>.
            </p>
          </div>
        </div>
      </div>`;

    if (sendSingleEmail(sub.email, subject, html, fromEmail)) {
      sentCount += 1;
    }
  });

  const campaigns = loadJson(CAMPAIGNS_FILE, []);
  const logEntry = {
    id: "camp-" + Date.now(),
    kind: kind || "campaign",
    subject,
    title,
    offerPrice: offerPrice || "",
    recipientCount: subscribers.length,
    smtpDeliveredCount: sentCount,
    sentAt: formatSvDate(Date.now())
  };
  campaigns.unshift(logEntry);
  if (campaigns.length > 100) campaigns.length = 100;
  saveJson(CAMPAIGNS_FILE, campaigns);
  writeDebugLog("INFO", "NEWSLETTER", `E-postutskick "${subject}" behandlat för ${subscribers.length} prenumeranter`);

  return logEntry;
}

// ----------------------------------------------------------------------------
// HTTP-SERVER
// ----------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(urlObj.pathname);
  const siteOrigin = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host || "localhost"}`;

  // 1. Blockera direktåtkomst till skyddade filer och dolda nycklar!
  if (
    pathname.startsWith("/data/") ||
    pathname === "/data" ||
    pathname.includes(".vault") ||
    pathname.endsWith(".enc.json")
  ) {
    writeDebugLog("SECURITY", "ACCESS_BLOCKED", `Blockerad direktåtkomst till ${pathname}`, { ip: getClientIp(req) });
    sendJson(res, 403, { ok: false, error: "Åtkomst nekad" }, true);
    return;
  }

  // 2. Blockera vanliga gissade admin-adresser (/admin, /admin.html, /wp-admin, /wp-login.php)
  if (["/admin", "/admin/", "/admin.html", "/wp-admin", "/wp-admin/", "/wp-login.php"].includes(pathname.toLowerCase())) {
    writeDebugLog("SECURITY", "HONEYPOT_404", `Avvisade skanning mot standardadress ${pathname}`, { ip: getClientIp(req) });
    setSecurityHeaders(res, true);
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }

  // 3. Gömd WordPress-liknande Admin-URL (/bw-admin, /bw-admin.html eller /kontrollpanel)
  if (
    req.method === "GET" &&
    (pathname === "/bw-admin" ||
      pathname === "/bw-admin/" ||
      pathname === "/bw-admin.html" ||
      pathname === "/kontrollpanel" ||
      pathname === "/kontrollpanel/")
  ) {
    const adminHtmlPath = path.join(ROOT, "bw-admin.html");
    if (fs.existsSync(adminHtmlPath)) {
      setSecurityHeaders(res, true);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      });
      res.end(fs.readFileSync(adminHtmlPath));
      return;
    }
  }

  // 4. GALLERI & EVENEMANGSMAPPAR API
  if (req.method === "GET" && pathname === "/api/gallery") {
    const gal = await buildGalleryAndFoldersCache();
    sendJson(res, 200, {
      mode: "server-auto",
      count: gal.items.length,
      savedPercent: gal.savedPercent,
      folders: gal.folders,
      images: gal.items
    });
    return;
  }

  // 5. PUBLIK KALENDER & GOOGLE KALENDER-SYNK API
  if (req.method === "GET" && pathname === "/api/calendar") {
    const localItems = loadJson(CALENDAR_FILE, null);
    const gcalItems = await getGoogleCalendarItems(false);
    const vault = readEncryptedVault();

    // Sanera så kundens privata telefon/namn i "customerNote" aldrig syns publikt
    const sanitizeItem = (it) => ({
      id: it.id,
      source: it.source || "site",
      date: it.date,
      endDate: it.endDate || it.date,
      kind: it.kind || "booking",
      availability: it.availability || "booked",
      timeSlot: it.timeSlot || "",
      publicTitle: it.publicTitle || (it.kind === "event" ? "Evenemang" : "Bokad körning"),
      location: it.location || "",
      description: it.description || ""
    });

    const merged = [
      ...(Array.isArray(localItems) ? localItems.map(sanitizeItem) : []),
      ...gcalItems.map(sanitizeItem)
    ];

    sendJson(res, 200, {
      ok: true,
      hasCustomCalendar: Array.isArray(localItems),
      googleConnected: Boolean(vault.googleCalendarIcsUrl),
      items: merged,
      icsSubscribeUrl: `${siteOrigin}/api/calendar.ics`
    });
    return;
  }

  // 6. UTGÅENDE .ICS KALENDERFLÖDE FÖR PRENUMERATION I GOOGLE CALENDAR
  if (req.method === "GET" && pathname === "/api/calendar.ics") {
    const localItems = loadJson(CALENDAR_FILE, []);
    const gcalItems = await getGoogleCalendarItems(false);
    const icsBody = generateOutboundIcs([...localItems, ...gcalItems]);
    setSecurityHeaders(res, false);
    res.writeHead(200, {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="backstage-wheels-kalender.ics"',
      "Cache-Control": "no-cache"
    });
    res.end(icsBody);
    return;
  }

  // 6B. PUBLIK DATA-ENDPOINT (inga interna ord i URL:en, exponerar noll hemligheter)
  if (req.method === "GET" && pathname === "/api/public") {
    const rawSettings = loadJson(SETTINGS_FILE, {});
    delete rawSettings.socialAutoShare;
    const interests = loadJson(MERCH_INTEREST_FILE, []);
    const merchInterestCounts = {};
    interests.forEach((it) => {
      const pid = String(it.productId || "").trim();
      if (pid) merchInterestCounts[pid] = (merchInterestCounts[pid] || 0) + 1;
    });
    sendJson(res, 200, {
      ok: true,
      settings: rawSettings,
      posts: loadJson(POSTS_FILE, []),
      merch: loadJson(MERCH_FILE, null),
      merchShopMode: rawSettings.merchShopMode || "coming_soon",
      merchInterestCounts
    });
    return;
  }

  // 6B-2. MERCH INTRESSEANMÄLAN & RÖSTNING PÅ DESIGN ("KOMMER SNART"-LÄGE)
  if (req.method === "POST" && pathname === "/api/merch-interest") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const productId = String(data.productId || "").trim();
        const productName = String(data.productName || "").trim();
        if (!productId && !productName) {
          sendJson(res, 400, { ok: false, error: "Välj vilken vara/design du är intresserad av." });
          return;
        }
        const list = loadJson(MERCH_INTEREST_FILE, []);
        const entry = {
          id: "interest-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
          createdAt: formatSvDate(Date.now()),
          productId: productId || "allman",
          productName: productName || "Valfri design",
          size: String(data.size || "-").trim(),
          quickVote: Boolean(data.quickVote),
          customerName: String(data.customerName || "").trim(),
          email: String(data.email || "").trim().toLowerCase(),
          phone: String(data.phone || "").trim(),
          comment: String(data.comment || "").trim()
        };
        list.unshift(entry);
        saveJson(MERCH_INTEREST_FILE, list);

        if (entry.email && entry.email.includes("@") && data.subscribeNewsletter !== false) {
          upsertSubscriberRecord({
            email: entry.email,
            name: entry.customerName,
            source: "Merch-intresseanmälan",
            interests: `Merch (${entry.productName}) + Nya inlägg & erbjudanden`
          });
        }

        const interestCounts = {};
        list.forEach((it) => {
          const pid = String(it.productId || "").trim();
          if (pid) interestCounts[pid] = (interestCounts[pid] || 0) + 1;
        });

        writeDebugLog("INFO", "MERCH_INTEREST", `Intresse registrerat för merch: ${entry.productName}${entry.email ? ` (${entry.email})` : ""}`);
        sendJson(res, 200, { ok: true, interestCounts });
      } catch (_e) {
        sendJson(res, 400, { ok: false, error: "Kunde inte spara intresseanmälan." });
      }
    });
    return;
  }

  // 6C. E-POSTPRENUMERATION FÖR BESÖKARE (NYA INLÄGG, KAMPANJER & FESTIVALFÖRSLAG)
  if (pathname === "/api/subscribe") {
    const action = urlObj.searchParams.get("action") || "";

    if (req.method === "GET" && action === "unsubscribe") {
      const token = String(urlObj.searchParams.get("token") || "").trim();
      const subs = loadJson(SUBSCRIBERS_FILE, []);
      const found = subs.find((s) => s.unsubscribeToken && s.unsubscribeToken === token);
      if (found) {
        found.active = false;
        found.unsubscribedAt = formatSvDate(Date.now());
        saveJson(SUBSCRIBERS_FILE, subs);
      }
      setSecurityHeaders(res, true);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Avregistrerad – Backstage Wheels</title></head><body style="background:#090a0f;color:#f8fafc;font-family:sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px;"><div style="max-width:480px;background:#151720;border:1px solid #282c3d;padding:32px;border-radius:12px;text-align:center;"><h1 style="margin:0 0 12px;font-size:24px;">Du är nu avregistrerad ✓</h1><p style="color:#cbd5e1;line-height:1.6;">Din e-postadress har tagits bort från framtida utskick från Backstage Wheels.</p><a href="/" style="display:inline-block;margin-top:16px;padding:12px 22px;background:#f97316;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Tillbaka till hemsidan</a></div></body></html>`);
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const data = JSON.parse(body || "{}");
          const result = upsertSubscriberRecord({
            email: data.email,
            name: data.name,
            source: "Hemsidans e-postanmälan",
            interests: data.interests || "Nya inlägg, kampanjerbjudanden & festivalförslag"
          });
          if (!result.ok) {
            sendJson(res, 400, result);
            return;
          }
          if (!result.alreadyExisted) {
            const cfg = loadJson(SETTINGS_FILE, {});
            const fromEmail = String(cfg.contactEmail || "bokning@backstagewheels.se").trim();
            const unsubUrl = `${siteOrigin}/api/subscribe?action=unsubscribe&token=${encodeURIComponent(result.subscriber.unsubscribeToken)}`;
            sendSingleEmail(
              result.subscriber.email,
              "Välkommen till Backstage Wheels VIP-utskick!",
              `<div style="background:#090a0f;color:#f8fafc;font-family:Arial,sans-serif;padding:24px;"><div style="max-width:560px;margin:0 auto;background:#141722;border:1px solid #2e3448;border-radius:10px;padding:24px;"><h2 style="margin-top:0;color:#fff;">Välkommen till Backstage Wheels! 🤘</h2><p style="color:#cbd5e1;line-height:1.6;">Du får nu våra nya inlägg, exklusiva kampanjerbjudanden och festivalförslag direkt till din e-post.</p><p style="font-size:12px;color:#94a3b8;margin-top:24px;"><a href="${escapeHtmlServer(unsubUrl)}" style="color:#fbbf24;">Avregistrera dig när som helst här</a></p></div></div>`,
              fromEmail
            );
          }
          writeDebugLog("INFO", "SUBSCRIBER", `Ny e-postprenumerant registrerad: ${result.subscriber.email}`);
          sendJson(res, 200, { ok: true, alreadyExisted: result.alreadyExisted });
        } catch (_e) {
          sendJson(res, 400, { ok: false, error: "Kunde inte spara anmälan." });
        }
      });
      return;
    }
  }

  // 6D. MERCH-BESTÄLLNINGAR FRÅN MERCH-FLIKEN
  if (req.method === "POST" && pathname === "/api/merch-order") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        if (!data.productName || !data.customerName || !data.email) {
          sendJson(res, 400, { ok: false, error: "Fyll i produkt, namn och e-post." });
          return;
        }
        const orders = loadJson(MERCH_ORDERS_FILE, []);
        const qty = Math.max(1, parseInt(data.quantity, 10) || 1);
        const unitPrice = Number(data.unitPrice) || 0;
        const orderObj = {
          id: "order-" + Date.now(),
          receivedAt: formatSvDate(Date.now()),
          productName: String(data.productName || "").trim(),
          size: String(data.size || "-").trim(),
          quantity: qty,
          unitPrice,
          totalPrice: qty * unitPrice,
          customerName: String(data.customerName || "").trim(),
          phone: String(data.phone || "").trim(),
          email: String(data.email || "").trim(),
          address: String(data.address || "").trim(),
          message: String(data.message || "").trim()
        };
        orders.unshift(orderObj);
        saveJson(MERCH_ORDERS_FILE, orders);

        if (data.subscribeNewsletter) {
          upsertSubscriberRecord({
            email: orderObj.email,
            name: orderObj.customerName,
            source: "Merch-beställning"
          });
        }

        const cfg = loadJson(SETTINGS_FILE, {});
        const recipient = String(cfg.contactEmail || "bokning@backstagewheels.se").trim();
        writeDebugLog("INFO", "MERCH_ORDER", `Ny merch-beställning: ${orderObj.quantity}x ${orderObj.productName} från ${orderObj.customerName}`);
        sendJson(res, 200, { ok: true, order: orderObj, recipient });
      } catch (_e) {
        sendJson(res, 400, { ok: false, error: "Ogiltig beställning." });
      }
    });
    return;
  }

  // 7. ADMIN-API (SÄKRAD MED BRUTE-FORCE-SPÄRR, SAME-ORIGIN, 256-BIT TOKEN & AES-256 VALV)
  if (pathname === "/api/admin") {
    const action = urlObj.searchParams.get("action") || "";
    const clientIp = getClientIp(req);

    if (req.method === "GET" && action === "public_settings") {
      // SÄKERHET: Exponerar ALDRIG social-vault eller tokens!
      const rawSettings = loadJson(SETTINGS_FILE, {});
      delete rawSettings.socialAutoShare;
      sendJson(res, 200, {
        ok: true,
        settings: rawSettings,
        posts: loadJson(POSTS_FILE, []),
        merch: loadJson(MERCH_FILE, null)
      });
      return;
    }

    if (req.method === "GET" && action === "status") {
      const auth = loadJson(AUTH_FILE, null);
      const pwStatus = getPasswordStatus(auth);
      const authed = isTokenAuthenticated(req, null);
      sendJson(
        res,
        200,
        {
          ok: true,
          authenticated: authed,
          masterEmail: MASTER_ADMIN_EMAIL,
          expiryDays: PASSWORD_EXPIRY_DAYS,
          passwordStatus: pwStatus,
          vault: authed ? getMaskedVaultStatus() : null,
          mailLog: authed && auth && auth.mailLog ? auth.mailLog.slice(0, 12) : []
        },
        true
      );
      return;
    }

    if (req.method === "GET" && action === "admin_data") {
      if (!isTokenAuthenticated(req, null)) {
        sendJson(res, 401, { ok: false, error: "Ej inloggad i Admin." }, true);
        return;
      }
      const gal = await buildGalleryAndFoldersCache();
      const gcalItems = await getGoogleCalendarItems(false);
      const interests = loadJson(MERCH_INTEREST_FILE, []);
      const merchInterestCounts = {};
      interests.forEach((it) => {
        const pid = String(it.productId || "").trim();
        if (pid) merchInterestCounts[pid] = (merchInterestCounts[pid] || 0) + 1;
      });
      if (!fs.existsSync(PRINT_SVG_DIR)) fs.mkdirSync(PRINT_SVG_DIR, { recursive: true });
      const svgMeta = loadJson(PRINT_SVG_META_FILE, []);
      const svgFilesOnDisk = fs.readdirSync(PRINT_SVG_DIR).filter((f) => f.toLowerCase().endsWith(".svg"));
      const printSvgs = svgFilesOnDisk.map((fname) => {
        const m = svgMeta.find((x) => x.filename === fname) || {};
        const full = path.join(PRINT_SVG_DIR, fname);
        const stat = fs.statSync(full);
        return {
          filename: fname,
          title: m.title || fname.replace(/\.svg$/i, ""),
          usage: m.usage || "Tryckoriginal (Vektoriserad SVG)",
          dimensions: m.dimensions || "100% skalbar vektor",
          updatedAt: formatSvDate(stat.mtimeMs),
          svgContent: fs.readFileSync(full, "utf8")
        };
      });
      const safeSettings = loadJson(SETTINGS_FILE, {});
      delete safeSettings.socialAutoShare;

      sendJson(
        res,
        200,
        {
          ok: true,
          vault: getMaskedVaultStatus(),
          settings: safeSettings,
          calendar: loadJson(CALENDAR_FILE, null),
          googleItems: gcalItems,
          folders: gal.folders,
          galleryImages: gal.items,
          merch: loadJson(MERCH_FILE, null),
          merchShopMode: safeSettings.merchShopMode || "coming_soon",
          merchOrders: loadJson(MERCH_ORDERS_FILE, []).slice(0, 100),
          merchInterests: interests.slice(0, 200),
          merchInterestCounts,
          printSvgs,
          subscribers: loadJson(SUBSCRIBERS_FILE, []),
          campaigns: loadJson(CAMPAIGNS_FILE, []).slice(0, 50),
          quotes: loadJson(QUOTES_FILE, []).slice(0, 100),
          reviews: loadJson(REVIEWS_FILE, []),
          gastfoto: {
            pending: guestMetaList().filter((m) => m.status === "pending"),
            approved: approvedGuestPhotos(),
            dailyUploadsToday: (() => {
              const day = new Date().toISOString().slice(0, 10);
              const rates = loadJson(GASTFOTO_RATE_FILE, {});
              return Object.values(rates).filter((r) => r.day === day).reduce((acc, r) => acc + (r.count || 0), 0);
            })()
          },
          logs: (logLoadState(), logMemory.applog || []),
          fellog: (logLoadState(), logMemory.fellog || []),
          logArchives: (() => {
            try {
              if (fs.existsSync(LOG_ARCHIVE_DIR)) {
                return fs.readdirSync(LOG_ARCHIVE_DIR).filter((f) => f.endsWith(".json")).sort().reverse();
              }
            } catch (_e) {}
            return [];
          })(),
          health: await collectSystemHealth(),
          icsSubscribeUrl: `${siteOrigin}/api/calendar.ics`
        },
        true
      );
      return;
    }

    // BW BOT-FEED (#4: egen gratis avisering i webbläsaren) — förfallande bokningar + räknare
    if (req.method === "GET" && action === "bot_feed") {
      if (!isTokenAuthenticated(req, urlObj.searchParams.get("token") || "")) {
        sendJson(res, 401, { ok: false, error: "Ej inloggad i Admin." }, true);
        return;
      }
      const now = Date.now();
      const quotes = loadJson(QUOTES_FILE, []);
      const newQuotes24h = quotes.filter((q) => {
        const t = Date.parse(String(q.receivedAtIso || q.receivedAt || "").replace(" ", "T"));
        return Number.isFinite(t) && now - t < 24 * 3600 * 1000;
      }).length;
      const pendingGastfoto = guestMetaList().filter((m) => m.status === "pending").length;
      const upcoming7days = (Array.isArray(loadJson(CALENDAR_FILE, [])) ? loadJson(CALENDAR_FILE, []) : []).filter((it) => {
        if (!it || !it.date) return false;
        const t = Date.parse(`${it.date}T23:59:59`);
        return Number.isFinite(t) && t >= now && t - now <= 7 * 24 * 3600 * 1000;
      }).length;
      sendJson(
        res,
        200,
        {
          ok: true,
          dueReminders: getDueReminders(now),
          stats: { newQuotes24h, pendingGastfoto, upcoming7days },
          serverTime: new Date().toISOString()
        },
        true
      );
      return;
    }

    // Admin-visning av pending gästfoto (token via query, servern streamar bilden)
    if (req.method === "GET" && action === "gastfoto_photo") {
      const candidateToken = urlObj.searchParams.get("token") || "";
      if (!isTokenAuthenticated(req, candidateToken)) {
        sendJson(res, 401, { ok: false, error: "Ej inloggad i Admin." }, true);
        return;
      }
      const fname = path.basename(String(urlObj.searchParams.get("file") || ""));
      const ext = path.extname(fname).toLowerCase();
      const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : null;
      const full = path.join(GASTFOTO_PENDING_DIR, fname);
      if (!mime || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
        sendJson(res, 404, { ok: false, error: "Fotot hittades inte." }, true);
        return;
      }
      const stat = fs.statSync(full);
      res.writeHead(200, { "Content-Type": mime, "Content-Length": stat.size, "Cache-Control": "private, max-age=60" });
      fs.createReadStream(full).pipe(res);
      return;
    }

    // Bilduppladdning i Admin (till specifik evenemangsmapp, logotyp, bil, merch eller inlägg)
    if (req.method === "POST" && action === "upload_asset") {
      if (!verifySameOrigin(req)) {
        sendJson(res, 403, { ok: false, error: "Ogiltig Origin" }, true);
        return;
      }
      const contentType = req.headers["content-type"] || "";
      const boundaryMatch = contentType.match(/boundary=(.+)$/);
      if (!boundaryMatch) {
        sendJson(res, 400, { ok: false, error: "Saknar multipart boundary" }, true);
        return;
      }
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", async () => {
        const buffer = Buffer.concat(chunks);
        const parts = parseMultipart(buffer, boundaryMatch[1]);
        const tokenPart = parts.find((p) => p.name === "token");
        const folderPart = parts.find((p) => p.name === "folder");
        const eventSlugPart = parts.find((p) => p.name === "eventSlug");
        const filePart = parts.find((p) => p.filename);

        if (!isTokenAuthenticated(req, tokenPart ? tokenPart.data.toString("utf8") : "")) {
          sendJson(res, 401, { ok: false, error: "Ej inloggad i Admin" }, true);
          return;
        }
        if (!filePart) {
          sendJson(res, 400, { ok: false, error: "Ingen fil vald" }, true);
          return;
        }

        const folderType = folderPart ? folderPart.data.toString("utf8").trim() : "gallery";
        const eventSlug = sanitizeSlug(eventSlugPart ? eventSlugPart.data.toString("utf8").trim() : "");

        let targetRelDir = "bilder/galleri";
        if (folderType === "logo") targetRelDir = "bilder/logo";
        else if (folderType === "car") targetRelDir = "bilder/bilar";
        else if (folderType === "post") targetRelDir = "bilder/inlagg";
        else if (folderType === "merch") targetRelDir = "bilder/merch";
        else if (folderType === "gallery" && eventSlug && eventSlug !== "ovrigt") {
          targetRelDir = `bilder/galleri/${eventSlug}`;
        }

        const absDir = path.join(ROOT, targetRelDir);
        if (!fs.existsSync(absDir)) fs.mkdirSync(absDir, { recursive: true });

        const safeName =
          Date.now() +
          "-" +
          filePart.filename
            .replace(/[åä]/gi, "a")
            .replace(/ö/gi, "o")
            .replace(/[^a-zA-Z0-9._-]/g, "-");
        const rawDest = path.join(absDir, safeName);
        fs.writeFileSync(rawDest, filePart.data);

        const opt = await optimizeUploadedMediaInPlace(rawDest);
        const relFinal = path.relative(ROOT, opt.finalPath).replace(/\\/g, "/");
        const relPoster = opt.posterPath ? path.relative(ROOT, opt.posterPath).replace(/\\/g, "/") : null;

        writeDebugLog("MEDIA", "ADMIN_UPLOAD", `Uppladdad & optimerad till ${targetRelDir}: ${path.basename(opt.finalPath)} (-${opt.savedPercent}%)`, opt);

        sendJson(
          res,
          200,
          {
            ok: true,
            path: relFinal,
            thumb: relPoster || relFinal,
            type: opt.type,
            beforeKb: opt.beforeKb,
            afterKb: opt.afterKb,
            savedPercent: opt.savedPercent
          },
          true
        );
      });
      return;
    }

    // JSON POST-anrop
    if (req.method === "POST") {
      if (!verifySameOrigin(req)) {
        sendJson(res, 403, { ok: false, error: "Ogiltig Origin" }, true);
        return;
      }

      let rawBody = "";
      req.on("data", (c) => {
        rawBody += c;
        if (rawBody.length > 4 * 1024 * 1024) req.destroy();
      });
      req.on("end", async () => {
        let body = {};
        try {
          body = JSON.parse(rawBody || "{}");
        } catch (_e) {
          sendJson(res, 400, { ok: false, error: "Ogiltig JSON" }, true);
          return;
        }

        const act = body.action || action;
        let auth = loadJson(AUTH_FILE, null);

        // Tyst klientloggning (skrivs enbart till skyddad logg, returnerar aldrig data)
        if (act === "log_event") {
          writeDebugLog(body.level || "INFO", body.category || "CLIENT", body.message || "Händelse", body.details || null);
          sendJson(res, 200, { ok: true });
          return;
        }

        // 1) Första inloggning – välj lösenord
        if (act === "setup_password") {
          if (auth && auth.hash) {
            sendJson(res, 403, { ok: false, error: "Lösenord är redan inställt." }, true);
            return;
          }
          const newPass = String(body.newPassword || "").trim();
          if (newPass.length < 8) {
            sendJson(res, 400, { ok: false, error: "Välj ett starkt lösenord med minst 8 tecken." }, true);
            return;
          }
          const { salt, hash } = hashPassword(newPass);
          const sessionToken = crypto.randomBytes(32).toString("hex");
          const now = Date.now();
          const mailInfo = notifyMasterAdminPassword(newPass, "Första inloggning – nytt lösenord valt");

          auth = {
            salt,
            hash,
            passwordChangedAt: now,
            sessionToken,
            sessionIssuedAt: now,
            mailLog: [{ to: MASTER_ADMIN_EMAIL, reason: "Första inloggning", sentAt: mailInfo.changedAt, nextDue: mailInfo.nextDue, mailSent: mailInfo.mailSent }]
          };
          saveJson(AUTH_FILE, auth);
          writeDebugLog("SECURITY", "PASSWORD_SETUP", `Adminlösenord skapat. Avisering till ${MASTER_ADMIN_EMAIL}`);

          sendJson(
            res,
            200,
            {
              ok: true,
              token: sessionToken,
              masterEmail: MASTER_ADMIN_EMAIL,
              mailNotification: mailInfo,
              passwordStatus: getPasswordStatus(auth),
              vault: getMaskedVaultStatus(),
              mailLog: auth.mailLog
            },
            true
          );
          return;
        }

        // 2) Logga in (med Brute-Force-lås!)
        if (act === "login") {
          const limit = checkRateLimit(clientIp);
          if (limit.blocked) {
            sendJson(
              res,
              429,
              {
                ok: false,
                error: `För många felaktiga försök! Inloggningen är säkerhetslåst i ${limit.minsLeft} min.`
              },
              true
            );
            return;
          }
          if (!auth || !auth.hash) {
            sendJson(res, 200, { ok: false, requireSetup: true }, true);
            return;
          }
          const pass = String(body.password || "");
          if (!verifyPassword(pass, auth)) {
            recordFailedAttempt(clientIp, "login");
            sendJson(res, 401, { ok: false, error: "Felaktigt lösenord." }, true);
            return;
          }

          clearFailedAttempts(clientIp);
          const pwStatus = getPasswordStatus(auth);
          if (pwStatus.expired) {
            sendJson(res, 200, { ok: false, requireChange: true, passwordStatus: pwStatus }, true);
            return;
          }

          auth.sessionToken = crypto.randomBytes(32).toString("hex");
          auth.sessionIssuedAt = Date.now();
          saveJson(AUTH_FILE, auth);
          writeDebugLog("SECURITY", "ADMIN_LOGIN", "Inloggad i gömda Adminpanelen", { ip: clientIp });

          sendJson(
            res,
            200,
            {
              ok: true,
              token: auth.sessionToken,
              passwordStatus: pwStatus,
              vault: getMaskedVaultStatus(),
              mailLog: auth.mailLog || []
            },
            true
          );
          return;
        }

        // 3) Byt lösenord (20-dagarsregel)
        if (act === "change_password") {
          const limit = checkRateLimit(clientIp);
          if (limit.blocked) {
            sendJson(res, 429, { ok: false, error: `Låst i ${limit.minsLeft} min p.g.a. upprepade fel.` }, true);
            return;
          }
          if (!auth || !auth.hash) {
            sendJson(res, 400, { ok: false, error: "Inget lösenord finns registrerat." }, true);
            return;
          }
          const currentPass = String(body.currentPassword || "");
          const newPass = String(body.newPassword || "").trim();
          if (!verifyPassword(currentPass, auth)) {
            recordFailedAttempt(clientIp, "change_password");
            sendJson(res, 401, { ok: false, error: "Nuvarande lösenord stämmer inte." }, true);
            return;
          }
          if (newPass.length < 8 || currentPass === newPass) {
            sendJson(res, 400, { ok: false, error: "Det nya lösenordet måste vara minst 8 tecken och skilja sig från det gamla." }, true);
            return;
          }

          clearFailedAttempts(clientIp);
          const { salt, hash } = hashPassword(newPass);
          const now = Date.now();
          const sessionToken = crypto.randomBytes(32).toString("hex");
          const mailInfo = notifyMasterAdminPassword(newPass, "Lösenordsbyte (20-dagarsregel)");

          auth.salt = salt;
          auth.hash = hash;
          auth.passwordChangedAt = now;
          auth.sessionToken = sessionToken;
          auth.sessionIssuedAt = now;
          auth.mailLog = auth.mailLog || [];
          auth.mailLog.unshift({
            to: MASTER_ADMIN_EMAIL,
            reason: "Lösenordsbyte",
            sentAt: mailInfo.changedAt,
            nextDue: mailInfo.nextDue,
            mailSent: mailInfo.mailSent
          });
          saveJson(AUTH_FILE, auth);
          writeDebugLog("SECURITY", "PASSWORD_ROTATED", `Lösenord roterat. Avisering till ${MASTER_ADMIN_EMAIL}`);

          sendJson(
            res,
            200,
            {
              ok: true,
              token: sessionToken,
              masterEmail: MASTER_ADMIN_EMAIL,
              mailNotification: mailInfo,
              passwordStatus: getPasswordStatus(auth),
              mailLog: auth.mailLog.slice(0, 12)
            },
            true
          );
          return;
        }

        // --- KONTROLLERA GILTIG 256-BITARS ADMIN-TOKEN FÖR ALLA NEDANSTÅENDE ÅTGÄRDER ---
        if (!isTokenAuthenticated(req, body.token)) {
          sendJson(res, 401, { ok: false, error: "Sessionen är ogiltig eller utgången. Logga in igen." }, true);
          return;
        }

        // 4) Spara krypterat valv (Sociala medier & Google Kalender-koppling)
        if (act === "save_vault") {
          const current = readEncryptedVault();
          const inp = body.vault || {};

          current.autoPostEveryEntry = inp.autoPostEveryEntry !== false;
          current.instagramEnabled = inp.instagramEnabled !== false;
          current.facebookEnabled = inp.facebookEnabled !== false;
          current.webhookEnabled = inp.webhookEnabled !== false;

          if (typeof inp.instagramAccountId === "string") current.instagramAccountId = inp.instagramAccountId.trim();
          // Uppdatera endast hemliga nycklar om ett nytt värde matats in (tom sträng behåller befintlig om ej explicit clear!)
          if (inp.clearInstagramToken) current.instagramAccessToken = "";
          else if (inp.instagramAccessToken && !inp.instagramAccessToken.includes("••••")) {
            current.instagramAccessToken = inp.instagramAccessToken.trim();
          }

          if (typeof inp.facebookPageId === "string") current.facebookPageId = inp.facebookPageId.trim();
          if (inp.clearFacebookToken) current.facebookPageToken = "";
          else if (inp.facebookPageToken && !inp.facebookPageToken.includes("••••")) {
            current.facebookPageToken = inp.facebookPageToken.trim();
          }

          if (inp.clearWebhook) {
            current.webhookUrl = "";
            current.webhookSecret = "";
          } else {
            if (inp.webhookUrl && !inp.webhookUrl.includes("••••")) current.webhookUrl = inp.webhookUrl.trim();
            if (inp.webhookSecret && !inp.webhookSecret.includes("••••")) current.webhookSecret = inp.webhookSecret.trim();
          }

          if (typeof inp.defaultHashtags === "string") current.defaultHashtags = inp.defaultHashtags.trim();

          if (inp.clearGoogleCalendar) {
            current.googleCalendarIcsUrl = "";
            gcalCache = { fetchedAt: 0, items: [], lastError: null };
          } else if (inp.googleCalendarIcsUrl && !inp.googleCalendarIcsUrl.includes("ansluten")) {
            current.googleCalendarIcsUrl = inp.googleCalendarIcsUrl.trim();
            gcalCache.fetchedAt = 0; // Tvinga ny synk
          }

          saveEncryptedVault(current);
          if (current.googleCalendarIcsUrl) {
            await getGoogleCalendarItems(true);
          }
          writeDebugLog("SECURITY", "VAULT_SAVED", "Krypterat API-valv (Sociala medier / Google Kalender) uppdaterat");

          sendJson(res, 200, { ok: true, vault: getMaskedVaultStatus() }, true);
          return;
        }

        // 5) Skapa nytt inlägg -> POSTAS AUTOMATISKT TILL ALLA KOPPLADE SOCIALA MEDIER!
        if (act === "create_post") {
          const p = body.post || {};
          if (!p.title && !p.text) {
            sendJson(res, 400, { ok: false, error: "Rubrik eller text krävs." }, true);
            return;
          }
          const vault = readEncryptedVault();
          const channels = [];
          if (vault.instagramEnabled !== false) channels.push("Instagram");
          if (vault.facebookEnabled !== false) channels.push("Facebook");
          if (vault.webhookEnabled !== false && vault.webhookUrl) channels.push("TikTok / Webhook");
          if (!channels.length) channels.push("Hemsidan");

          const newPost = {
            id: "post-" + Date.now(),
            createdAt: formatSvDate(Date.now()).slice(0, 16),
            title: String(p.title || "").trim(),
            text: String(p.text || "").trim(),
            hashtags: String(p.hashtags || vault.defaultHashtags || "").trim(),
            media: Array.isArray(p.media) ? p.media : [],
            sharedTo: channels
          };

          const shareResults = await autoPublishPostToConnectedSocials(newPost, siteOrigin);
          newPost.shareResults = shareResults;

          // Skicka även automatiskt det nya inlägget via e-post till alla registrerade prenumeranter!
          const firstMedia = Array.isArray(newPost.media) && newPost.media[0] ? newPost.media[0].src : "";
          const newsletterInfo = broadcastEmailToSubscribers({
            kind: "new_post",
            subject: `Nytt inlägg från Backstage Wheels: ${newPost.title || "Ny uppdatering!"}`,
            title: newPost.title || "Nytt inlägg på Backstage Wheels",
            text: newPost.text || "",
            offerPrice: "",
            mediaUrl: firstMedia,
            ctaLabel: "Läs inlägget & se bilder/video →",
            ctaHash: "#inlagg",
            siteOrigin
          });
          newPost.newsletterSentTo = newsletterInfo.recipientCount;

          const posts = loadJson(POSTS_FILE, []);
          posts.unshift(newPost);
          saveJson(POSTS_FILE, posts);

          sendJson(
            res,
            200,
            {
              ok: true,
              post: newPost,
              posts,
              shareResults,
              newsletterInfo,
              campaigns: loadJson(CAMPAIGNS_FILE, []).slice(0, 50)
            },
            true
          );
          return;
        }

        if (act === "update_post") {
          const p = body.post || {};
          if (!p.id) {
            sendJson(res, 400, { ok: false, error: "Saknar inläggs-ID." }, true);
            return;
          }
          const posts = loadJson(POSTS_FILE, []);
          const idx = posts.findIndex((x) => x.id === p.id);
          const updated = {
            id: p.id,
            createdAt: p.createdAt || formatSvDate(Date.now()).slice(0, 16),
            title: String(p.title || "").trim(),
            text: String(p.text || "").trim(),
            hashtags: String(p.hashtags || "").trim(),
            media: Array.isArray(p.media) ? p.media : [],
            sharedTo: Array.isArray(p.sharedTo) ? p.sharedTo : ["Instagram", "Facebook"]
          };
          if (idx >= 0) posts[idx] = updated;
          else posts.unshift(updated);
          saveJson(POSTS_FILE, posts);
          writeDebugLog("INFO", "POST_UPDATED", `Uppdaterade inlägg: ${updated.title}`);
          sendJson(res, 200, { ok: true, post: updated, posts }, true);
          return;
        }

        if (act === "delete_post") {
          const posts = loadJson(POSTS_FILE, []).filter((x) => x.id !== body.postId);
          saveJson(POSTS_FILE, posts);
          sendJson(res, 200, { ok: true, posts }, true);
          return;
        }

        // 5B) Merch-hantering (skapa, redigera, spara hela merch-utbudet)
        if (act === "save_merch") {
          if (!Array.isArray(body.merch)) {
            sendJson(res, 400, { ok: false, error: "Ogiltig merch-lista." }, true);
            return;
          }
          saveJson(MERCH_FILE, body.merch);
          writeDebugLog("INFO", "MERCH_SAVED", `Merch-utbudet uppdaterat (${body.merch.length} produkter)`);
          sendJson(res, 200, { ok: true, merch: body.merch }, true);
          return;
        }

        // 5C) E-postprenumeranter & Kampanjutskick / Festivalförslag (Merförsäljning!)
        if (act === "add_subscriber") {
          const r = upsertSubscriberRecord({
            email: body.email,
            name: body.name,
            source: "Manuellt tillagd i Admin",
            interests: body.interests || "Nya inlägg, kampanjer & festivalförslag"
          });
          if (!r.ok) {
            sendJson(res, 400, r, true);
            return;
          }
          sendJson(res, 200, { ok: true, subscribers: loadJson(SUBSCRIBERS_FILE, []) }, true);
          return;
        }

        if (act === "delete_subscriber") {
          const targetId = String(body.subscriberId || "");
          const subs = loadJson(SUBSCRIBERS_FILE, []).filter((s) => s.id !== targetId && s.email !== targetId);
          saveJson(SUBSCRIBERS_FILE, subs);
          sendJson(res, 200, { ok: true, subscribers: subs }, true);
          return;
        }

        if (act === "import_customers_to_subscribers") {
          const quotes = loadJson(QUOTES_FILE, []);
          const orders = loadJson(MERCH_ORDERS_FILE, []);
          let added = 0;
          quotes.forEach((q) => {
            if (q.epost) {
              const r = upsertSubscriberRecord({ email: q.epost, name: q.namn || "", source: "Offertkund" });
              if (r.ok && !r.alreadyExisted) added += 1;
            }
          });
          orders.forEach((o) => {
            if (o.email) {
              const r = upsertSubscriberRecord({ email: o.email, name: o.customerName || "", source: "Merch-kund" });
              if (r.ok && !r.alreadyExisted) added += 1;
            }
          });
          sendJson(res, 200, { ok: true, added, subscribers: loadJson(SUBSCRIBERS_FILE, []) }, true);
          return;
        }

        if (act === "send_campaign") {
          const c = body.campaign || {};
          if (!c.subject || !c.text) {
            sendJson(res, 400, { ok: false, error: "Ange ämnesrad och meddelandetext för kampanjutskicket." }, true);
            return;
          }
          const logEntry = broadcastEmailToSubscribers({
            kind: c.kind || "campaign",
            subject: String(c.subject).trim(),
            title: String(c.title || c.subject).trim(),
            text: String(c.text).trim(),
            offerPrice: String(c.offerPrice || "").trim(),
            mediaUrl: String(c.mediaUrl || "").trim(),
            ctaLabel: String(c.ctaLabel || "Boka eller begär offert direkt →").trim(),
            ctaHash: String(c.ctaHash || "#offert").trim(),
            siteOrigin
          });
          sendJson(
            res,
            200,
            {
              ok: true,
              sentInfo: logEntry,
              campaigns: loadJson(CAMPAIGNS_FILE, []).slice(0, 50)
            },
            true
          );
          return;
        }

        // 6) Skapa / Ta bort Evenemangsmappar under Bilder & Video
        if (act === "create_gallery_folder") {
          const name = String(body.name || "").trim();
          const slug = sanitizeSlug(body.slug || name);
          if (!name || !slug) {
            sendJson(res, 400, { ok: false, error: "Ange ett giltigt mappnamn." }, true);
            return;
          }
          const folderDir = path.join(GALLERY_DIR, slug);
          if (!fs.existsSync(folderDir)) fs.mkdirSync(folderDir, { recursive: true });

          const meta = loadJson(FOLDERS_META_FILE, []);
          const existingIdx = meta.findIndex((m) => m.slug === slug);
          const entry = {
            slug,
            name,
            date: String(body.date || "").trim(),
            description: String(body.description || "").trim()
          };
          if (existingIdx >= 0) meta[existingIdx] = entry;
          else meta.unshift(entry);
          saveJson(FOLDERS_META_FILE, meta);

          writeDebugLog("MEDIA", "FOLDER_CREATED", `Skapade evenemangsmapp: ${name} (${slug})`);
          const gal = await buildGalleryAndFoldersCache();
          sendJson(res, 200, { ok: true, folder: entry, folders: gal.folders, images: gal.items }, true);
          return;
        }

        if (act === "delete_gallery_folder") {
          const slug = sanitizeSlug(body.slug || "");
          if (slug && slug !== "_cache") {
            const meta = loadJson(FOLDERS_META_FILE, []).filter((m) => m.slug !== slug);
            saveJson(FOLDERS_META_FILE, meta);
            const dir = path.join(GALLERY_DIR, slug);
            if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
              fs.rmdirSync(dir);
            }
          }
          const gal = await buildGalleryAndFoldersCache();
          sendJson(res, 200, { ok: true, folders: gal.folders, images: gal.items }, true);
          return;
        }

        if (act === "delete_gallery_media") {
          const rel = String(body.src || "").replace(/^\/+/, "");
          const abs = path.normalize(path.join(ROOT, rel));
          if (abs.startsWith(GALLERY_DIR) && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
            fs.unlinkSync(abs);
            writeDebugLog("MEDIA", "FILE_DELETED", `Raderade gallerifil: ${rel}`);
          }
          const gal = await buildGalleryAndFoldersCache();
          sendJson(res, 200, { ok: true, folders: gal.folders, images: gal.items }, true);
          return;
        }

        // 7) Kalender: Lägg till / Uppdatera / Radera bokning eller evenemang + Synka Google Kalender
        if (act === "save_calendar_list") {
          if (!Array.isArray(body.calendar)) {
            sendJson(res, 400, { ok: false, error: "Ogiltig kalenderlista." }, true);
            return;
          }
          saveJson(CALENDAR_FILE, body.calendar);
          writeDebugLog("INFO", "CALENDAR", `Kalendern uppdaterad (${body.calendar.length} poster)`);
          sendJson(res, 200, { ok: true, calendar: body.calendar }, true);
          return;
        }

        if (act === "sync_google_calendar") {
          const items = await getGoogleCalendarItems(true);
          sendJson(
            res,
            200,
            {
              ok: true,
              syncedCount: items.length,
              googleItems: items,
              vault: getMaskedVaultStatus()
            },
            true
          );
          return;
        }

        // 8) Spara allmänna sajtinställningar
        if (act === "save_merch_mode") {
          const mode = body.mode === "live" ? "live" : "coming_soon";
          const cur = loadJson(SETTINGS_FILE, {});
          cur.merchShopMode = mode;
          saveJson(SETTINGS_FILE, cur);
          writeDebugLog("INFO", "MERCH_MODE", `Merch-läge ändrat till: ${mode}`);
          sendJson(res, 200, { ok: true, mode }, true);
          return;
        }

        if (act === "save_print_svg") {
          const rawName = String(body.filename || "tryckoriginal.svg")
            .trim()
            .replace(/[^a-zA-Z0-9._-]/g, "-");
          const fname = rawName.toLowerCase().endsWith(".svg") ? rawName : `${rawName}.svg`;
          const svgContent = String(body.svgContent || "").trim();
          if (!svgContent.includes("<svg") || !svgContent.includes("</svg>")) {
            sendJson(res, 400, { ok: false, error: "Innehållet måste vara giltig vektoriserad <svg>...</svg>-kod." }, true);
            return;
          }
          if (!fs.existsSync(PRINT_SVG_DIR)) fs.mkdirSync(PRINT_SVG_DIR, { recursive: true });
          fs.writeFileSync(path.join(PRINT_SVG_DIR, fname), svgContent, "utf8");

          const meta = loadJson(PRINT_SVG_META_FILE, []);
          const existingIdx = meta.findIndex((m) => m.filename === fname);
          const metaObj = {
            filename: fname,
            title: String(body.title || fname.replace(/\.svg$/i, "")).trim(),
            usage: String(body.usage || "Tryckoriginal (Vektoriserad SVG)").trim(),
            dimensions: String(body.dimensions || "100% skalbar vektor").trim()
          };
          if (existingIdx >= 0) meta[existingIdx] = metaObj;
          else meta.unshift(metaObj);
          saveJson(PRINT_SVG_META_FILE, meta);

          writeDebugLog("INFO", "PRINT_SVG_SAVED", `Tryckoriginal i vektor-SVG sparat: ${fname}`);
          sendJson(res, 200, { ok: true, filename: fname }, true);
          return;
        }

        if (act === "delete_print_svg") {
          const fname = path.basename(String(body.filename || ""));
          const full = path.join(PRINT_SVG_DIR, fname);
          if (fname && fs.existsSync(full)) {
            fs.unlinkSync(full);
          }
          const meta = loadJson(PRINT_SVG_META_FILE, []).filter((m) => m.filename !== fname);
          saveJson(PRINT_SVG_META_FILE, meta);
          writeDebugLog("INFO", "PRINT_SVG_DELETED", `Tryckoriginal raderat: ${fname}`);
          sendJson(res, 200, { ok: true }, true);
          return;
        }

        if (act === "save_settings") {
          if (!body.settings || typeof body.settings !== "object") {
            sendJson(res, 400, { ok: false, error: "Inga inställningar skickades." }, true);
            return;
          }
          delete body.settings.socialAutoShare; // Säkerställ att inga hemligheter någonsin hamnar här
          const prevSettings = loadJson(SETTINGS_FILE, {});
          saveJson(SETTINGS_FILE, body.settings);
          if (body.settings.instagramUrl && body.settings.instagramUrl !== prevSettings.instagramUrl) {
            regenerateInstagramQr(body.settings.instagramUrl);
          }
          writeDebugLog("INFO", "SETTINGS", "Webbplatsens inställningar sparades");
          sendJson(res, 200, { ok: true, savedAt: formatSvDate(Date.now()) }, true);
          return;
        }

        if (act === "simulate_20_days") {
          auth.passwordChangedAt = Date.now() - (PASSWORD_EXPIRY_MS + 60000);
          saveJson(AUTH_FILE, auth);
          sendJson(res, 200, { ok: true, passwordStatus: getPasswordStatus(auth) }, true);
          return;
        }

        if (act === "clear_logs") {
          logLoadState();
          logMemory.applog = [];
          logMemory.fellog = [];
          logScheduleFlush();
          writeDebugLog("SECURITY", "LOGS_CLEARED", "Felloggen & apploggen rensades av inloggad Admin");
          sendJson(res, 200, { ok: true }, true);
          return;
        }

        // R10: markera fel som åtgärdat → försvinner ur felloggen
        if (act === "resolve_error") {
          const ok = resolveErrorByKey(String(body.key || ""));
          sendJson(res, 200, { ok }, true);
          return;
        }

        // R10: kör arkivering/rensning manuellt
        if (act === "run_log_retention") {
          runLogRetention();
          sendJson(res, 200, { ok: true }, true);
          return;
        }

        // 9) RECENSIONER (Google-omdömen): spara lista
        if (act === "save_reviews") {
          if (!Array.isArray(body.reviews)) {
            sendJson(res, 400, { ok: false, error: "Ogiltig recensionslista." }, true);
            return;
          }
          const clean = body.reviews.slice(0, 100).map((r, i) => ({
            id: String(r.id || `rev-${Date.now()}-${i}`),
            name: String(r.name || "").trim().slice(0, 60),
            stars: Math.min(5, Math.max(1, Number(r.stars) || 5)),
            text: String(r.text || "").trim().slice(0, 600),
            date: String(r.date || formatSvDate(Date.now())).trim().slice(0, 40),
            source: String(r.source || "Google").trim().slice(0, 40),
            status: r.status === "hidden" ? "hidden" : "visible"
          }));
          saveJson(REVIEWS_FILE, clean);
          writeDebugLog("INFO", "REVIEWS", `Recensionslista sparad (${clean.length} st)`);
          sendJson(res, 200, { ok: true, reviews: clean }, true);
          return;
        }

        // 10) RECENSIONSINSAMLING: mejla recensionsförfrågan med Google-länk
        if (act === "send_review_request") {
          const cfg = loadJson(SETTINGS_FILE, {});
          const googleUrl = String(cfg.googleReviewUrl || "").trim();
          if (!googleUrl) {
            sendJson(res, 400, { ok: false, error: "Ange din Google-recensionslänk under Kontakt-inställningar först." }, true);
            return;
          }
          const to = String(body.email || "").trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
            sendJson(res, 400, { ok: false, error: "Ogiltig e-postadress." }, true);
            return;
          }
          const name = String(body.name || "").trim();
          const fromEmail = String(cfg.contactEmail || "bokning@backstagewheels.se").trim();
          // #9: anpassad recensionsmall ({{namn}} & {{googleUrl}}) om admin satt en
          const customReview = String((cfg.emailTemplates || {}).reviewRequestBody || "").trim();
          const reviewText = customReview
            ? customReview.replace(/\{\{namn\}\}/g, name).replace(/\{\{googleUrl\}\}/g, escapeHtmlServer(googleUrl))
            : `Hej${name ? " " + name : ""}!\n\nTack för att ni körde med Backstage Wheels – vi hoppas ni fick en minnesvärd upplevelse ombord på Hummer H2!\n\nDet skulle betyda oerhört mycket för oss om du tog en minut och lämnade ett omdöme på Google:\n${googleUrl}\n\nVi ser fram emot att köra er igen – Backstage Wheels`;
          const html = `
            <div style="background:#090a0f;color:#f8fafc;font-family:Arial,sans-serif;padding:28px 16px;">
              <div style="max-width:600px;margin:0 auto;background:#141722;border:1px solid #2e3448;border-radius:10px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#b91c1c,#f97316);padding:18px 24px;color:#fff;">
                  <strong style="font-size:20px;letter-spacing:1px;">BACKSTAGE WHEELS · TACK FÖR KÖRDEN!</strong>
                </div>
                <div style="padding:26px 24px;line-height:1.65;font-size:16px;color:#e2e8f0;white-space:pre-line;">${escapeHtmlServer(reviewText)}</div>
                <div style="padding:0 24px 26px;text-align:center;">
                  <a href="${escapeHtmlServer(googleUrl)}" style="background:#f97316;color:#0b0c10;font-weight:800;padding:14px 28px;border-radius:8px;text-decoration:none;letter-spacing:1px;">⭐ LÄMNA OMDÖME PÅ GOOGLE</a>
                </div>
              </div>
            </div>`;
          const sent = sendSingleEmail(to, `Tack för körningen – lämna ett omdöme på Google${name ? " (" + name + ")" : ""}`, html, fromEmail);
          writeDebugLog("INFO", "REVIEW_REQUEST", `Recensionsförfrågan mejlad till ${to}`);
          sendJson(res, 200, { ok: true, sent: Boolean(sent), to }, true);
          return;
        }

        // 11) GÄSTFOTO: moderera (godkänn → gallerimapp / avvisa / radera godkänd)
        if (act === "gastfoto_moderate") {
          const filename = path.basename(String(body.filename || ""));
          const modAction = String(body.modAction || "");
          const meta = guestMetaList();
          const idx = meta.findIndex((m) => m.filename === filename);
          if (idx < 0) {
            sendJson(res, 404, { ok: false, error: "Hittar inte fotot." }, true);
            return;
          }
          const pendingPath = path.join(GASTFOTO_PENDING_DIR, filename);
          const outDir = path.join(ROOT, "bilder", "galleri", "gastfoton");
          if (modAction === "approve") {
            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
            if (fs.existsSync(pendingPath)) fs.renameSync(pendingPath, path.join(outDir, filename));
            meta[idx].status = "approved";
            meta[idx].approvedAt = formatSvDate(Date.now());
            // Säkerställ att gallerimappen "Gästfoton" finns med i evenemangsmapparna
            const galMeta = loadJson(FOLDERS_META_FILE, []);
            if (!galMeta.some((m) => m.slug === "gastfoton")) {
              galMeta.unshift({
                slug: "gastfoton",
                name: "Gästfoton via QR",
                date: "Löpande",
                description: "Modererade foton som gäster laddat upp via QR-koden i limousinen."
              });
              saveJson(FOLDERS_META_FILE, galMeta);
            }
            writeDebugLog("INFO", "GASTFOTO", `Gästfoto godkänt och publicerat: ${filename}`);
          } else if (modAction === "reject" || modAction === "delete") {
            if (fs.existsSync(pendingPath)) fs.unlinkSync(pendingPath);
            const approvedPath = path.join(outDir, filename);
            if (modAction === "delete" && fs.existsSync(approvedPath)) fs.unlinkSync(approvedPath);
            meta.splice(idx, 1);
            writeDebugLog(modAction === "delete" ? "MEDIA" : "INFO", "GASTFOTO", `Gästfoto ${modAction === "delete" ? "raderat" : "avvisat"}: ${filename}`);
          } else {
            sendJson(res, 400, { ok: false, error: "Okänd modereringsåtgärd." }, true);
            return;
          }
          saveJson(GASTFOTO_META_FILE, meta);
          const gal = await buildGalleryAndFoldersCache();
          sendJson(res, 200, { ok: true, meta: meta[idx] || null, folders: gal.folders, images: gal.items }, true);
          return;
        }

        // 12) BW Bot: enda aviseringskanalen (SMS/Telegram borttagna)
        if (act === "send_test_alert") {
          // Bakåtkompatibel teståtgärd: bekräftar att BW Bot-feeden svarar för inloggad admin
          const feed = {
            dueReminders: getDueReminders(Date.now()),
            serverTime: new Date().toISOString()
          };
          writeDebugLog("INFO", "BW_BOT_TEST", "BW Bot-feed testad från kontrollpanelen");
          sendJson(res, 200, { ok: true, bot: "BW Bot", feed }, true);
          return;
        }

        sendJson(res, 400, { ok: false, error: "Okänd åtgärd" }, true);
      });
      return;
    }
  }

  // 8. OFFERT-API
  if (req.method === "POST" && pathname === "/api/offert") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const cfg = loadJson(SETTINGS_FILE, {});
        const recipient = String(cfg.contactEmail || "bokning@backstagewheels.se").trim();
        const existing = loadJson(QUOTES_FILE, []);
        existing.unshift({ receivedAt: formatSvDate(Date.now()), recipient, ...data });
        saveJson(QUOTES_FILE, existing);
        if (data.subscribeNewsletter && data.epost) {
          upsertSubscriberRecord({
            email: data.epost,
            name: data.namn || "",
            source: "Offertförfrågan"
          });
        }
        // Bekräftelse till kunden på valt språk (sv/en/de) (#10)
        sendQuoteConfirmation(data);
        writeDebugLog("INFO", "QUOTE", `Ny offertförfrågan från ${data.namn || "kund"} (${data.datum || "-"}) → ${recipient}`);
        sendJson(res, 200, { ok: true, recipient });
      } catch (_e) {
        sendJson(res, 400, { ok: false });
      }
    });
    return;
  }

  // 8B. PUBLIKA RECENSIONER (Google-omdömen-insamling)
  if (req.method === "GET" && pathname === "/api/reviews") {
    const cfg = loadJson(SETTINGS_FILE, {});
    const reviews = loadJson(REVIEWS_FILE, [])
      .filter((r) => r && r.status !== "hidden")
      .slice(0, 24);
    sendJson(res, 200, {
      ok: true,
      reviews,
      googleReviewUrl: String(cfg.googleReviewUrl || "").trim()
    });
    return;
  }

  // 8C. GÄSTFOTO VIA QR — publika endpoints (modererat fotoläge)
  if (pathname === "/api/gastfoto") {
    if (req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        photos: approvedGuestPhotos().map((m) => ({
          filename: m.filename,
          url: `bilder/galleri/gastfoton/${encodeURIComponent(m.filename)}`,
          name: m.name || "",
          caption: m.caption || "",
          approvedAt: m.approvedAt || ""
        }))
      });
      return;
    }
    if (req.method === "POST") {
      let body = "";
      req.on("data", (c) => {
        body += c;
        if (body.length > GASTFOTO_MAX_BYTES * 1.4) req.destroy();
      });
      req.on("end", () => {
        try {
          if (!guestUploadAllowed(req)) {
            sendJson(res, 429, { ok: false, error: "Daglig uppladdningsgräns nådd. Försök igen imorgon." });
            return;
          }
          const data = JSON.parse(body || "{}");
          const imgBuf = decodeDataUrlImage(data.imageDataUrl);
          const imgType = imgBuf ? detectGuestImageType(imgBuf) : null;
          if (!imgBuf || !imgType || imgBuf.length > GASTFOTO_MAX_BYTES) {
            sendJson(res, 400, { ok: false, error: "Ogiltig bild ( JPG/PNG/WebP, max 8 MB)." });
            return;
          }
          if (!fs.existsSync(GASTFOTO_PENDING_DIR)) fs.mkdirSync(GASTFOTO_PENDING_DIR, { recursive: true });
          const id = "gf-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex");
          const filename = `${id}.${imgType}`;
          fs.writeFileSync(path.join(GASTFOTO_PENDING_DIR, filename), imgBuf);
          const meta = guestMetaList();
          meta.unshift({
            id,
            filename,
            status: "pending",
            name: String(data.name || "").trim().slice(0, 60),
            caption: String(data.caption || "").trim().slice(0, 140),
            receivedAt: formatSvDate(Date.now()),
            receivedAtIso: new Date().toISOString(),
            bytes: imgBuf.length
          });
          // Håll metastacken rimlig (max 500 poster)
          if (meta.length > 500) meta.length = 500;
          saveJson(GASTFOTO_META_FILE, meta);
          guestUploadTick(req);
          writeDebugLog("INFO", "GASTFOTO", `Nytt gästfoto inkommet (${imgType}, ${Math.round(imgBuf.length / 1024)} kB) – väntar på granskning.`);
          sendJson(res, 200, { ok: true, id, message: "Tack! Bilden granskas innan publicering." });
        } catch (_e) {
          sendJson(res, 400, { ok: false, error: "Kunde inte läsa uppladdningen." });
        }
      });
      return;
    }
    sendJson(res, 405, { ok: false, error: "Metod ej tillåten." });
    return;
  }

  // 8D. QR-KOD SOM PEKAR PÅ GÄSTFOTO-SIDAN (PNG, 100% JavaScript)
  if (req.method === "GET" && pathname === "/api/gastfoto-qr") {
    const host = String(req.headers.host || "localhost").split(":")[0];
    const proto = String(req.headers["x-forwarded-proto"] || "http");
    const target = `${proto}://${host}/gastfoto`;
    const outPath = path.join(CACHE_DIR, "qr-gastfoto.png");
    const targetPath = path.join(CACHE_DIR, "qr-gastfoto.target.txt");
    let currentTarget = "";
    try {
      if (fs.existsSync(targetPath)) currentTarget = fs.readFileSync(targetPath, "utf8").trim();
    } catch (_e) {}
    if (currentTarget !== target || !fs.existsSync(outPath)) {
      if (await generateQrPng(target, outPath)) {
        try {
          fs.writeFileSync(targetPath, target, "utf8");
        } catch (_e) {}
      }
    }
    if (fs.existsSync(outPath)) {
      const stat = fs.statSync(outPath);
      res.writeHead(200, { "Content-Type": "image/png", "Content-Length": stat.size, "Cache-Control": "no-cache" });
      fs.createReadStream(outPath).pipe(res);
    } else {
      sendJson(res, 404, { ok: false, error: "QR kunde inte genereras (npm-paketet qrcode saknas). Använd länken som text.", url: target });
    }
    return;
  }

  // 9. STATISKA FILER (med HTTP 206 Range-stöd för videoklipp!)
  let filePath = pathname === "/" ? "/index.html" : pathname;
  const resolved = path.normalize(path.join(ROOT, filePath));
  if (!resolved.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    const ext = path.extname(resolved).toLowerCase();
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    const stat = fs.statSync(resolved);
    setSecurityHeaders(res, resolved.endsWith("bw-admin.html"));

    if (VIDEO_EXT_REGEX.test(ext) && req.headers.range) {
      const parts = req.headers.range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      if (start >= stat.size || end >= stat.size) {
        res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": mime
      });
      fs.createReadStream(resolved, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      "Content-Type": mime,
      "Content-Length": stat.size,
      "Accept-Ranges": VIDEO_EXT_REGEX.test(ext) ? "bytes" : "none"
    });
    fs.createReadStream(resolved).pipe(res);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 Hittades inte");
});

ensureDirs();
runLogRetention(); // R10: arkivera gårdagens loggar & radera arkiv > 7 dagar vid start + varje timme
setInterval(runLogRetention, 60 * 60 * 1000);
writeDebugLog("INFO", "BOOT", "Backstage Wheels säker server startad (AES-256 valv, Kalender-synk, Evenemangsmappar).");
startFollowUpLoop();

server.listen(PORT, "0.0.0.0", () => {
  buildGalleryAndFoldersCache().catch(() => {}); // förvärm galleri-cache (100% JS)
  console.log(`Backstage Wheels server körs på http://0.0.0.0:${PORT} — mediaoptimering: ${sharpLib ? "sharp (ren JS)" : "reservläge, originalfiler skickas oförändrade"}`);
});
