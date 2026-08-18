'use client';

import { Button, Stack, Text } from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { TerminalInput } from '@/components/shortener/terminal-input';
import { toaster } from '@/components/ui/toaster';
import { StorageKeys, useLocalStorage } from '@/hooks/useLocalStorage';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { createClient } from '@/lib/supabase/client';
import { tKeys } from '@/localization/tKeys';

type SubmitState =
  | { status: 'idle' }
  | { status: 'check-email'; email: string }
  | { status: 'cross-device-check-email'; email: string };

type MutationResult =
  | { kind: 'converted'; email: string }
  | { kind: 'cross-device'; email: string };

async function prepareMerge(): Promise<{ token: string }> {
  const response = await fetch('/api/account/prepare-merge', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to prepare account merge');
  }
  return response.json();
}

export function AccountEmailForm() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const { session } = useSupabaseSession();
  const [state, setState] = useState<SubmitState>({ status: 'idle' });
  const [, setMergeToken] = useLocalStorage<string | null>(
    StorageKeys.PENDING_ACCOUNT_MERGE_TOKEN,
    null,
  );

  useEffect(() => {
    if (searchParams.get('error') === 'invalid-link') {
      toaster.create({
        description: t(tKeys.account.emailForm.invalidLinkError),
        type: 'error',
      });
    }
  }, [searchParams, t]);

  const mutation = useMutation({
    mutationFn: async (email: string): Promise<MutationResult> => {
      const supabase = createClient();
      // The actual post-confirmation destination is baked into the
      // email_change/magic_link templates themselves (supabase/templates/,
      // wired in supabase/config.toml) as a hardcoded `next` on the link to
      // src/app/api/auth/confirm -- not read from emailRedirectTo, which
      // Supabase only honors when it's on the additional_redirect_urls
      // allow-list. Passed here as the bare origin (always allow-listed)
      // purely so updateUser()/signInWithOtp() never reject the call over a
      // redirect-URL mismatch.
      const origin = window.location.origin;
      const { error } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: origin },
      );

      if (!error) {
        return { kind: 'converted', email };
      }

      // The email already belongs to a different auth.users row -- divert
      // into the cross-device flow instead of failing outright: sign in as
      // the existing account, but only after capturing this (source)
      // session's identity via a service-role-issued token, so the browser
      // can later offer to migrate this session's links once it's actually
      // authenticated as the target account. See
      // src/app/api/account/prepare-merge and src/app/api/account/merge.
      if (error.code === 'email_exists') {
        const { token } = await prepareMerge();
        setMergeToken(token);
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: origin },
        });
        if (otpError) throw otpError;
        return { kind: 'cross-device', email };
      }

      throw error;
    },
    onSuccess: (result) => {
      setState(
        result.kind === 'converted'
          ? { status: 'check-email', email: result.email }
          : { status: 'cross-device-check-email', email: result.email },
      );
    },
    onError: (error: Error) => {
      toaster.create({ description: error.message, type: 'error' });
    },
  });

  const formik = useFormik({
    initialValues: { email: '' },
    onSubmit: (values) => mutation.mutate(values.email),
  });

  if (session?.user.is_anonymous === false) {
    return (
      <Text fontFamily="mono" color="fg.muted">
        {t(tKeys.account.emailForm.alreadyConverted, {
          email: session.user.email ?? '',
        })}
      </Text>
    );
  }

  if (
    state.status === 'check-email' ||
    state.status === 'cross-device-check-email'
  ) {
    return (
      <Stack gap="2">
        <Text fontFamily="mono">
          {t(tKeys.account.emailForm.checkEmailTitle)}
        </Text>
        <Text fontFamily="mono" fontSize="sm" color="fg.muted">
          {state.status === 'cross-device-check-email'
            ? t(tKeys.account.emailForm.checkEmailBodyCrossDevice, {
                email: state.email,
              })
            : t(tKeys.account.emailForm.checkEmailBody, {
                email: state.email,
              })}
        </Text>
        <Button
          type="button"
          variant="ghost"
          alignSelf="flex-start"
          fontFamily="mono"
          size="sm"
          onClick={() => setState({ status: 'idle' })}
        >
          {t(tKeys.account.emailForm.useDifferentEmail)}
        </Button>
      </Stack>
    );
  }

  return (
    <form onSubmit={formik.handleSubmit}>
      <Stack gap="3">
        <Text fontFamily="mono" color="fg.muted">
          {t(tKeys.account.emailForm.description)}
        </Text>
        <TerminalInput
          name="email"
          type="email"
          placeholder={t(tKeys.account.emailForm.emailPlaceholder)}
          value={formik.values.email}
          onChange={formik.handleChange}
          required
        />
        <Button
          type="submit"
          colorPalette="brand"
          fontFamily="mono"
          fontWeight="bold"
          alignSelf="flex-start"
          loading={mutation.isPending}
        >
          {t(tKeys.account.emailForm.submit)}
        </Button>
      </Stack>
    </form>
  );
}
