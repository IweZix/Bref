'use client';

import { Link as ChakraLink } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { Link } from '@/localization/navigation';
import { tKeys } from '@/localization/tKeys';

/**
 * There's no dedicated login page here -- every visitor already has a
 * session (anonymous by default). "Logging in" means converting that
 * session via /account (AccountEmailForm), so this is a plain nav link,
 * not a mutation -- shown only while still anonymous, the mirror image of
 * LogoutButton's is_anonymous === false guard.
 */
export function LoginButton() {
  const t = useTranslations();
  const { session } = useSupabaseSession();

  if (session?.user.is_anonymous === false) return null;

  return (
    <ChakraLink
      asChild
      fontFamily="mono"
      fontSize="sm"
      color="fg.muted"
      _hover={{ color: 'brand.fg' }}
    >
      <Link href="/account">{t(tKeys.shortener.loginButton.button)}</Link>
    </ChakraLink>
  );
}
