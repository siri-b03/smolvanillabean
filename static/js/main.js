// visitor counter — persistent and desktop-friendly
(function counter() {
  const counters = document.querySelectorAll(".counter");
  if (!counters.length) return;

  const key = "smolvanillabean-visits";

  try {
    const stored = Number.parseInt(localStorage.getItem(key) || "0", 10);
    const n = Number.isFinite(stored) && stored > 0 ? stored : 421;
    const next = n + 1;
    localStorage.setItem(key, String(next));

    counters.forEach((el) => {
      const digits = String(next).padStart(5, "0").split("");
      el.innerHTML = digits.map((d) => `<span>${d}</span>`).join("");
    });
  } catch (e) {
    counters.forEach((el) => {
      const digits = "4210".split("");
      el.innerHTML = digits.map((d) => `<span>${d}</span>`).join("");
    });
  }
})();

// bubble sparkle trail
(function sparkleTrail() {
  const symbols = ["✦", "✧", "♡", "✿", "☆", "☁", "✺"];
  let rafId = null;
  let latestEvent = null;

  function createSparkle(x, y) {
    const s = document.createElement("div");
    s.className = "sparkle";
    s.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.width = `${18 + Math.random() * 18}px`;
    s.style.height = `${18 + Math.random() * 18}px`;
    s.style.fontSize = `${11 + Math.random() * 7}px`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }

  function flush() {
    rafId = null;
    if (!latestEvent) return;

    createSparkle(
      latestEvent.clientX + (Math.random() * 12 - 6),
      latestEvent.clientY + (Math.random() * 12 - 6)
    );
    latestEvent = null;
  }

  document.addEventListener("pointermove", (event) => {
    latestEvent = event;
    if (rafId !== null) return;
    rafId = requestAnimationFrame(flush);
  });
})();

// interactive memory board and photobooth app
(function corkboardApp() {
  const board = document.getElementById("board");
  if (!board) return;

  const storageKey = board.dataset.storageKey || "smolvanillabean-memory-board";
  const noteForm = document.getElementById("corkboard-form");
  const labelInput = document.getElementById("note-label");
  const textInput = document.getElementById("note-text");
  const imageInput = document.getElementById("note-image");

  const defaultNotes = Array.from(board.querySelectorAll(".note")).map((note) => ({
    label: note.dataset.label || "you",
    text: note.dataset.text || note.textContent.trim(),
    style: note.dataset.style || "sky",
    rotate: Number.parseInt(note.dataset.rotate || "0", 10) || 0,
    image: note.dataset.image || "",
    createdAt: Date.now() + Math.random()
  }));

  function canUseRemoteStorage() {
    return Boolean(window.SiteSupabase && window.SiteSupabase.configured);
  }

  function readLocalNotes() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(saved) && saved.length) {
        return saved.map((item) => ({
          label: item.label === "polaroid" && item.image
            ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(Number(item.createdAt || Date.now()))
            : String(item.label || "you"),
          text: String(item.text || ""),
          style: String(item.style || "sky"),
          rotate: Number.parseFloat(item.rotate || "0") || 0,
          image: String(item.image || ""),
          source: String(item.source || (item.label === "polaroid" && item.image ? "photobooth" : "")),
          createdAt: Number(item.createdAt || Date.now())
        }));
      }
    } catch (error) {
      console.warn("Could not read local memory board.", error);
    }

    return defaultNotes;
  }

  function writeLocalNotes(notes) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(notes));
    } catch (error) {
      console.warn("Could not save memory board locally.", error);
    }
  }

  async function readNotes() {
    if (canUseRemoteStorage()) {
      try {
        const rows = await window.SiteSupabase.listMemories();
        if (rows.length) {
          return rows.map((item) => ({
            label: item.label || "you",
            text: item.text || "",
            style: item.style || "sky",
            rotate: Number(item.rotate || 0),
            image: item.image || "",
            source: item.source || "board",
            createdAt: item.createdAt || Date.now()
          }));
        }
      } catch (error) {
        console.warn("Could not load memory board from Supabase; using local data.", error);
      }
    }

    return readLocalNotes();
  }

  async function renderNotes() {
    const notes = await readNotes();
    board.innerHTML = "";

    notes.forEach((note) => {
      const item = document.createElement("article");
      item.className = `note note-${note.style || "sky"}`;
      item.style.transform = `rotate(${Number(note.rotate || 0)}deg)`;

      const tape = document.createElement("span");
      tape.className = "tape";
      item.appendChild(tape);

      const title = document.createElement("strong");
      title.textContent = note.label || "you";
      if (note.source === "photobooth") title.className = "note-timestamp";
      item.appendChild(title);

      if (note.image) {
        const photo = document.createElement("img");
        photo.src = note.image;
        photo.alt = `${note.label || "you"} memory`;
        photo.className = "note-photo";
        item.appendChild(photo);
      }

      if (note.text) {
        const text = document.createElement("p");
        text.textContent = note.text;
        item.appendChild(text);
      }

      board.appendChild(item);
    });
  }

  async function addNote(label, text, image) {
    const item = {
      label: label || "you",
      text: text || "",
      image: image || "",
      style: ["sky", "peach", "pink"][Math.floor(Math.random() * 3)],
      rotate: (Math.random() * 8 - 4).toFixed(1),
      createdAt: Date.now()
    };

    if (canUseRemoteStorage()) {
      try {
        let imagePath = null;
        if (item.image && item.image.startsWith("data:")) {
          const blob = await (await fetch(item.image)).blob();
          imagePath = await window.SiteSupabase.uploadImage(blob);
        }

        await window.SiteSupabase.submitMemory({
          label: item.label,
          text: item.text,
          imagePath,
          source: "board",
          style: item.style,
          rotate: Number(item.rotate)
        });
        return;
      } catch (error) {
        console.warn("Supabase memory upload failed; falling back to local storage.", error);
      }
    }

    const notes = readLocalNotes();
    notes.unshift(item);
    writeLocalNotes(notes.slice(0, 20));
    await renderNotes();
  }

  if (noteForm) {
    noteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const label = labelInput.value.trim() || "you";
      const text = textInput.value.trim();
      const file = imageInput.files && imageInput.files[0];

      if (!text && !file) {
        textInput.focus();
        return;
      }

      if (file) {
        const reader = new FileReader();
        reader.onload = async () => {
          await addNote(label, text, String(reader.result));
          noteForm.reset();
          await renderNotes();
        };
        reader.readAsDataURL(file);
        return;
      }

      await addNote(label, text, "");
      noteForm.reset();
      await renderNotes();
    });
  }

  renderNotes();
})();

(function photoboothApp() {
  const app = document.getElementById("photobooth-app");
  if (!app) return;

  const video = document.getElementById("photobooth-video");
  const canvas = document.getElementById("photobooth-canvas");
  const preview = document.getElementById("polaroid-preview");
  const previewImg = document.getElementById("polaroid-image");
  const captionInput = document.getElementById("polaroid-caption");
  const openCameraBtn = document.getElementById("photobooth-open");
  const captureBtn = document.getElementById("photobooth-capture");
  const downloadBtn = document.getElementById("photobooth-download");
  const sendBtn = document.getElementById("photobooth-send");
  const status = document.getElementById("photobooth-status");

  let stream = null;
  let currentDataUrl = "";
  const memoryKey = "smolvanillabean-memory-board";

  function setStatus(message) {
    if (!status) return;
    status.textContent = message;
  }

  async function startCamera() {
    if (!video) return;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      video.srcObject = stream;
      await video.play();
      setStatus("camera live");
    } catch (error) {
      console.error("Could not start camera", error);
      setStatus("camera unavailable");
    }
  }

  function captureImage() {
    if (!video || !canvas || !previewImg) return;
    if (!video.videoWidth || !video.videoHeight) return;

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    currentDataUrl = canvas.toDataURL("image/png");
    previewImg.src = currentDataUrl;
    preview.hidden = false;
    setStatus("photo ready");
  }

  async function saveImageToMemoryBoard() {
    if (!currentDataUrl) return;

    const capturedAt = Date.now();
    const entry = {
      label: new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(capturedAt),
      text: (captionInput && captionInput.value.trim()) || "captured in the booth ✨",
      image: currentDataUrl,
      style: "sky",
      rotate: (Math.random() * 7 - 3).toFixed(1),
      source: "photobooth",
      createdAt: capturedAt
    };

    if (window.SiteSupabase && window.SiteSupabase.configured) {
      try {
        const blob = await (await fetch(currentDataUrl)).blob();
        const imagePath = await window.SiteSupabase.uploadImage(blob);
        await window.SiteSupabase.submitMemory({
          label: entry.label,
          text: entry.text,
          imagePath,
          source: "photobooth",
          style: entry.style,
          rotate: Number(entry.rotate)
        });
        setStatus("sent to the memory board");
        return;
      } catch (error) {
        console.warn("Photobooth upload failed; falling back to local storage.", error);
      }
    }

    try {
      const existing = JSON.parse(localStorage.getItem(memoryKey) || "null");
      const notes = Array.isArray(existing) ? existing : [];
      notes.unshift(entry);
      localStorage.setItem(memoryKey, JSON.stringify(notes.slice(0, 20)));
      setStatus("sent to the memory board");
    } catch (error) {
      console.error("Could not save to memory board", error);
      setStatus("save failed");
    }
  }

  if (openCameraBtn) {
    openCameraBtn.addEventListener("click", startCamera);
  }

  if (captureBtn) {
    captureBtn.addEventListener("click", captureImage);
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      if (!currentDataUrl) return;
      const link = document.createElement("a");
      link.href = currentDataUrl;
      link.download = "smolvanillabean-polaroid.png";
      link.click();
      setStatus("downloaded");
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", saveImageToMemoryBoard);
  }

  if (preview) {
    preview.hidden = true;
  }

  if (captionInput) {
    captionInput.value = "captured in the booth ✨";
  }

  startCamera();
})();
