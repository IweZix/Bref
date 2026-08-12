import type { createClient } from '@/lib/supabase/server';

export type LinkDetail = {
  id: string;
  slug: string;
  title: string | null;
  targetUrl: string;
  isActive: boolean;
  isCustomSlug: boolean;
  expiresAt: string | null;
  createdAt: string;
};

export type ClickRecord = {
  clickedAt: string;
  country: string | null;
  referrerHost: string | null;
  deviceType: string;
  isBot: boolean;
  source: string;
};

const MAX_CLICKS_FETCHED = 1000;

/** RLS-scoped: returns null if the link doesn't exist or isn't owned by the current session. */
export async function getLinkDetail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string,
): Promise<{ link: LinkDetail; clicks: ClickRecord[] } | null> {
  const { data: link, error: linkError } = await supabase
    .from('links')
    .select(
      'id, slug, title, target_url, is_active, is_custom_slug, expires_at, created_at',
    )
    .eq('slug', slug)
    .maybeSingle();

  if (linkError || !link) return null;

  const { data: clicks } = await supabase
    .from('clicks')
    .select('clicked_at, country, referrer_host, device_type, is_bot, source')
    .eq('link_id', link.id)
    .order('clicked_at', { ascending: false })
    .limit(MAX_CLICKS_FETCHED);

  return {
    link: {
      id: link.id,
      slug: link.slug,
      title: link.title,
      targetUrl: link.target_url,
      isActive: link.is_active,
      isCustomSlug: link.is_custom_slug,
      expiresAt: link.expires_at,
      createdAt: link.created_at,
    },
    clicks: (clicks ?? []).map((click) => ({
      clickedAt: click.clicked_at,
      country: click.country,
      referrerHost: click.referrer_host,
      deviceType: click.device_type,
      isBot: click.is_bot,
      source: click.source,
    })),
  };
}
