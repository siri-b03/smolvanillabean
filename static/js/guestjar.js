(function guestJar() {
  const aquarium = document.getElementById('aquarium');
  const form = document.getElementById('jar-form');
  const nameInput = document.getElementById('jar-name');
  const typeInput = document.getElementById('jar-type');
  const titleInput = document.getElementById('jar-title');
  const noteInput = document.getElementById('jar-note');
  const emojiSelect = document.getElementById('jar-emoji');
  const legend = document.getElementById('jar-legend');

  if (!aquarium || !form) return;

  const KEY = 'smolvanillabean-jar';

  function setLegend(message) {
    if (legend) legend.textContent = message;
  }

  function readLocalItems() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  function writeLocalItems(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
  }

  async function readItems() {
    if (window.SiteSupabase && window.SiteSupabase.configured) {
      try {
        const rows = await window.SiteSupabase.listRecommendations();
        if (rows.length) {
          return rows.map((item) => ({
            name: item.name || 'friend',
            type: item.type || 'other',
            title: item.title || 'recommendation',
            note: item.note || '',
            emoji: item.emoji || '🐠',
            createdAt: item.createdAt || Date.now()
          }));
        }
      } catch (error) {
        console.warn('Could not load aquarium from Supabase; falling back to local storage.', error);
      }
    }

    return readLocalItems();
  }

  function makeItemElement(item, idx) {
    const el = document.createElement('button');
    el.className = 'aquarium-item swim';
    el.type = 'button';
    el.dataset.idx = String(idx);
    el.setAttribute('aria-label', `${item.type} recommendation by ${item.name}: ${item.title}`);

    const w = aquarium.clientWidth;
    const h = aquarium.clientHeight;
    const x = Math.max(8, Math.floor(Math.random() * (w - 80)));
    const y = Math.max(8, Math.floor(Math.random() * (h - 60)));
    el.style.left = x + 'px';
    el.style.top = y + 'px';

    const emoji = document.createElement('span');
    emoji.className = 'aq-emoji';
    emoji.textContent = item.emoji || '🐠';
    emoji.style.fontSize = '22px';
    emoji.style.transform = 'scaleX(1)';
    emoji.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'aq-label';
    label.textContent = item.title || (item.note ? item.note.slice(0, 18) : 'recommendation');
    label.style.display = 'none';

    el.appendChild(emoji);
    el.appendChild(label);

    let detailEl = null;
    function show() { detailEl = showDetail(item, el); }
    function hide() { if (detailEl) { detailEl.remove(); detailEl = null; } }

    el.addEventListener('mouseenter', () => show());
    el.addEventListener('focus', () => show());
    el.addEventListener('mouseleave', () => hide());
    el.addEventListener('blur', () => hide());
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!detailEl) show(); else hide();
    });

    return el;
  }

  function showDetail(item, anchorEl) {
    const existing = document.querySelector('.aquarium-item-detail');
    if (existing) existing.remove();

    const detail = document.createElement('div');
    detail.className = 'aquarium-item-detail';

    const h = document.createElement('h4');
    h.textContent = `${item.title || '(untitled)'} — ${item.type}`;
    const by = document.createElement('p');
    by.textContent = `recommended by ${item.name || 'a friend'}`;
    const note = document.createElement('p');
    note.textContent = item.note || '';

    detail.appendChild(h);
    detail.appendChild(by);
    if (item.note) detail.appendChild(note);

    const rect = anchorEl.getBoundingClientRect();
    const contRect = aquarium.getBoundingClientRect();
    const left = Math.min(contRect.width - 320, rect.left - contRect.left + 10);
    const top = rect.top - contRect.top + 30;

    detail.style.left = left + 'px';
    detail.style.top = top + 'px';

    aquarium.appendChild(detail);
    return detail;
  }

  async function render() {
    aquarium.innerHTML = '';
    setLegend('Loading recommendations…');

    const items = await readItems();
    if (!items.length) {
      setLegend(window.SiteSupabase && window.SiteSupabase.configured
        ? 'No recommendations yet — be the first to add one.'
        : 'No recommendations saved in this browser yet.');
    } else {
      setLegend(`${items.length} recommendation${items.length === 1 ? '' : 's'} in the aquarium`);
    }

    items.forEach((item, i) => {
      const itemEl = makeItemElement(item, i);
      aquarium.appendChild(itemEl);
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = (nameInput.value || '').trim() || 'friend';
    const type = typeInput.value || 'other';
    const title = (titleInput.value || '').trim();
    const note = (noteInput.value || '').trim();
    const emoji = (emojiSelect && emojiSelect.value) || '🫧';

    if (!title && !note) {
      titleInput.focus();
      return;
    }

    const payload = { name, type, title, note, emoji };

    if (window.SiteSupabase && window.SiteSupabase.configured) {
      try {
        await window.SiteSupabase.submitRecommendation(payload);
        setLegend('Sent to the aquarium for review.');
      } catch (error) {
        console.warn('Supabase submit failed; saving locally instead.', error);
        const items = readLocalItems();
        items.unshift({ ...payload, createdAt: Date.now() });
        writeLocalItems(items.slice(0, 60));
        setLegend('Saved locally for now.');
      }
    } else {
      const items = readLocalItems();
      items.unshift({ ...payload, createdAt: Date.now() });
      writeLocalItems(items.slice(0, 60));
      setLegend('Saved locally in this browser.');
    }

    form.reset();
    nameInput.value = '';
    await render();
  });

  function attachWander(el) {
    let stopped = false;
    function step() {
      if (stopped) return;
      const contRect = aquarium.getBoundingClientRect();
      const w = contRect.width;

      const elRect = el.getBoundingClientRect();
      const currentX = elRect.left - contRect.left;
      const currentY = elRect.top - contRect.top;

      const elW = el.offsetWidth || 40;
      const elH = el.offsetHeight || 30;
      const minX = 6;
      const maxX = Math.max(minX, Math.floor(w - elW - 6));
      const minY = 6;
      const maxY = Math.max(minY, Math.floor(contRect.height - elH - 6));

      const nx = Math.min(maxX, Math.max(minX, Math.floor(minX + Math.random() * (maxX - minX + 1))));
      const ny = Math.min(maxY, Math.max(minY, Math.floor(minY + Math.random() * (maxY - minY + 1))));

      const dx = nx - currentX;
      const dy = ny - currentY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const speed = 80;
      const duration = Math.min(8, Math.max(0.9, distance / speed));

      const emoji = el.querySelector('.aq-emoji');
      if (emoji && Math.abs(dx) > 4) {
        emoji.style.transform = dx > 0 ? 'scaleX(-1)' : 'scaleX(1)';
      }

      el.style.transition = `left ${duration}s linear, top ${duration}s linear`;
      requestAnimationFrame(() => {
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
      });

      el.addEventListener('transitionend', function onEnd(event) {
        if (event.propertyName !== 'left' && event.propertyName !== 'top') return;
        setTimeout(step, 200 + Math.random() * 800);
      }, { once: true });
    }
    step();
    el._stopWander = () => { stopped = true; el.style.transition = ''; };
  }

  async function renderWanderingItems() {
    const existing = aquarium.querySelectorAll('.aquarium-item');
    existing.forEach((item) => { try { if (item._stopWander) item._stopWander(); } catch (error) {} });

    aquarium.innerHTML = '';
    const items = await readItems();
    items.forEach((item, i) => {
      const itemEl = makeItemElement(item, i);
      aquarium.appendChild(itemEl);
      attachWander(itemEl);
    });
  }

  renderWanderingItems();
})();
