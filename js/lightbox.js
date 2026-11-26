/**
 * ============================================================================
 * BACKSTAGE WHEELS — HELSKÄRMSVISARE FÖR BILDER & VIDEOKLIPP (js/lightbox.js)
 * ============================================================================
 * - Stödjer både bilder och videoklipp (.mp4, .webm, .mov)
 * - Låter besökaren bläddra sömlöst genom ALLA bilder & videoklipp på sidan
 *   med piltangenter (←/→), touch-swipe på mobil, bildspel eller filmremsa
 * - Zoom-stöd för bilder (dubbelklick / zoomknapp / Z)
 * - Skriver inte ut ordet "Lightbox" någonstans i gränssnittet
 */

(function () {
  "use strict";

  const VIDEO_REGEX = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i;

  const state = {
    isOpen: false,
    items: [],
    currentIndex: 0,
    isZoomed: false,
    slideshowTimer: null,
    touchStartX: 0,
    touchStartY: 0
  };

  let overlayEl = null;
  let mainImgEl = null;
  let mainVideoEl = null;
  let stageEl = null;
  let captionEl = null;
  let metaEl = null;
  let counterEl = null;
  let thumbsEl = null;
  let prevBtnEl = null;
  let nextBtnEl = null;
  let zoomBtnEl = null;
  let playBtnEl = null;
  let loaderEl = null;

  function isVideoUrl(src, explicitType) {
    if (explicitType === "video") return true;
    if (explicitType === "image") return false;
    return VIDEO_REGEX.test(String(src || ""));
  }

  function buildViewerDOM() {
    if (document.getElementById("bsw-lightbox")) return;

    const wrapper = document.createElement("div");
    wrapper.id = "bsw-lightbox";
    wrapper.className = "bsw-lightbox";
    wrapper.setAttribute("role", "dialog");
    wrapper.setAttribute("aria-modal", "true");
    wrapper.setAttribute("aria-label", "Mediavisare i helskärm");
    wrapper.setAttribute("aria-hidden", "true");

    wrapper.innerHTML = `
      <div class="bsw-lb-backdrop" data-lb-close></div>

      <header class="bsw-lb-topbar">
        <div class="bsw-lb-counter-wrap">
          <span class="bsw-lb-rock-tag">BACKSTAGE WHEELS</span>
          <span class="bsw-lb-counter" id="bsw-lb-counter">1 / 1</span>
          <span class="bsw-lb-meta" id="bsw-lb-meta"></span>
        </div>
        <div class="bsw-lb-actions">
          <button type="button" class="bsw-lb-icon-btn" id="bsw-lb-play" title="Starta/pausa bildspel" aria-label="Starta eller pausa bildspel">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4"></polygon>
            </svg>
          </button>
          <button type="button" class="bsw-lb-icon-btn" id="bsw-lb-zoom" title="Zooma in/ut (Z)" aria-label="Zooma in eller ut">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <a class="bsw-lb-icon-btn" id="bsw-lb-open-orig" href="#" target="_blank" rel="noopener" title="Öppna fil i ny flik" aria-label="Öppna fil i ny flik">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
          <button type="button" class="bsw-lb-icon-btn bsw-lb-close-btn" data-lb-close title="Stäng (Esc)" aria-label="Stäng visare">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      <div class="bsw-lb-stage" id="bsw-lb-stage">
        <button type="button" class="bsw-lb-nav bsw-lb-prev" id="bsw-lb-prev" aria-label="Föregående" title="Föregående (←)">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div class="bsw-lb-figure-wrap" data-lb-stage-bg>
          <div class="bsw-lb-loader" id="bsw-lb-loader"></div>
          <img id="bsw-lb-img" class="bsw-lb-img" src="" alt="" draggable="false" />
          <video
            id="bsw-lb-video"
            class="bsw-lb-video"
            controls
            playsinline
            preload="metadata"
            hidden
          ></video>
        </div>

        <button type="button" class="bsw-lb-nav bsw-lb-next" id="bsw-lb-next" aria-label="Nästa" title="Nästa (→)">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <footer class="bsw-lb-footer">
        <div class="bsw-lb-caption" id="bsw-lb-caption"></div>
        <div class="bsw-lb-thumbs" id="bsw-lb-thumbs" role="tablist" aria-label="Bläddra bland alla bilder och klipp"></div>
      </footer>
    `;

    document.body.appendChild(wrapper);

    overlayEl = wrapper;
    mainImgEl = document.getElementById("bsw-lb-img");
    mainVideoEl = document.getElementById("bsw-lb-video");
    stageEl = document.getElementById("bsw-lb-stage");
    captionEl = document.getElementById("bsw-lb-caption");
    metaEl = document.getElementById("bsw-lb-meta");
    counterEl = document.getElementById("bsw-lb-counter");
    thumbsEl = document.getElementById("bsw-lb-thumbs");
    prevBtnEl = document.getElementById("bsw-lb-prev");
    nextBtnEl = document.getElementById("bsw-lb-next");
    zoomBtnEl = document.getElementById("bsw-lb-zoom");
    playBtnEl = document.getElementById("bsw-lb-play");
    loaderEl = document.getElementById("bsw-lb-loader");

    wrapper.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-lb-close") || e.target.hasAttribute("data-lb-stage-bg")) {
        closeViewer();
      }
    });

    prevBtnEl.addEventListener("click", function (e) {
      e.stopPropagation();
      stopSlideshow();
      step(-1);
    });

    nextBtnEl.addEventListener("click", function (e) {
      e.stopPropagation();
      stopSlideshow();
      step(1);
    });

    zoomBtnEl.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleZoom();
    });

    playBtnEl.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleSlideshow();
    });

    mainImgEl.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleZoom();
    });

    mainImgEl.addEventListener("load", function () {
      loaderEl.classList.remove("is-active");
      mainImgEl.classList.add("is-loaded");
      if (mainImgEl.naturalWidth && mainImgEl.naturalHeight) {
        metaEl.textContent = `${mainImgEl.naturalWidth} × ${mainImgEl.naturalHeight} px`;
      }
    });

    mainVideoEl.addEventListener("loadedmetadata", function () {
      loaderEl.classList.remove("is-active");
      if (mainVideoEl.videoWidth && mainVideoEl.videoHeight) {
        const dur = mainVideoEl.duration ? ` · ${Math.round(mainVideoEl.duration)}s` : "";
        metaEl.textContent = `VIDEO ${mainVideoEl.videoWidth}×${mainVideoEl.videoHeight}${dur}`;
      } else {
        metaEl.textContent = "VIDEO";
      }
    });

    // Touch-swipe på mobil och surfplatta
    stageEl.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches.length === 1) {
          state.touchStartX = e.touches[0].clientX;
          state.touchStartY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );

    stageEl.addEventListener(
      "touchend",
      function (e) {
        if (state.isZoomed || !e.changedTouches.length) return;
        const dx = e.changedTouches[0].clientX - state.touchStartX;
        const dy = e.changedTouches[0].clientY - state.touchStartY;
        if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.25) {
          stopSlideshow();
          step(dx < 0 ? 1 : -1);
        }
      },
      { passive: true }
    );

    document.addEventListener("keydown", function (e) {
      if (!state.isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeViewer();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stopSlideshow();
        step(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stopSlideshow();
        step(-1);
      } else if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        toggleZoom();
      }
    });
  }

  function stopVideoIfPlaying() {
    if (!mainVideoEl) return;
    try {
      mainVideoEl.pause();
      mainVideoEl.removeAttribute("src");
      mainVideoEl.load();
    } catch (_e) {}
  }

  function setZoom(zoomed) {
    const item = state.items[state.currentIndex];
    if (item && item.isVideo) {
      state.isZoomed = false;
      zoomBtnEl.classList.remove("is-active");
      return;
    }
    state.isZoomed = zoomed;
    if (!mainImgEl) return;
    mainImgEl.classList.toggle("is-zoomed", zoomed);
    zoomBtnEl.classList.toggle("is-active", zoomed);
  }

  function toggleZoom() {
    setZoom(!state.isZoomed);
  }

  function stopSlideshow() {
    if (state.slideshowTimer) {
      clearInterval(state.slideshowTimer);
      state.slideshowTimer = null;
    }
    if (playBtnEl) playBtnEl.classList.remove("is-active");
  }

  function toggleSlideshow() {
    if (state.slideshowTimer) {
      stopSlideshow();
      return;
    }
    if (state.items.length <= 1) return;
    playBtnEl.classList.add("is-active");
    state.slideshowTimer = setInterval(() => {
      if (!mainVideoEl.hidden && !mainVideoEl.paused && !mainVideoEl.ended) {
        return; // Vänta tills videoklippet spelat klart
      }
      step(1);
    }, 3800);
  }

  function renderSlide() {
    if (!state.items.length) return;
    const item = state.items[state.currentIndex];
    setZoom(false);
    stopVideoIfPlaying();

    metaEl.textContent = "";
    const openOrigEl = document.getElementById("bsw-lb-open-orig");
    if (openOrigEl) openOrigEl.href = item.src;

    captionEl.textContent = item.caption || "";
    counterEl.textContent = `${state.currentIndex + 1} / ${state.items.length}`;

    if (item.isVideo) {
      mainImgEl.hidden = true;
      mainImgEl.classList.remove("is-loaded");
      zoomBtnEl.style.display = "none";

      loaderEl.classList.add("is-active");
      mainVideoEl.hidden = false;
      if (item.thumb && !isVideoUrl(item.thumb)) {
        mainVideoEl.poster = item.thumb;
      } else {
        mainVideoEl.removeAttribute("poster");
      }
      mainVideoEl.src = item.src;
      mainVideoEl.play().catch(() => {
        loaderEl.classList.remove("is-active");
      });
    } else {
      mainVideoEl.hidden = true;
      mainImgEl.hidden = false;
      zoomBtnEl.style.display = "grid";

      loaderEl.classList.add("is-active");
      mainImgEl.classList.remove("is-loaded");
      mainImgEl.src = item.src;
      mainImgEl.alt = item.caption || "Backstage Wheels";
    }

    const hasMultiple = state.items.length > 1;
    prevBtnEl.style.display = hasMultiple ? "flex" : "none";
    nextBtnEl.style.display = hasMultiple ? "flex" : "none";
    playBtnEl.style.display = hasMultiple ? "grid" : "none";
    thumbsEl.style.display = hasMultiple ? "flex" : "none";

    const thumbButtons = thumbsEl.querySelectorAll(".bsw-lb-thumb");
    thumbButtons.forEach((btn, idx) => {
      const active = idx === state.currentIndex;
      btn.classList.toggle("is-active", active);
      if (active) {
        btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    });
  }

  function renderThumbs() {
    thumbsEl.innerHTML = "";
    if (state.items.length <= 1) return;

    state.items.forEach((item, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bsw-lb-thumb" + (idx === state.currentIndex ? " is-active" : "");
      btn.setAttribute("aria-label", `Visa nr ${idx + 1}`);

      if (item.isVideo && (!item.thumb || isVideoUrl(item.thumb))) {
        btn.innerHTML = `
          <span class="bsw-lb-vid-thumb">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
          </span>`;
      } else {
        const img = document.createElement("img");
        img.src = item.thumb || item.src;
        img.alt = item.caption || `Media ${idx + 1}`;
        img.loading = "lazy";
        btn.appendChild(img);
        if (item.isVideo) {
          const badge = document.createElement("span");
          badge.className = "bsw-lb-vid-badge";
          badge.textContent = "▶";
          btn.appendChild(badge);
        }
      }

      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        stopSlideshow();
        state.currentIndex = idx;
        renderSlide();
      });
      thumbsEl.appendChild(btn);
    });
  }

  function step(delta) {
    if (state.items.length <= 1) return;
    state.currentIndex = (state.currentIndex + delta + state.items.length) % state.items.length;
    renderSlide();
  }

  function openViewer(items, startIndex) {
    buildViewerDOM();
    if (!items || !items.length) return;

    state.items = items.map((it) => ({
      src: it.src,
      thumb: it.thumb || it.src,
      caption: it.caption || "",
      isVideo: Boolean(it.isVideo || isVideoUrl(it.src, it.type))
    }));
    state.currentIndex = Math.max(0, Math.min(startIndex || 0, state.items.length - 1));
    state.isOpen = true;

    renderThumbs();
    renderSlide();

    overlayEl.classList.add("is-open");
    overlayEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("bsw-lb-lock");
  }

  function closeViewer() {
    if (!overlayEl) return;
    stopSlideshow();
    stopVideoIfPlaying();
    state.isOpen = false;
    setZoom(false);
    overlayEl.classList.remove("is-open");
    overlayEl.setAttribute("aria-hidden", "true");
    document.body.classList.remove("bsw-lb-lock");
  }

  // Samlar in ALLA unika bilder & videoklipp på hela sajten så användaren kan
  // bläddra igenom rubbet oavsett vilken bild man klickade på!
  function collectAllSiteMedia(clickedTrigger) {
    const clickedGroup = clickedTrigger.getAttribute("data-lightbox-group") || "";
    const allDomTriggers = Array.from(document.querySelectorAll("[data-lightbox-src]")).filter(
      (el) => !el.closest(".is-hidden-filter")
    );

    // Lägg den aktuella sektionens bilder först, följt av övriga unika bilder/videoklipp på sajten
    const sameGroup = [];
    const otherGroups = [];
    allDomTriggers.forEach((el) => {
      if (clickedGroup && el.getAttribute("data-lightbox-group") === clickedGroup) {
        sameGroup.push(el);
      } else {
        otherGroups.push(el);
      }
    });

    const orderedEls = [...sameGroup, ...otherGroups];
    const seenSrc = new Set();
    const items = [];
    let startIdx = 0;

    orderedEls.forEach((el) => {
      const src = el.getAttribute("data-lightbox-src");
      if (!src) return;
      const mediaType = el.getAttribute("data-media-type") || "";
      const thumb = el.getAttribute("data-lightbox-thumb") || src;
      const caption =
        el.getAttribute("data-lightbox-caption") ||
        (el.querySelector("img") ? el.querySelector("img").alt : "");

      if (el === clickedTrigger) {
        // Om denna src redan lades till tidigare, peka på det befintliga indexet
        const existingIdx = items.findIndex((i) => i.src === src);
        if (existingIdx !== -1) {
          startIdx = existingIdx;
          return;
        }
        startIdx = items.length;
      } else if (seenSrc.has(src)) {
        return;
      }

      seenSrc.add(src);
      items.push({
        src,
        thumb,
        caption,
        type: mediaType,
        isVideo: isVideoUrl(src, mediaType)
      });
    });

    // Lägg även till eventuella galleriobjekt från minnet som ännu inte renderats i aktivt filter
    if (Array.isArray(window.BACKSTAGE_ALL_MEDIA)) {
      window.BACKSTAGE_ALL_MEDIA.forEach((m) => {
        if (m && m.src && !seenSrc.has(m.src)) {
          seenSrc.add(m.src);
          items.push({
            src: m.src,
            thumb: m.thumb || m.src,
            caption: m.title || m.caption || "",
            isVideo: isVideoUrl(m.src, m.type)
          });
        }
      });
    }

    return { items, startIdx };
  }

  function setupGlobalDelegation() {
    document.addEventListener("click", function (e) {
      const trigger = e.target.closest("[data-lightbox-src]");
      if (!trigger) return;
      if (e.target.closest("[data-no-lightbox]")) return;

      e.preventDefault();
      const { items, startIdx } = collectAllSiteMedia(trigger);
      if (items.length) openViewer(items, startIdx);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      const trigger = e.target.closest("[data-lightbox-src]");
      if (!trigger || e.target.tagName === "BUTTON" || e.target.tagName === "A") return;
      e.preventDefault();
      const { items, startIdx } = collectAllSiteMedia(trigger);
      if (items.length) openViewer(items, startIdx);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      buildViewerDOM();
      setupGlobalDelegation();
    });
  } else {
    buildViewerDOM();
    setupGlobalDelegation();
  }

  window.BackstageLightbox = {
    open: openViewer,
    close: closeViewer,
    isVideoUrl: isVideoUrl
  };
})();
