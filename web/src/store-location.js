export function hasCoordinates(store) {
  return (
    store.latitude !== null &&
    store.latitude !== undefined &&
    store.latitude !== '' &&
    store.longitude !== null &&
    store.longitude !== undefined &&
    store.longitude !== '' &&
    Number.isFinite(Number(store.latitude)) &&
    Math.abs(Number(store.latitude)) <= 90 &&
    Number.isFinite(Number(store.longitude)) &&
    Math.abs(Number(store.longitude)) <= 180
  );
}
export function storeMapLink(store) {
  return (
    store.map_url ||
    (hasCoordinates(store)
      ? `https://www.google.com/maps/search/?api=1&query=${Number(store.latitude)},${Number(store.longitude)}`
      : '')
  );
}
export function storeMapEmbed(store) {
  return hasCoordinates(store)
    ? `https://maps.google.com/maps?q=${Number(store.latitude)},${Number(store.longitude)}&z=16&output=embed`
    : store.address
      ? `https://maps.google.com/maps?q=${encodeURIComponent(store.address)}&z=16&output=embed`
      : '';
}
