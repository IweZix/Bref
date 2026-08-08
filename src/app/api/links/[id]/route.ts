import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { validateDestinationUrl } from '@/lib/shortener/validate-destination';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = {};

  if (typeof body.targetUrl === 'string') {
    const ownHost = request.headers.get('host') ?? undefined;
    const destination = validateDestinationUrl(body.targetUrl, ownHost);
    if (!destination.valid) {
      return NextResponse.json({ error: destination.reason }, { status: 400 });
    }
    update.target_url = destination.url;
  }

  if (typeof body.title === 'string' || body.title === null) {
    update.title =
      typeof body.title === 'string'
        ? body.title.trim().slice(0, 200) || null
        : null;
  }

  if (typeof body.isActive === 'boolean') {
    update.is_active = body.isActive;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 },
    );
  }

  // RLS scopes this to the owner's own links — a mismatched owner or unknown
  // id both come back as no rows, so we don't leak which case it was.
  const { data: link, error } = await supabase
    .from('links')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error || !link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  // { expire: 0 }, not 'max': 'max' is stale-while-revalidate and could still
  // serve the old destination once more — a link owner expects the change to
  // take effect on the very next visit, not eventually.
  revalidateTag(`link:${link.slug}`, { expire: 0 });
  revalidatePath('/[locale]/dashboard', 'page');
  revalidatePath('/[locale]/dashboard/[slug]', 'page');

  return NextResponse.json({ link });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: link, error } = await supabase
    .from('links')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error || !link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  // { expire: 0 }, not 'max': 'max' is stale-while-revalidate and could still
  // serve the old destination once more — a link owner expects the change to
  // take effect on the very next visit, not eventually.
  revalidateTag(`link:${link.slug}`, { expire: 0 });
  revalidatePath('/[locale]/dashboard', 'page');
  revalidatePath('/[locale]/dashboard/[slug]', 'page');

  return NextResponse.json({ success: true });
}
