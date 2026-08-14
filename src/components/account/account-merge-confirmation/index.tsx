'use client';

import { Button, Stack, Text } from '@chakra-ui/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toaster } from '@/components/ui/toaster';
import { StorageKeys, useLocalStorage } from '@/hooks/useLocalStorage';
import { Link } from '@/localization/navigation';
import { tKeys } from '@/localization/tKeys';

type PreviewResponse = { totalCount: number; customCount: number };
type MergeResult = {
  reassignedRandom: number;
  reassignedCustom: number;
  skippedCustom: number;
};

async function fetchPreview(token: string): Promise<PreviewResponse> {
  const response = await fetch(
    `/api/account/merge?token=${encodeURIComponent(token)}`,
  );
  if (!response.ok)
    throw new Error('This link has expired or was already used');
  return response.json();
}

async function commitMerge(token: string): Promise<MergeResult> {
  const response = await fetch('/api/account/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) throw new Error("Failed to link this device's links");
  return response.json();
}

function BackToDashboardLink() {
  const t = useTranslations();
  return (
    <Link href="/dashboard">
      <Text
        fontFamily="mono"
        fontSize="sm"
        color="brand.fg"
        textDecoration="underline"
      >
        {t(tKeys.account.mergeConfirmation.backToDashboard)}
      </Text>
    </Link>
  );
}

/**
 * Reads the proof-of-prior-session token minted by
 * src/app/api/account/prepare-merge (see src/components/account/account-email-form)
 * back out of localStorage -- it has to survive the magic-link redirect,
 * which lands here already authenticated as the *target* account. Nothing
 * on this page trusts a source user id directly; the token is the only
 * thing the server ever acts on.
 */
export function AccountMergeConfirmation() {
  const t = useTranslations();
  const [token, , removeToken] = useLocalStorage<string | null>(
    StorageKeys.PENDING_ACCOUNT_MERGE_TOKEN,
    null,
  );
  const [result, setResult] = useState<MergeResult | null>(null);

  const previewQuery = useQuery({
    queryKey: ['account-merge-preview', token],
    queryFn: () => fetchPreview(token as string),
    enabled: Boolean(token),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => commitMerge(token as string),
    onSuccess: (data) => {
      setResult(data);
      removeToken();
    },
    onError: (error: Error) => {
      toaster.create({ description: error.message, type: 'error' });
    },
  });

  if (!token) {
    return (
      <Stack gap="3">
        <Text fontFamily="mono" color="fg.muted">
          {t(tKeys.account.mergeConfirmation.noPendingMerge)}
        </Text>
        <BackToDashboardLink />
      </Stack>
    );
  }

  if (result) {
    const reassignedCount = result.reassignedRandom + result.reassignedCustom;
    return (
      <Stack gap="2">
        {reassignedCount > 0 && (
          <Text fontFamily="mono">
            {t(tKeys.account.mergeConfirmation.resultReassigned, {
              count: reassignedCount,
            })}
          </Text>
        )}
        {result.skippedCustom > 0 && (
          <Text fontFamily="mono" fontSize="sm" color="fg.muted">
            {t(tKeys.account.mergeConfirmation.resultSkipped, {
              count: result.skippedCustom,
            })}
          </Text>
        )}
        <BackToDashboardLink />
      </Stack>
    );
  }

  if (previewQuery.isError) {
    return (
      <Stack gap="3">
        <Text fontFamily="mono" color="fg.muted">
          {t(tKeys.account.emailForm.invalidLinkError)}
        </Text>
        <BackToDashboardLink />
      </Stack>
    );
  }

  if (!previewQuery.data) return null;

  return (
    <Stack gap="3">
      <Text fontFamily="mono">
        {t(tKeys.account.mergeConfirmation.body, {
          count: previewQuery.data.totalCount,
        })}
      </Text>
      {previewQuery.data.customCount > 0 && (
        <Text fontFamily="mono" fontSize="sm" color="fg.muted">
          {t(tKeys.account.mergeConfirmation.quotaNote)}
        </Text>
      )}
      <Stack direction="row" gap="3">
        <Button
          colorPalette="brand"
          fontFamily="mono"
          fontWeight="bold"
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {t(tKeys.account.mergeConfirmation.confirm)}
        </Button>
        <Button
          type="button"
          variant="ghost"
          fontFamily="mono"
          onClick={() => removeToken()}
        >
          {t(tKeys.account.mergeConfirmation.decline)}
        </Button>
      </Stack>
    </Stack>
  );
}
