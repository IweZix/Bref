import { isBot } from '@/lib/shortener/bot-detection';
import type { ClickSource } from '@/lib/shortener/click-source';
import { detectDeviceType } from '@/lib/shortener/device-type';
import { getClientIp, getCountry } from '@/lib/shortener/geo';
import { getReferrerHost } from '@/lib/shortener/referrer-host';
import { hashVisitor } from '@/lib/shortener/visitor-hash';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Must never throw: it runs inside `after()`, after the redirect response has
 * already been sent, so a recording failure must never surface to the visitor.
 * No personal data is stored: no raw IP, referrer is host-only, visitor_hash
 * rotates daily. Bot flagging (ticket 8) extends this same function.
 */
export async function recordClick(
  linkId: string,
  request: Request,
  source: ClickSource,
): Promise<void> {
  try {
    const supabase = createServiceClient();
    const userAgent = request.headers.get('user-agent') ?? '';
    const ip = getClientIp(request);

    const deviceType = detectDeviceType(userAgent);
    const country = getCountry(request);
    const referrerHost = getReferrerHost(request);
    const visitorHash = await hashVisitor(ip, userAgent, linkId);

    const { error } = await supabase.from('clicks').insert({
      link_id: linkId,
      device_type: deviceType,
      country,
      referrer_host: referrerHost,
      visitor_hash: visitorHash,
      is_bot: isBot(userAgent),
      source,
    });

    if (error) {
      console.error('Failed to record click', error);
    }
  } catch (err) {
    console.error('Failed to record click', err);
  }
}
