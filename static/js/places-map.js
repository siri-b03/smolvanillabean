// Initialize a Leaflet map on the places page using the pins embedded in the template.
// Converts the page's x/y% coordinates into simple equirectangular lat/lng and places markers.

(function initPlacesMap() {
  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', () => {
    try {
      // Ensure Leaflet is available
      if (typeof window.L === 'undefined') return;

      const mapShell = document.querySelector('.map-shell');
      const mapEl = document.getElementById('leaflet-map');
      const pinsScript = document.getElementById('places-pins');
      if (!mapShell || !mapEl || !pinsScript) return;

      let pins = [];
      try {
        pins = JSON.parse(pinsScript.textContent || '[]');
      } catch (e) {
        console.error('Invalid places pins JSON', e);
        pins = [];
      }

      // Convert percentage x/y into [lat, lng] using a simple equirectangular mapping
      function percentToLatLng(x, y) {
        const lon = (x / 100) * 360 - 180; // -180..180
        const lat = 90 - (y / 100) * 180;  // 90..-90
        return [lat, lon];
      }

      // Initialize map
      const map = L.map('leaflet-map', { worldCopyJump: true, attributionControl: true }).setView([0, 10], 2);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
      }).addTo(map);

      const markerGroup = L.featureGroup().addTo(map);

      pins.forEach((p) => {
        const x = Number(p.x || 0);
        const y = Number(p.y || 0);
        const label = String(p.label || '');
        const emoji = String(p.emoji || '📍');
        const image = p.image ? String(p.image) : '';
        const rating = typeof p.rating !== 'undefined' ? Number(p.rating) : null;
        const companions = p.companions ? String(p.companions) : '';

        const latlng = percentToLatLng(x, y);
        try {
          const marker = L.marker(latlng, { title: label });

          // build popup HTML
          let html = '<div class="place-popup">';
          if (image) {
            html += '<div class="place-thumb"><img src="' + image + '" alt="' + label + '" style="width:120px;height:auto;border-radius:6px;display:block;margin-bottom:6px;"/></div>';
          }
          html += '<div class="place-meta">';
          html += '<strong>' + (emoji ? emoji + ' ' : '') + label + '</strong>';
          if (rating !== null && rating > 0) {
            html += '<div class="place-rating">Rating: ' + rating + '/5</div>';
          }
          if (companions) {
            html += '<div class="place-with">Went with: ' + companions + '</div>';
          }
          html += '</div></div>';

          marker.bindPopup(html, { maxWidth: 320 });

          // open popup on hover for quick preview
          marker.on('mouseover', () => marker.openPopup());
          marker.on('mouseout', () => marker.closePopup());

          marker.addTo(markerGroup);
        } catch (err) {
          console.warn('Failed to add marker for', p, err);
        }
      });

      if (markerGroup.getLayers().length) {
        map.fitBounds(markerGroup.getBounds().pad(0.2));
      }

      // show the leaflet map and hide the decorative svg
      mapShell.classList.add('leaflet-enabled');

    } catch (e) {
      console.error('Places map initialization failed', e);
    }
  });
})();
