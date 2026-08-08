import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

const TARGET_DAY = '2026-01-15';

/**
 * Spec test 6: running the nightly aggregation twice on the same day must
 * produce the same clicks_daily state — full recompute + INSERT ... ON
 * CONFLICT DO UPDATE with absolute counts, never an increment.
 */
describe.skipIf(!hasLocalStack)('aggregate_clicks_daily idempotence', () => {
  let linkId: string;

  beforeAll(async () => {
    const anon = createClient(SUPABASE_URL as string, ANON_KEY as string);
    const { data: session } = await anon.auth.signInAnonymously();
    if (!session.user)
      throw new Error('Failed to create anonymous user for test setup');

    const slug = `agg-test-${crypto.randomUUID().slice(0, 8)}`;
    const { data: link, error: linkError } = await anon
      .from('links')
      .insert({
        slug,
        target_url: 'https://example.com/agg-test',
        user_id: session.user.id,
      })
      .select()
      .single();
    if (linkError || !link)
      throw new Error(`Setup link insert failed: ${linkError?.message}`);
    linkId = link.id;

    const service = createClient(
      SUPABASE_URL as string,
      SERVICE_ROLE_KEY as string,
    );
    const { error: clicksError } = await service.from('clicks').insert([
      {
        link_id: linkId,
        clicked_at: `${TARGET_DAY}T09:00:00Z`,
        country: 'FR',
        referrer_host: 'slack.com',
        device_type: 'desktop',
        is_bot: false,
        visitor_hash: 'visitor-a',
      },
      {
        link_id: linkId,
        clicked_at: `${TARGET_DAY}T10:00:00Z`,
        country: 'FR',
        referrer_host: 'slack.com',
        device_type: 'desktop',
        is_bot: false,
        visitor_hash: 'visitor-b',
      },
      {
        link_id: linkId,
        clicked_at: `${TARGET_DAY}T11:00:00Z`,
        country: 'BE',
        referrer_host: null,
        device_type: 'mobile',
        is_bot: false,
        visitor_hash: 'visitor-c',
      },
      {
        link_id: linkId,
        clicked_at: `${TARGET_DAY}T12:00:00Z`,
        country: 'FR',
        referrer_host: 'slack.com',
        device_type: 'desktop',
        is_bot: true,
        visitor_hash: 'visitor-bot',
      },
    ]);
    if (clicksError)
      throw new Error(`Setup clicks insert failed: ${clicksError.message}`);
  });

  it('produces identical clicks_daily rows across two runs', async () => {
    const service = createClient(
      SUPABASE_URL as string,
      SERVICE_ROLE_KEY as string,
    );

    const { error: firstRunError } = await service.rpc(
      'aggregate_clicks_daily',
      { target_day: TARGET_DAY },
    );
    expect(firstRunError).toBeNull();

    const { data: afterFirstRun } = await service
      .from('clicks_daily')
      .select(
        'link_id, day, country, referrer_host, device_type, click_count, unique_count, bot_count',
      )
      .eq('link_id', linkId)
      .order('country', { ascending: true });

    const { error: secondRunError } = await service.rpc(
      'aggregate_clicks_daily',
      { target_day: TARGET_DAY },
    );
    expect(secondRunError).toBeNull();

    const { data: afterSecondRun } = await service
      .from('clicks_daily')
      .select(
        'link_id, day, country, referrer_host, device_type, click_count, unique_count, bot_count',
      )
      .eq('link_id', linkId)
      .order('country', { ascending: true });

    expect(afterSecondRun).toEqual(afterFirstRun);

    // Also verify the actual computed values, not just "same as before". The
    // bot click shares (country, referrer_host, device_type) with two of the
    // human clicks, so it's counted in the same group row, not a separate one:
    // grouping is by dimensions, not by is_bot.
    expect(afterFirstRun).toHaveLength(2);
    const frSlackDesktop = afterFirstRun?.find((row) => row.country === 'FR');
    expect(frSlackDesktop).toMatchObject({
      click_count: 2,
      unique_count: 2,
      bot_count: 1,
    });
    const beMobile = afterFirstRun?.find((row) => row.country === 'BE');
    expect(beMobile).toMatchObject({
      click_count: 1,
      unique_count: 1,
      bot_count: 0,
      referrer_host: '',
    });
  });
});
