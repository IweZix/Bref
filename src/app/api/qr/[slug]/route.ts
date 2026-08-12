import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getClientIp } from '@/lib/shortener/geo';
import { hashIp } from '@/lib/shortener/ip-hash';
import {
  buildQrTargetUrl,
  getQrRenderOptions,
} from '@/lib/shortener/qr-options';
import { checkQrRateLimit } from '@/lib/shortener/qr-rate-limit';
import { resolveSlug } from '@/lib/shortener/resolve-slug';

const SIZE_PX = { screen: 512, print: 2048 } as const;
type QrSize = keyof typeof SIZE_PX;

function parseSize(raw: string | null): QrSize {
  return raw === 'print' ? 'print' : 'screen';
}

/**
 * Public, unauthenticated -- a QR only ever encodes the short URL itself
 * (never the destination), so it carries the same trust level as the
 * redirect route. Refuses (404) for anything that isn't a currently active
 * link, per the "no dead QR codes" rule -- non-existent, disabled, expired,
 * and retired slugs all collapse to the same non-'active' resolveSlug()
 * result.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const size = parseSize(url.searchParams.get('size'));

  const ipHash = await hashIp(getClientIp(request));
  const rateLimit = await checkQrRateLimit({ ipHash });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.reason }, { status: 429 });
  }

  const result = await resolveSlug(slug);
  if (result.status !== 'active') {
    return NextResponse.json(
      { error: 'Link not found or inactive' },
      { status: 404 },
    );
  }

  const shortUrl = `${url.protocol}//${url.host}/${slug}`;
  const pngBuffer = await QRCode.toBuffer(buildQrTargetUrl(shortUrl), {
    type: 'png',
    width: SIZE_PX[size],
    ...getQrRenderOptions(),
  });

  return new NextResponse(new Uint8Array(pngBuffer), {
    headers: {
      'content-type': 'image/png',
      'content-disposition': `attachment; filename="blip-${slug}-${size}.png"`,
      // Aggressive but not infinite: a QR is fully determined by its
      // content (the short URL never changes), so caching it is safe --
      // but if the underlying link is disabled mid-window, a CDN could
      // still serve a cached PNG for up to a day. That's an accepted
      // staleness window, not a security issue: the real redirect route
      // re-checks the link's live status on every actual visit regardless
      // of what any cached QR image looks like.
      'cache-control':
        'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
