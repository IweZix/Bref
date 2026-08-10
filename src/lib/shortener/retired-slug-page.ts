/**
 * Plain inline HTML (no Chakra, matching link-not-found/page.tsx's existing
 * plain-tag precedent) — this is a Route Handler response, not a rendered
 * page, so `NextResponse.redirect` can't carry a non-3xx status here. A real
 * 410 on the actual HTTP response is what makes "retired, not just missing"
 * genuinely testable and correct, not just cosmetic copy on a 200 page.
 */
export function renderRetiredSlugHtml(slug: string): string {
  const reportHref = `/report?slug=${encodeURIComponent(slug)}`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Lien retiré</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: monospace; max-width: 32rem; margin: 4rem auto; padding: 0 1rem;">
<h1>Ce lien a été retiré</h1>
<p>Ce lien court a existé, mais a été supprimé par son créateur. Il ne sera jamais réattribué à quelqu'un d'autre.</p>
<p><a href="${reportHref}">Signaler ce lien</a></p>
</body>
</html>`;
}
