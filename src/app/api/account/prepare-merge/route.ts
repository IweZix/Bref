import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Mints a short-lived proof that the caller was authenticated as this
 * (source) session at this moment -- called right before the browser signs
 * in as a *different* (target) account via a magic link, so that later step
 * can't just trust a client-supplied user id (see
 * supabase/migrations/20260814090600_pending_account_merges_table.sql and
 * src/app/api/account/merge/route.ts).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data, error } = await createServiceClient()
    .from('pending_account_merges')
    .insert({ source_user_id: user.id })
    .select('token')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Failed to prepare account merge' },
      { status: 500 },
    );
  }

  return NextResponse.json({ token: data.token });
}
