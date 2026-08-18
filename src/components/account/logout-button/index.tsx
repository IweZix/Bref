'use client';

import { Button } from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toaster } from '@/components/ui/toaster';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { createClient } from '@/lib/supabase/client';
import { tKeys } from '@/localization/tKeys';

/**
 * Only meaningful for a converted (non-anonymous) session -- an anonymous
 * session has nothing to log out of, it would just become a different
 * anonymous session. No confirmation dialog: signing out isn't destructive,
 * the account and its links are untouched.
 */
export function LogoutButton() {
  const t = useTranslations();
  const { session } = useSupabaseSession();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
    },
    onError: (error: Error) => {
      toaster.create({ description: error.message, type: 'error' });
    },
  });

  if (session?.user.is_anonymous !== false) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      fontFamily="mono"
      size="sm"
      loading={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {t(tKeys.shortener.logoutButton.button)}
    </Button>
  );
}
