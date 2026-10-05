(function configureSiteSupabase() {
  const config = window.SUPABASE_CONFIG || {};
  const baseUrl = String(config.url || "").replace(/\/+$/, "");
  const anonKey = String(config.anonKey || "");
  const bucket = "memory-images";
  const maxImageBytes = 2 * 1024 * 1024;

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        ...(options.body && !(options.body instanceof Blob) ? { "Content-Type": "application/json" } : {}),
        ...options.headers
      }
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase request failed (${response.status}): ${detail}`);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  function assertConfigured() {
    if (!baseUrl || !anonKey) throw new Error("Add your Supabase URL and anon key in js/supabase-config.js.");
  }

  function publicImageUrl(path) {
    return `${baseUrl}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
  }

  async function uploadImage(file) {
    assertConfigured();
    if (!(file instanceof Blob) || !file.type.startsWith("image/")) {
      throw new Error("Choose a valid image file.");
    }
    if (file.size > maxImageBytes) throw new Error("Images must be 2 MB or smaller.");

    const extensionByType = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
    const extension = extensionByType[file.type];
    if (!extension) throw new Error("Use a JPG, PNG, WebP, or GIF image.");
    const path = `${crypto.randomUUID()}.${extension}`;
    await request(`/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      body: file,
      headers: { "Content-Type": file.type, "x-upsert": "false" }
    });
    return path;
  }

  async function listRecommendations() {
    assertConfigured();
    const rows = await request("/rest/v1/recommendations?select=id,name,type,title,note,emoji,created_at&approved=eq.true&order=created_at.desc&limit=100");
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      title: row.title,
      note: row.note || "",
      emoji: row.emoji || "🐠",
      createdAt: Date.parse(row.created_at)
    }));
  }

  async function submitRecommendation(item) {
    assertConfigured();
    return request("/rest/v1/recommendations", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        name: item.name,
        type: item.type,
        title: item.title,
        note: item.note || "",
        emoji: item.emoji || "🐠",
        approved: true
      })
    });
  }

  async function listMemories() {
    assertConfigured();
    const rows = await request("/rest/v1/memories?select=id,label,text,image_path,source,style,rotate,created_at&approved=eq.true&order=created_at.desc&limit=100");
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      text: row.text || "",
      image: row.image_path ? publicImageUrl(row.image_path) : "",
      source: row.source,
      style: row.style || "sky",
      rotate: Number(row.rotate || 0),
      createdAt: Date.parse(row.created_at)
    }));
  }

  async function submitMemory(memory) {
    assertConfigured();
    return request("/rest/v1/memories", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        label: memory.label,
        text: memory.text || "",
        image_path: memory.imagePath || null,
        source: memory.source || "board",
        style: memory.style || "sky",
        rotate: Number(memory.rotate || 0),
        approved: true
      })
    });
  }

  window.SiteSupabase = {
    configured: Boolean(baseUrl && anonKey),
    uploadImage,
    listRecommendations,
    submitRecommendation,
    listMemories,
    submitMemory
  };
})();
