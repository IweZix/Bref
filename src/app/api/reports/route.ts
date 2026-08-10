import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/shortener/geo';
import { hashIp } from '@/lib/shortener/ip-hash';
import { normalizeSlug } from '@/lib/shortener/normalize-slug';
import { checkReportRateLimit } from '@/lib/shortener/report-rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ipHash = await hashIp(getClientIp(request));
  const rateLimit = await checkReportRateLimit({ sessionId: user.id, ipHash });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.reason }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.slug !== 'string' || !body.slug.trim()) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }
  const reason =
    typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
  if (!reason) {
    return NextResponse.json({ error: 'reason is required' }, { status: 400 });
  }

  const service = createServiceClient();
  const slug = body.slug.trim().slice(0, 64);

  // Best-effort link lookup for the report's context -- a report on a slug
  // whose link is already gone (deleted or retired) is still valid to file.
  const { data: link } = await service
    .from('links')
    .select('id')
    .eq('slug_normalized', normalizeSlug(slug))
    .maybeSingle();

  const { error } = await service.from('reports').insert({
    link_id: link?.id ?? null,
    slug,
    reason,
    reporter_session_id: user.id,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to submit report' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
