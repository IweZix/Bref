import type { EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * The one confirmation callback for every email-driven auth step this app
 * sends: the anonymous->permanent conversion (updateUser({ email })) and,
 * for the cross-device merge flow, the sign-in-as-existing-account magic
 * link. Both just need verifyOtp() called with the token Supabase embedded
 * in the email; `next` decides where the browser lands afterward.
 *
 * Deliberately under src/app/api/, not src/app/[locale]/, so src/proxy.ts's
 * matcher skips next-intl locale negotiation for these links -- an emailed
 * confirmation URL shouldn't depend on guessing the right locale prefix.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/dashboard';

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(
    new URL('/account?error=invalid-link', request.url),
  );
}
