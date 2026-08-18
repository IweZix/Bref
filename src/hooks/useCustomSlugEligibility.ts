'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';

type QuotaResponse =
  | { eligible: true; quota: number; used: number; isAnonymous: false }
  | { eligible: false; reason: 'requires-account'; isAnonymous: true }
  | {
      eligible: false;
      reason: 'quota-exceeded';
      quota: number;
      used: number;
      isAnonymous: false;
    };

async function fetchQuota(): Promise<QuotaResponse> {
  const response = await fetch('/api/account/quota');
  if (!response.ok) throw new Error('Failed to fetch custom slug quota');
  return response.json();
}

/**
 * session?.user.is_anonymous is known instantly, client-side, with no
 * network round trip -- used both to skip the query entirely for the common
 * anonymous case, and as the immediate signal link-create-form needs to
 * disable the custom-slug field before any query would resolve.
 */
export function useCustomSlugEligibility() {
  const { session, isLoading: isSessionLoading } = useSupabaseSession();
  const isAnonymous = session?.user.is_anonymous ?? true;

  const query = useQuery({
    queryKey: ['custom-slug-quota', session?.user.id],
    queryFn: fetchQuota,
    enabled: !isSessionLoading && Boolean(session) && !isAnonymous,
    staleTime: 10_000,
  });

  return {
    isAnonymous,
    isLoading: !isSessionLoading && !isAnonymous && query.isPending,
    data: query.data,
  };
}
