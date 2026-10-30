/** Public invitation link: email/calendar apps reliably keep HTTPS links clickable. */
export function wazeInvitationUrl(address: string): string {
  return `https://planning.cinemeccanica-france.fr/waze?address=${encodeURIComponent(address)}`;
}

export function wazeWebUrl(address: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

/** Explicit Android package intent; other phones use the native Waze scheme. */
export function wazeAppUrl(address: string, android: boolean): string {
  const query = `q=${encodeURIComponent(address)}&navigate=yes`;
  return android
    ? `intent://?${query}#Intent;scheme=waze;package=com.waze;S.browser_fallback_url=${encodeURIComponent(wazeWebUrl(address))};end`
    : `waze://?${query}`;
}

/**
 * Ouvre Waze avec l'itinéraire vers une adresse.
 * Sur téléphone, tente d'abord le schéma waze:// qui ouvre l'application
 * directement ; si l'application n'est pas installée, retombe sur le lien
 * universel https://waze.com/ul. Sur ordinateur, ouvre le lien universel.
 */
export function openWaze(address: string): void {
  const q = encodeURIComponent(address);
  const webUrl = `https://waze.com/ul?q=${q}&navigate=yes`;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) {
    window.open(webUrl, "_blank", "noreferrer");
    return;
  }
  const start = Date.now();
  const fallback = window.setTimeout(() => {
    // L'application n'a pas pris la main : ouvrir la version web.
    window.location.href = webUrl;
  }, 1500);
  const cancelFallback = () => {
    if (Date.now() - start < 2000) window.clearTimeout(fallback);
  };
  window.addEventListener("pagehide", cancelFallback, { once: true });
  document.addEventListener("visibilitychange", cancelFallback, { once: true });
  window.location.href = `waze://?q=${q}&navigate=yes`;
}
