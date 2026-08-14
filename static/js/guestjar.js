(function guestJar() {
  const aquarium = document.getElementById('aquarium');
  const form = document.getElementById('jar-form');
  const nameInput = document.getElementById('jar-name');
  const typeInput = document.getElementById('jar-type');
  const titleInput = document.getElementById('jar-title');
  const noteInput = document.getElementById('jar-note');
  const emojiSelect = document.getElementById('jar-emoji');
  const addBtn = document.getElementById('jar-add');

  if (!aquarium || !form) return;

  const KEY = 'smolvanillabean-jar';

  function readItems() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  function writeItems(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
  }

  function makeItemElement(item, idx) {
    const el = document.createElement('button');
    el.className = 'aquarium-item swim';
    el.type = 'button';
    el.dataset.idx = String(idx);
    el.setAttribute('aria-label', `${item.type} recommendation by ${item.name}: ${item.title}`);

    // random start position (within aquarium bounds)
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
    // start with a neutral (unflipped) orientation; facing will be set when movement begins
    emoji.style.transform = 'scaleX(1)';
    emoji.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'aq-label';
    label.textContent = item.title || (item.note ? item.note.slice(0, 18) : 'recommendation');
    label.style.display = 'none';

    el.appendChild(emoji);
    el.appendChild(label);

    // hover shows details (mouseenter/leave) and focus for keyboard
    let detailEl = null;
    function show() { detailEl = showDetail(item, el); }
    function hide() { if (detailEl) { detailEl.remove(); detailEl = null; } }

    el.addEventListener('mouseenter', (e) => { show(); });
    el.addEventListener('focus', (e) => { show(); });
    el.addEventListener('mouseleave', (e) => { hide(); });
    el.addEventListener('blur', (e) => { hide(); });

    // also support click on touch devices to toggle
    el.addEventListener('click', (e) => { e.stopPropagation(); if (!detailEl) show(); else hide(); });

    return el;
  }

  function render() {
    aquarium.innerHTML = '';
    const items = readItems();
    items.forEach((it, i) => {
      const itemEl = makeItemElement(it, i);
      aquarium.appendChild(itemEl);
    });
  }

  function showDetail(item, anchorEl) {
    // remove existing detail
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

    // position near anchor
    const rect = anchorEl.getBoundingClientRect();
    const contRect = aquarium.getBoundingClientRect();
    const left = Math.min(contRect.width - 320, rect.left - contRect.left + 10);
    const top = rect.top - contRect.top + 30;

    detail.style.left = left + 'px';
    detail.style.top = top + 'px';

    aquarium.appendChild(detail);
    return detail;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (nameInput.value || '').trim() || 'friend';
    const type = (typeInput.value || 'other');
    const title = (titleInput.value || '').trim();
    const note = (noteInput.value || '').trim();
    const emoji = (emojiSelect && emojiSelect.value) || '🫧';
    if (!title && !note) {
      titleInput.focus();
      return;
    }
    const items = readItems();
    items.unshift({ name, type, title, note, emoji, createdAt: Date.now() });
    writeItems(items.slice(0, 60));
    render();
    form.reset();
    nameInput.value = '';
  });

  // per-item continuous wandering
  function attachWander(el) {
    let stopped = false;
    function step() {
      if (stopped) return;
      const contRect = aquarium.getBoundingClientRect();
      const w = contRect.width;
      const h = contRect.height;

      const elRect = el.getBoundingClientRect();
      const currentX = elRect.left - contRect.left;
      const currentY = elRect.top - contRect.top;

      const elW = el.offsetWidth || 40;
      const elH = el.offsetHeight || 30;

      // keep items fully inside the aquarium (account for element size)
      const minX = 6;
      const maxX = Math.max(minX, Math.floor(w - elW - 6));
      const minY = 6;
      const maxY = Math.max(minY, Math.floor(h - elH - 6));

      const nx = Math.min(maxX, Math.max(minX, Math.floor(minX + Math.random() * (maxX - minX + 1))));
      const ny = Math.min(maxY, Math.max(minY, Math.floor(minY + Math.random() * (maxY - minY + 1))));

      const dx = nx - currentX;
      const dy = ny - currentY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const speed = 80; // pixels per second
      const duration = Math.min(8, Math.max(0.9, distance / speed));

      const emoji = el.querySelector('.aq-emoji');
      if (emoji) {
        // face the direction of travel based on dx
        if (Math.abs(dx) > 4) {
          // invert mapping so emoji visually face the movement direction
          emoji.style.transform = dx > 0 ? 'scaleX(-1)' : 'scaleX(1)';
        }
      }

      // set transition and move
      el.style.transition = `left ${duration}s linear, top ${duration}s linear`;

      // set positions relative to the container (left/top)
      // convert nx/ny (which are relative to container) into px values
      requestAnimationFrame(() => {
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
      });

      // wait for the transition to end (once) then schedule next step
      el.addEventListener('transitionend', function onEnd(e) {
        if (e.propertyName !== 'left' && e.propertyName !== 'top') return;
        // schedule next wander after a short randomized delay
        setTimeout(step, 200 + Math.random() * 800);
      }, { once: true });
    }
    step();
    el._stopWander = () => { stopped = true; el.style.transition = ''; };
  }

  function render() {
    // stop existing wanderers
    const existing = aquarium.querySelectorAll('.aquarium-item');
    existing.forEach((it) => { try { if (it._stopWander) it._stopWander(); } catch (e) {} });

    aquarium.innerHTML = '';
    const items = readItems();
    items.forEach((it, i) => {
      const itemEl = makeItemElement(it, i);
      aquarium.appendChild(itemEl);
      attachWander(itemEl);
    });
  }

  // initial render
  render();
})();
