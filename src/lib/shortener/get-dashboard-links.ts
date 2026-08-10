import type { createClient } from '@/lib/supabase/server';

export type DashboardLink = {
  id: string;
  slug: string;
  title: string | null;
  targetUrl: string;
  isActive: boolean;
  isCustomSlug: boolean;
  expiresAt: string | null;
  createdAt: string;
  clicksLast7Days: number;
  previewsLast7Days: number;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * RLS-scoped to the current session's own links (cookie-authenticated client,
 * not service role). Click counts come from a single query over the last 7
 * days of detail rows, aggregated in memory — simple, and detail rows are
 * still fresh at this timescale (they're only purged past 90 days, ticket 11).
 */
export async function getDashboardLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<DashboardLink[]> {
  const { data: links, error } = await supabase
    .from('links')
    .select(
      'id, slug, title, target_url, is_active, is_custom_slug, expires_at, created_at',
    )
    .order('created_at', { ascending: false });

  if (error || !links || links.length === 0) return [];

  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  const linkIds = links.map((link) => link.id);

  const { data: clicks } = await supabase
    .from('clicks')
    .select('link_id, is_bot')
    .in('link_id', linkIds)
    .gte('clicked_at', sevenDaysAgo);

  const counts = new Map<string, { clicks: number; previews: number }>();
  for (const click of clicks ?? []) {
    const entry = counts.get(click.link_id) ?? { clicks: 0, previews: 0 };
    if (click.is_bot) {
      entry.previews += 1;
    } else {
      entry.clicks += 1;
    }
    counts.set(click.link_id, entry);
  }

  return links.map((link) => ({
    id: link.id,
    slug: link.slug,
    title: link.title,
    targetUrl: link.target_url,
    isActive: link.is_active,
    isCustomSlug: link.is_custom_slug,
    expiresAt: link.expires_at,
    createdAt: link.created_at,
    clicksLast7Days: counts.get(link.id)?.clicks ?? 0,
    previewsLast7Days: counts.get(link.id)?.previews ?? 0,
  }));
}
