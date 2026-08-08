import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

// Hit by the external keep-alive GitHub Action (.github/workflows/keep-alive.yaml)
// every few days. The free-tier Supabase project auto-pauses after 7 days with
// no activity, and a pg_cron job running inside the DB isn't guaranteed to count
// as activity for that detector — so this ping must come from outside the DB,
// and it needs to actually touch the database, not just return 200 from the edge.
export async function GET() {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('links')
    .select('id', { count: 'exact', head: true })
    .limit(1);

  if (error) {
    return NextResponse.json(
      { status: 'error', error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
