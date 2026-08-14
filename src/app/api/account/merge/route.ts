import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// Matches supabase/config.toml's auth.email.otp_expiry (1 hour) -- a merge
// token proves "this browser held a session at this moment," which should
// go stale on the same horizon as the email link that carries it.
const MERGE_TOKEN_TTL_SECONDS = 3600;

function isExpired(createdAt: string): boolean {
  const ageSeconds = (Date.now() - new Date(createdAt).getTime()) / 1000;
  return ageSeconds > MERGE_TOKEN_TTL_SECONDS;
}

/**
 * Read-only preview: how many links (and how many of those are custom) sit
 * on the source session a pending merge token points at. Never consumes the
 * token -- the confirmation screen can be safely re-rendered (e.g. on
 * refresh) before the user actually commits.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: pending } = await service
    .from('pending_account_merges')
    .select('source_user_id, created_at')
    .eq('token', token)
    .maybeSingle();

  if (!pending || isExpired(pending.created_at)) {
    return NextResponse.json(
      { error: 'This link has expired or was already used' },
      { status: 410 },
    );
  }

  const { count: totalCount } = await service
    .from('links')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', pending.source_user_id);

  const { count: customCount } = await service
    .from('links')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', pending.source_user_id)
    .eq('is_custom_slug', true);

  return NextResponse.json({
    totalCount: totalCount ?? 0,
    customCount: customCount ?? 0,
  });
}

/**
 * Commits the merge. Requires the caller to be cookie-authenticated as the
 * target account -- the source identity is never taken from the request
 * body, only from the token, consumed here (deleted) so it can't be reused.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: target },
  } = await supabase.auth.getUser();
  if (!target) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.token !== 'string') {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  const service = createServiceClient();

  // DELETE ... RETURNING in one statement: consume-once by construction --
  // a concurrent replay of the same token finds no row left to delete.
  const { data: pending, error: consumeError } = await service
    .from('pending_account_merges')
    .delete()
    .eq('token', body.token)
    .select('source_user_id, created_at')
    .single();

  if (consumeError || !pending || isExpired(pending.created_at)) {
    return NextResponse.json(
      { error: 'This link has expired or was already used' },
      { status: 410 },
    );
  }

  const { data: result, error: mergeError } = await service
    .rpc('merge_anonymous_links', {
      p_source_user_id: pending.source_user_id,
      p_target_user_id: target.id,
    })
    .single();

  if (mergeError || !result) {
    return NextResponse.json(
      { error: 'Failed to merge links' },
      { status: 500 },
    );
  }

  const {
    reassigned_random: reassignedRandom,
    reassigned_custom: reassignedCustom,
    skipped_custom: skippedCustom,
  } = result as {
    reassigned_random: number;
    reassigned_custom: number;
    skipped_custom: number;
  };

  // Nothing left on the source (every random link always moves; every
  // custom link moved too, since none were skipped) -- clean it up via the
  // Auth Admin API, the supported way to delete a user on demand from a
  // Data-API-invoked route (unlike purge_empty_anonymous_sessions, which
  // runs raw SQL from pg_cron's own privileged context).
  if (skippedCustom === 0) {
    await service.auth.admin.deleteUser(pending.source_user_id);
  }

  if (reassignedRandom > 0 || reassignedCustom > 0) {
    revalidatePath('/[locale]/dashboard', 'page');
  }

  return NextResponse.json({
    reassignedRandom,
    reassignedCustom,
    skippedCustom,
  });
}
