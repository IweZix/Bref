import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Session-scoped (RLS via the cookie-authenticated client) — the browser
// warning tells people to export their links precisely because there's no
// other way to recover them once the browser's cookies are gone.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: links, error } = await supabase
    .from('links')
    .select('slug, title, target_url, is_active, expires_at, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to export links' },
      { status: 500 },
    );
  }

  return new NextResponse(JSON.stringify(links ?? [], null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="mes-liens.json"',
    },
  });
}
