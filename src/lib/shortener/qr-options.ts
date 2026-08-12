export const QR_SOURCE_PARAM = 's';
export const QR_SOURCE_VALUE = 'qr';

// One step above the qrcode library's own default ('M'), not maximum ('H') --
// better resistance to a scratched/dirty print without paying the H-level
// density cost this short URL doesn't need.
export const QR_ERROR_CORRECTION_LEVEL = 'Q';

// Quiet-zone width, in modules. Equal to the library's own default (4) but
// pinned here explicitly so it's independently testable and can't silently
// drift if the library's default ever changes underneath us.
export const QR_MARGIN = 4;

// Hardcoded, never derived from Chakra tokens or useColorMode() -- a QR
// code's black/white contrast is a scanning-reliability requirement, not a
// branding choice, and must never flip with the visitor's theme preference.
export const QR_DARK_COLOR = '#000000';
export const QR_LIGHT_COLOR = '#ffffff';

/**
 * The single source of truth both the client-side SVG preview and the
 * server-side PNG route encode -- same URL, same options, so a scan always
 * lands on the resolved link with the QR source marker attached.
 */
export function buildQrTargetUrl(shortUrl: string): string {
  const url = new URL(shortUrl);
  url.searchParams.set(QR_SOURCE_PARAM, QR_SOURCE_VALUE);
  return url.toString();
}

export function getQrRenderOptions() {
  return {
    errorCorrectionLevel: QR_ERROR_CORRECTION_LEVEL,
    margin: QR_MARGIN,
    color: { dark: QR_DARK_COLOR, light: QR_LIGHT_COLOR },
  } as const;
}
