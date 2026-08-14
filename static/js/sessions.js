// ---------------------------------------------------------------------------
// /sessions/ gate. This is a SOFT gate: it hashes the entered passphrase and
// compares it to a hash baked into the page, then fetches episode data only
// after a match. It stops casual visitors and search engines from stumbling
// onto the content — it does NOT stop someone who opens devtools and reads
// /data/episodes.json or the hash directly. See the README before trusting
// this with anything that actually needs to stay private.
// ---------------------------------------------------------------------------
(function sessionsGate() {
  const root = document.querySelector(".sessions-page");
  if (!root) return;

  const expectedHash = root.dataset.hash;
  const gate = document.getElementById("gate");
  const input = document.getElementById("gate-input");
  const submit = document.getElementById("gate-submit");
  const error = document.getElementById("gate-error");
  const episodesEl = document.getElementById("episodes");
  const grid = document.getElementById("episode-grid");

  if (!gate || !input || !submit || !error || !episodesEl || !grid) return;

  let isChecking = false;

  function setError(message) {
    error.hidden = false;
    error.textContent = message;
    error.setAttribute("aria-live", "polite");
  }

  function safeMediaUrl(value) {
    if (typeof value !== "string") return "";
    try {
      const url = new URL(value, window.location.href);
      if (["http:", "https:", "blob:", "data:"].includes(url.protocol)) {
        return url.href;
      }
      if (value.startsWith("/")) {
        return url.href;
      }
    } catch (e) {
      return "";
    }
    return "";
  }

  async function sha256(text) {
    if (!window.crypto || !crypto.subtle || typeof crypto.subtle.digest !== "function") {
      throw new Error("This browser does not support the Web Crypto API.");
    }

    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function renderCard(ep) {
    const card = document.createElement("div");
    card.className = "episode-card";

    const thumb = document.createElement("div");
    thumb.className = "episode-thumb";
    if (ep.thumb) {
      const thumbUrl = safeMediaUrl(ep.thumb);
      if (thumbUrl) {
        const img = document.createElement("img");
        img.src = thumbUrl;
        img.alt = ep.title || "Episode thumbnail";
        thumb.appendChild(img);
      } else {
        thumb.textContent = String(ep.thumb);
      }
    } else {
      thumb.textContent = "🎬";
    }

    const title = document.createElement("h3");
    title.textContent = ep.title || "Untitled episode";

    const meta = document.createElement("div");
    meta.className = "episode-meta";
    meta.textContent = [ep.date, ep.duration].filter(Boolean).join(" · ");

    const desc = document.createElement("div");
    desc.className = "episode-desc";
    desc.textContent = ep.description || "";

    const media = ep.type === "youtube"
      ? document.createElement("iframe")
      : ep.type === "video"
        ? document.createElement("video")
        : document.createElement("audio");

    if (ep.type === "youtube") {
      media.loading = "lazy";
      media.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      media.setAttribute("allow", "accelerometer; encrypted-media; picture-in-picture");
      media.setAttribute("allowfullscreen", "true");
      media.setAttribute("title", ep.title || "Episode video");
    } else {
      media.setAttribute("controls", "true");
      media.setAttribute("preload", "none");
    }

    const mediaSrc = safeMediaUrl(ep.src);
    if (mediaSrc) {
      media.src = mediaSrc;
    }

    card.append(thumb, title, meta, desc, media);
    return card;
  }

  async function reveal() {
    if (!expectedHash) {
      gate.hidden = true;
      setError("The sessions passphrase is not configured for this page.");
      return;
    }

    gate.hidden = true;
    episodesEl.hidden = false;
    if (grid.dataset.loaded) return;

    try {
      const res = await fetch("/data/episodes.json");
      if (!res.ok) {
        throw new Error(`Failed to load episodes: ${res.status}`);
      }

      const episodes = await res.json();
      if (!Array.isArray(episodes)) {
        throw new Error("Episode data is not an array.");
      }

      grid.replaceChildren(...episodes.map(renderCard));
      grid.dataset.loaded = "1";
    } catch (e) {
      console.error("Unable to load episodes", e);
      grid.replaceChildren();
      const message = document.createElement("p");
      message.textContent = "couldn't load episodes right now.";
      grid.appendChild(message);
    }
  }

  async function tryUnlock() {
    if (!expectedHash) {
      setError("The sessions passphrase is not configured for this page.");
      return;
    }

    if (isChecking) return;

    isChecking = true;
    submit.disabled = true;
    input.disabled = true;
    error.hidden = true;

    try {
      const hash = await sha256(input.value.trim());
      if (hash === expectedHash) {
        sessionStorage.setItem("sessions-unlocked", "1");
        await reveal();
      } else {
        setError("That passphrase doesn't match.");
        input.value = "";
      }
    } catch (e) {
      console.error("Sessions gate check failed", e);
      setError("This browser can't verify the passphrase. Try a modern browser with Web Crypto enabled.");
      input.value = "";
    } finally {
      isChecking = false;
      submit.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  submit.addEventListener("click", () => {
    tryUnlock();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      tryUnlock();
    }
  });

  if (sessionStorage.getItem("sessions-unlocked") === "1") {
    reveal();
  }
})();
