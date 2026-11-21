(() => {
  // ---- Settings: change these three lines to taste -----------------------
  const SOURCE_LANG = "fr"; // language of the captions you turn on
  const TARGET_LANG = "en"; // language shown in the box
  const POLL_MS = 250;      // how often the on-screen caption is checked
  // ------------------------------------------------------------------------

  const CLEAR_AFTER_MS = 1500;   // blank the box this long after captions vanish
  const RETRY_AFTER_MS = 3000;   // pause after a failed translation
  const IDLE_TEXT = "Waiting for captions (press C)";

  let box = null;
  let lastSeen = "";
  let busy = false;
  let emptySince = 0;
  let pausedUntil = 0;
  let localTranslator = null;
  const cache = new Map();

  // ---- The box -----------------------------------------------------------

  function setText(text) {
    if (!box) return;
    box.textContent = text || IDLE_TEXT;
    box.classList.toggle("ctb-idle", !text);
  }

  function ensureBox() {
    const player = document.querySelector("#movie_player");
    if (!player) return false;
    if (!box) {
      box = document.createElement("div");
      box.id = "ctb-box";
      makeDraggable(box);
      setText("");
      chrome.storage.local.get("ctbPos").then(({ ctbPos }) => {
        if (ctbPos) placeAt(ctbPos.x, ctbPos.y);
      }).catch(() => {});
    }
    // Living inside the player keeps the box visible in fullscreen.
    if (box.parentElement !== player) player.appendChild(box);
    return true;
  }

  // x and y are fractions (0..1) of the player's width and height.
  function placeAt(x, y) {
    box.style.transform = "none";
    box.style.left = (x * 100).toFixed(2) + "%";
    box.style.top = (y * 100).toFixed(2) + "%";
  }

  function makeDraggable(el) {
    let start = null;

    el.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      const player = el.parentElement.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      start = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, player };
      el.classList.add("ctb-dragging");
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener("mousemove", (e) => {
      if (!start) return;
      const p = start.player;
      const x = Math.min(Math.max((e.clientX - start.dx - p.left) / p.width, 0), 0.95);
      const y = Math.min(Math.max((e.clientY - start.dy - p.top) / p.height, 0), 0.95);
      placeAt(x, y);
      start.last = { x, y };
    }, true);

    document.addEventListener("mouseup", () => {
      if (!start) return;
      if (start.last) chrome.storage.local.set({ ctbPos: start.last }).catch(() => {});
      start = null;
      el.classList.remove("ctb-dragging");
    }, true);

    // Stop clicks on the box from pausing the video. A click is also the
    // user gesture Chrome needs to download its on-device translation model.
    for (const type of ["click", "dblclick"]) {
      el.addEventListener(type, (e) => {
        e.stopPropagation();
        initLocalTranslator(true);
      });
    }
  }

  // ---- Reading the caption that is on screen ------------------------------

  function readCaption() {
    const player = document.querySelector("#movie_player");
    if (!player) return "";
    let parts = [...player.querySelectorAll(".caption-window .caption-visual-line")];
    if (!parts.length) parts = [...player.querySelectorAll(".ytp-caption-segment")];
    return parts.map((n) => n.textContent).join(" ").replace(/\s+/g, " ").trim();
  }

  // ---- Translation ---------------------------------------------------------

  // Chrome's built-in on-device translator, when present: no network, no
  // rate limits. Used only once its language model is on the machine.
  async function initLocalTranslator(fromGesture) {
    if (localTranslator || !("Translator" in self)) return;
    try {
      const pair = { sourceLanguage: SOURCE_LANG, targetLanguage: TARGET_LANG };
      const state = await self.Translator.availability(pair);
      if (state === "available" || (fromGesture && state !== "unavailable")) {
        localTranslator = await self.Translator.create(pair);
      }
    } catch (_) {
      // Fall back to the network translator.
    }
  }

  async function translate(text) {
    if (cache.has(text)) return cache.get(text);

    let out = null;
    if (localTranslator) {
      try { out = await localTranslator.translate(text); } catch (_) { out = null; }
    }
    if (out == null) {
      const res = await chrome.runtime.sendMessage({
        type: "translate", text, sl: SOURCE_LANG, tl: TARGET_LANG,
      });
      if (!res || !res.ok) throw new Error((res && res.error) || "translation failed");
      out = res.text;
    }

    cache.set(text, out);
    if (cache.size > 500) cache.delete(cache.keys().next().value);
    return out;
  }

  // ---- Main loop -----------------------------------------------------------

  async function tick() {
    if (!ensureBox()) return;

    const text = readCaption();
    if (!text) {
      if (!emptySince) emptySince = Date.now();
      else if (Date.now() - emptySince > CLEAR_AFTER_MS && lastSeen) {
        lastSeen = "";
        setText("");
      }
      return;
    }
    emptySince = 0;

    // One request at a time; if the caption moved on meanwhile, the next
    // tick picks up the newest text.
    if (text === lastSeen || busy || Date.now() < pausedUntil) return;

    busy = true;
    lastSeen = text;
    try {
      setText(await translate(text));
    } catch (_) {
      lastSeen = "";
      pausedUntil = Date.now() + RETRY_AFTER_MS;
    } finally {
      busy = false;
    }
  }

  initLocalTranslator(false);
  setInterval(tick, POLL_MS);
})();
