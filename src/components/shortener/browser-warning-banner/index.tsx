'use client';

import { CloseButton, HStack, Stack, Text } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { StorageKeys, useLocalStorage } from '@/hooks/useLocalStorage';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { Link } from '@/localization/navigation';
import { tKeys } from '@/localization/tKeys';

/**
 * User-framed, not mechanism-framed: describes what's true for the person
 * using the app (their links live in this browser), not how it's implemented.
 *
 * Hidden entirely once the session is a verified account, rather than
 * swapped to different copy: the banner's whole premise ("tied to this
 * browser") is no longer true for a converted account, and hiding avoids a
 * stale localStorage-dismissed flag permanently suppressing what would
 * otherwise need to become a different message.
 */
export function BrowserWarningBanner() {
  const t = useTranslations();
  const { session } = useSupabaseSession();
  const [dismissed, setDismissed] = useLocalStorage<boolean>(
    StorageKeys.DASHBOARD_WARNING_DISMISSED,
    false,
  );

  if (dismissed || session?.user.is_anonymous === false) return null;

  return (
    <HStack
      justify="space-between"
      gap="4"
      p="3"
      borderWidth="1px"
      borderColor="app-border"
      borderRadius="md"
      bg="app-bg"
      fontFamily="mono"
      fontSize="sm"
      color="fg.muted"
    >
      <Stack gap="1">
        <Text>{`// ${t(tKeys.shortener.browserWarningBanner.body)}`}</Text>
        <Link href="/account">
          <Text color="brand.fg" textDecoration="underline">
            {t(tKeys.shortener.browserWarningBanner.createAccountCta)}
          </Text>
        </Link>
      </Stack>
      <CloseButton
        size="sm"
        onClick={() => setDismissed(true)}
        aria-label={t(tKeys.shortener.browserWarningBanner.closeAriaLabel)}
      />
    </HStack>
  );
}
