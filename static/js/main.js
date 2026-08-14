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

  document.addEventListener("pointermove", (e) => {
    latestEvent = e;
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

  function readNotes() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(saved) && saved.length) {
        return saved.map((item) => ({
          label: String(item.label || "you"),
          text: String(item.text || ""),
          style: String(item.style || "sky"),
          rotate: Number.parseFloat(item.rotate || "0") || 0,
          image: String(item.image || ""),
          createdAt: Number(item.createdAt || Date.now())
        }));
      }
    } catch (e) {
    }

    return defaultNotes;
  }

  function writeNotes(notes) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(notes));
    } catch (e) {
    }
  }

  function renderNotes() {
    const notes = readNotes();
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

  function addNote(label, text, image) {
    const notes = readNotes();
    notes.unshift({
      label: label || "you",
      text: text || "",
      image: image || "",
      style: ["sky", "peach", "pink"][Math.floor(Math.random() * 3)],
      rotate: (Math.random() * 8 - 4).toFixed(1),
      createdAt: Date.now()
    });
    writeNotes(notes.slice(0, 20));
    renderNotes();
  }

  if (noteForm) {
    noteForm.addEventListener("submit", (event) => {
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
        reader.onload = () => {
          addNote(label, text, String(reader.result));
          noteForm.reset();
        };
        reader.readAsDataURL(file);
        return;
      }

      addNote(label, text, "");
      noteForm.reset();
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

  function saveImageToMemoryBoard() {
    if (!currentDataUrl) return;

    try {
      const existing = JSON.parse(localStorage.getItem(memoryKey) || "null");
      const notes = Array.isArray(existing) ? existing : [];
      notes.unshift({
        label: "polaroid",
        text: (captionInput && captionInput.value.trim()) || "captured in the booth ✨",
        image: currentDataUrl,
        style: "sky",
        rotate: (Math.random() * 7 - 3).toFixed(1),
        createdAt: Date.now()
      });
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
