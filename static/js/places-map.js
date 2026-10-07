(function placesMap() {
  const map = document.querySelector('.places-map');
  const storyCards = Array.from(document.querySelectorAll('[data-place-card]'));
  const pins = Array.from(document.querySelectorAll('.place-pin'));
  const cards = Array.from(document.querySelectorAll('.place-card'));

  if (!map || !pins.length) return;

  function selectPlace(index) {
    const safeIndex = Math.max(0, Math.min(index, pins.length - 1));

    pins.forEach((pin, pinIndex) => {
      const selected = pinIndex === safeIndex;
      pin.classList.toggle('is-active', selected);
      pin.setAttribute('aria-pressed', String(selected));
    });

    cards.forEach((card, cardIndex) => {
      card.classList.toggle('is-active', cardIndex === safeIndex);
    });

    storyCards.forEach((card, cardIndex) => {
      card.classList.toggle('is-active', cardIndex === safeIndex);
    });

    const selectedPin = pins[safeIndex];
    selectedPin?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }

  pins.forEach((pin) => {
    pin.addEventListener('click', () => selectPlace(Number(pin.dataset.place)));
  });

  cards.forEach((card) => {
    card.addEventListener('click', () => selectPlace(Number(card.dataset.place)));
  });

  window.placesMap = { selectPlace };
})();
