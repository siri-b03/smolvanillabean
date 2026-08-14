// Simple SVG pan & zoom + pin popup initializer for the places page.
// - transforms the .map-content element (translate + scale)
// - handles drag-to-pan and wheel-to-zoom (with cursor-centered zoom)
// - shows a small popup on pin hover/click (image/rating/companions)

(function placesSVG() {
  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const shell = document.querySelector('.map-shell');
      const content = document.querySelector('.map-content');
      const pinsScript = document.getElementById('places-pins');
      if (!shell || !content || !pinsScript) return;

      let pins = [];
      try { pins = JSON.parse(pinsScript.textContent || '[]'); } catch (e) { pins = []; }

      // transform state
      let scale = 1;
      let tx = 0;
      let ty = 0;
      let dragging = false;
      let lastPos = null;

      // prefer top-left transform origin to keep math simple for cursor-centered zoom
      content.style.transformOrigin = '0 0';
      content.style.willChange = 'transform';

      function applyTransform() {
        // clamp small numerical drift
        if (!isFinite(scale) || scale <= 0) scale = 1;
        content.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      }

      // pointer handlers for panning
      content.addEventListener('pointerdown', (ev) => {
        dragging = true;
        lastPos = { x: ev.clientX, y: ev.clientY };
        content.setPointerCapture(ev.pointerId);
      });

      content.addEventListener('pointermove', (ev) => {
        if (!dragging || !lastPos) return;
        const dx = ev.clientX - lastPos.x;
        const dy = ev.clientY - lastPos.y;
        tx += dx;
        ty += dy;
        lastPos = { x: ev.clientX, y: ev.clientY };
        applyTransform();
      });

      content.addEventListener('pointerup', (ev) => {
        dragging = false;
        lastPos = null;
        try { content.releasePointerCapture(ev.pointerId); } catch (e) {}
      });
      content.addEventListener('pointercancel', () => { dragging = false; lastPos = null; });

      // wheel to zoom (center on cursor)
      content.addEventListener('wheel', (ev) => {
        ev.preventDefault();
        const rect = content.getBoundingClientRect();
        const cx = ev.clientX - rect.left; // cursor relative to content
        const cy = ev.clientY - rect.top;

        const delta = -ev.deltaY;
        const zoomFactor = delta > 0 ? 1.12 : 0.88;
        const newScale = Math.min(4, Math.max(0.6, scale * zoomFactor));

        // compute new tx/ty so the point under cursor stays in place
        const worldX = (cx - tx) / scale;
        const worldY = (cy - ty) / scale;
        tx = cx - worldX * newScale;
        ty = cy - worldY * newScale;
        scale = newScale;
        applyTransform();
      }, { passive: false });

      // double-click to reset
      content.addEventListener('dblclick', () => {
        scale = 1; tx = 0; ty = 0; applyTransform();
      });

      // popup element
      let popup = null;
      function showPopup(html, left, top) {
        hidePopup();
        popup = document.createElement('div');
        popup.className = 'place-popup';
        popup.style.position = 'absolute';
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
        popup.style.zIndex = 100;
        popup.style.pointerEvents = 'auto';
        popup.innerHTML = html;
        // small styling
        popup.style.background = 'rgba(255,255,255,0.96)';
        popup.style.border = '1px solid rgba(80,110,150,0.12)';
        popup.style.padding = '8px';
        popup.style.borderRadius = '8px';
        popup.style.boxShadow = '0 8px 20px rgba(20,40,80,0.08)';
        popup.style.maxWidth = '260px';
        shell.appendChild(popup);
      }
      function hidePopup() { if (popup) { popup.remove(); popup = null; } }

      // attach hover/click behavior to existing .pin elements and ensure they reflect pins JSON
      const pinEls = Array.from(content.querySelectorAll('.pins .pin'));
      pinEls.forEach((el, i) => {
        const p = pins[i] || {};
        // enrich title if missing
        if (p.label && (!el.getAttribute('title') || el.getAttribute('title') === '')) {
          el.setAttribute('title', p.label);
        }

        function popupHtml(p) {
          let html = '';
          if (p.image) html += `<div style="margin-bottom:6px;"><img src="${p.image}" alt="${p.label||''}" style="width:100%;height:auto;border-radius:6px;"/></div>`;
          html += `<strong>${p.emoji? (p.emoji+' '):''}${p.label||''}</strong>`;
          if (p.rating) html += `<div style="font-size:13px;color:#556;">Rating: ${p.rating}/5</div>`;
          if (p.companions) html += `<div style="font-size:13px;color:#556;">Went with: ${p.companions}</div>`;
          return html;
        }

        // mouseenter shows popup near element
        el.addEventListener('mouseenter', (ev) => {
          const rect = el.getBoundingClientRect();
          const shellRect = shell.getBoundingClientRect();
          const left = rect.left - shellRect.left + 12;
          const top = rect.top - shellRect.top - 8;
          showPopup(popupHtml(p), left, top);
        });
        el.addEventListener('mouseleave', () => { hidePopup(); });

        // click toggles popup
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const rect = el.getBoundingClientRect();
          const shellRect = shell.getBoundingClientRect();
          const left = rect.left - shellRect.left + 12;
          const top = rect.top - shellRect.top - 8;
          if (!popup) showPopup(popupHtml(p), left, top);
          else hidePopup();
        });
      });

      // clicking elsewhere hides popup
      document.addEventListener('click', () => hidePopup());

      // initial transform
      applyTransform();

    } catch (e) {
      console.error('places-svg init failed', e);
    }
  });
})();
