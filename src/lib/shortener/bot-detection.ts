// Hand-maintained on purpose: the point is the methodology (count previews,
// don't let them inflate human click counts), not exhaustive bot coverage —
// no external dependency needed for a list this size.
const BOT_PATTERNS = [
  /slackbot/i,
  /facebookexternalhit/i,
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /redditbot/i,
  /applebot/i,
  /googlebot/i,
  /bingbot/i,
  /embedly/i,
  /skypeuripreview/i,
  /pinterest/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /go-http-client/i,
  /headlesschrome/i,
  /bot|crawler|spider|preview/i,
];

/**
 * Link-preview generators (Slack, WhatsApp, iMessage, social apps) fetch a
 * short link the instant it's pasted, before any human opens it — unfiltered,
 * a link shared once shows several clicks before anyone actually visits.
 */
export function isBot(userAgent: string | null): boolean {
  if (!userAgent || userAgent.trim() === '') return true;
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}
