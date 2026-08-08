'use client';

import { CloseButton, HStack, Text } from '@chakra-ui/react';
import { StorageKeys, useLocalStorage } from '@/hooks/useLocalStorage';

/**
 * User-framed, not mechanism-framed: describes what's true for the person
 * using the app (their links live in this browser), not how it's implemented.
 */
export function BrowserWarningBanner() {
  const [dismissed, setDismissed] = useLocalStorage<boolean>(
    StorageKeys.DASHBOARD_WARNING_DISMISSED,
    false,
  );

  if (dismissed) return null;

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
      <Text>
        {
          '// rattachés à ce navigateur, pas à un compte — vider tes cookies les rend introuvables ici (ils redirigent toujours)'
        }
      </Text>
      <CloseButton
        size="sm"
        onClick={() => setDismissed(true)}
        aria-label="Fermer l'avertissement"
      />
    </HStack>
  );
}
