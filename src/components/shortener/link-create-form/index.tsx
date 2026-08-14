'use client';

import { Box, Button, Checkbox, Stack, Text } from '@chakra-ui/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/shortener/copy-button';
import { CustomSlugQuotaMeter } from '@/components/shortener/custom-slug-quota-meter';
import { TerminalInput } from '@/components/shortener/terminal-input';
import { toaster } from '@/components/ui/toaster';
import { useCustomSlugEligibility } from '@/hooks/useCustomSlugEligibility';
import { normalizeSlug } from '@/lib/shortener/normalize-slug';
import { validateSlugFormat } from '@/lib/shortener/validate-slug-format';
import { Link } from '@/localization/navigation';
import { tKeys } from '@/localization/tKeys';

type CreatedLink = {
  slug: string;
  targetUrl: string;
};

type CreateLinkResponse = {
  link?: { slug: string; target_url: string };
  error?: string;
  reason?: string;
};

type AvailabilityResponse = {
  available: boolean;
  reason?: string;
  suggestions?: string[];
};

type EligibilityReason = 'requires-account' | 'quota-exceeded';

class CreateLinkError extends Error {
  reason?: string;
  constructor(message: string, reason?: string) {
    super(message);
    this.reason = reason;
  }
}

type Translator = ReturnType<typeof useTranslations>;

function getFormatErrorMessages(t: Translator): Record<string, string> {
  return {
    'too-short': t(tKeys.shortener.linkCreateForm.formatErrors.tooShort),
    'too-long': t(tKeys.shortener.linkCreateForm.formatErrors.tooLong),
    'invalid-characters': t(
      tKeys.shortener.linkCreateForm.formatErrors.invalidCharacters,
    ),
    'edge-hyphen': t(tKeys.shortener.linkCreateForm.formatErrors.edgeHyphen),
    'consecutive-hyphens': t(
      tKeys.shortener.linkCreateForm.formatErrors.consecutiveHyphens,
    ),
    'all-digits': t(tKeys.shortener.linkCreateForm.formatErrors.allDigits),
  };
}

function getAvailabilityMessages(t: Translator): Record<string, string> {
  return {
    'invalid-format': t(
      tKeys.shortener.linkCreateForm.availabilityErrors.invalidFormat,
    ),
    reserved: t(tKeys.shortener.linkCreateForm.availabilityErrors.reserved),
    'too-similar': t(
      tKeys.shortener.linkCreateForm.availabilityErrors.tooSimilar,
    ),
    retired: t(tKeys.shortener.linkCreateForm.availabilityErrors.retired),
    'brand-mismatch': t(
      tKeys.shortener.linkCreateForm.availabilityErrors.brandMismatch,
    ),
    taken: t(tKeys.shortener.linkCreateForm.availabilityErrors.taken),
    'requires-account': t(
      tKeys.shortener.linkCreateForm.availabilityErrors.requiresAccount,
    ),
    'quota-exceeded': t(
      tKeys.shortener.linkCreateForm.availabilityErrors.quotaExceeded,
    ),
  };
}

async function createLink(
  params: {
    targetUrl: string;
    slug?: string;
    requiresInterstitial: boolean;
  },
  t: Translator,
): Promise<CreateLinkResponse> {
  const response = await fetch('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const body: CreateLinkResponse = await response.json();
  if (!response.ok) {
    throw new CreateLinkError(
      body.error ?? t(tKeys.common.errors.generic),
      body.reason,
    );
  }
  return body;
}

async function checkAvailability(slug: string): Promise<AvailabilityResponse> {
  const response = await fetch(
    `/api/links/availability?slug=${encodeURIComponent(slug)}`,
  );
  if (!response.ok) throw new Error('Failed to check availability');
  return response.json();
}

export function LinkCreateForm() {
  const t = useTranslations();
  const FORMAT_ERROR_MESSAGES = getFormatErrorMessages(t);
  const AVAILABILITY_MESSAGES = getAvailabilityMessages(t);
  const eligibility = useCustomSlugEligibility();

  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  // Optimistic: the "created" card renders the moment submit fires, before
  // the server confirms — with a rollback to the form on failure.
  const [createdLink, setCreatedLink] = useState<CreatedLink | null>(null);
  const [showCustomSlug, setShowCustomSlug] = useState(false);
  const [debouncedSlug, setDebouncedSlug] = useState('');
  // Set only when the server rejects a custom-slug attempt for an
  // eligibility reason (not a format/availability one) — surfaced inline,
  // at the field, in the same gesture as the refusal, matching how
  // availability errors already render. Anything else falls back to a toast.
  const [submitEligibilityReason, setSubmitEligibilityReason] =
    useState<EligibilityReason | null>(null);

  // The hook only fetches /api/account/quota when the session is not
  // anonymous, so a fetched `eligible: false` here can only be the
  // quota-exceeded case — the requires-account case is covered by
  // `eligibility.isAnonymous` directly, with no network round trip needed.
  const isCustomSlugDisabled =
    eligibility.isAnonymous || eligibility.data?.eligible === false;

  const mutation = useMutation({
    mutationFn: (params: {
      targetUrl: string;
      slug?: string;
      requiresInterstitial: boolean;
    }) => createLink(params, t),
    onSuccess: (data) => {
      if (data.link) {
        setCreatedLink({
          slug: data.link.slug,
          targetUrl: data.link.target_url,
        });
      }
    },
    onError: (error: Error) => {
      setCreatedLink(null);
      const reason =
        error instanceof CreateLinkError ? error.reason : undefined;
      if (reason === 'requires-account' || reason === 'quota-exceeded') {
        setSubmitEligibilityReason(reason);
      } else {
        toaster.create({ description: error.message, type: 'error' });
      }
    },
  });

  const formik = useFormik({
    initialValues: { targetUrl: '', slug: '', requiresInterstitial: false },
    onSubmit: (values) => {
      // Optimistic placeholder — replaced by the real slug in onSuccess, or
      // cleared by onError above.
      setCreatedLink({
        slug: values.slug || '···',
        targetUrl: values.targetUrl,
      });
      mutation.mutate({
        targetUrl: values.targetUrl,
        slug: values.slug.trim() || undefined,
        requiresInterstitial: values.requiresInterstitial,
      });
    },
  });

  // Indicative only, ~400ms debounced — the UNIQUE constraint at insert time
  // is the only real authority on availability.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSlug(normalizeSlug(formik.values.slug));
      setSubmitEligibilityReason(null);
    }, 400);
    return () => clearTimeout(timeout);
  }, [formik.values.slug]);

  const formatValidation = debouncedSlug
    ? validateSlugFormat(debouncedSlug)
    : null;

  const availabilityQuery = useQuery({
    queryKey: ['slug-availability', debouncedSlug],
    queryFn: () => checkAvailability(debouncedSlug),
    enabled:
      showCustomSlug &&
      !isCustomSlugDisabled &&
      Boolean(debouncedSlug) &&
      (formatValidation?.valid ?? false),
    staleTime: 10_000,
  });

  if (createdLink) {
    const isPending = mutation.isPending;
    const shortUrl = origin
      ? `${origin}/${createdLink.slug}`
      : `/${createdLink.slug}`;

    return (
      <Stack
        gap="3"
        p="6"
        borderWidth="1px"
        borderColor="app-border"
        borderRadius="lg"
        bg="app-bg"
        opacity={isPending ? 0.6 : 1}
        transition="opacity 0.15s"
      >
        <Text fontFamily="mono" fontSize="sm" color="fg.muted" truncate>
          {createdLink.targetUrl}
        </Text>
        <Stack direction="row" align="center" gap="3">
          <Text fontFamily="mono" fontWeight="bold" fontSize="lg">
            {origin.replace(/^https?:\/\//, '')}/{createdLink.slug}
          </Text>
          {!isPending && <CopyButton value={shortUrl} size="sm" />}
        </Stack>
        <Button
          variant="ghost"
          alignSelf="flex-start"
          fontFamily="mono"
          size="sm"
          onClick={() => {
            setCreatedLink(null);
            setShowCustomSlug(false);
            formik.resetForm();
          }}
        >
          {t(tKeys.shortener.linkCreateForm.resetButton)}
        </Button>
      </Stack>
    );
  }

  // Live-typing feedback, differentiated by cause per case — never a generic
  // "invalid" message. Eligibility (account/quota) takes priority over
  // format/availability feedback: there's no point telling someone their
  // slug looks fine if they can't create one at all yet.
  let slugFeedback: { text: string; color: string } | null = null;
  if (submitEligibilityReason) {
    slugFeedback = {
      text: AVAILABILITY_MESSAGES[submitEligibilityReason],
      color: 'red.fg',
    };
  } else if (eligibility.isAnonymous) {
    slugFeedback = {
      text: AVAILABILITY_MESSAGES['requires-account'],
      color: 'red.fg',
    };
  } else if (eligibility.data?.eligible === false) {
    slugFeedback = {
      text: AVAILABILITY_MESSAGES[eligibility.data.reason],
      color: 'red.fg',
    };
  } else if (
    formik.values.slug.trim() &&
    formatValidation &&
    !formatValidation.valid
  ) {
    slugFeedback = {
      text: FORMAT_ERROR_MESSAGES[formatValidation.reason],
      color: 'red.fg',
    };
  } else if (availabilityQuery.data) {
    if (availabilityQuery.data.available) {
      slugFeedback = {
        text: t(tKeys.shortener.linkCreateForm.slugFeedback.available),
        color: 'brand.fg',
      };
    } else {
      const notAvailableText = t(
        tKeys.shortener.linkCreateForm.slugFeedback.notAvailable,
      );
      const reasonText = availabilityQuery.data.reason
        ? (AVAILABILITY_MESSAGES[availabilityQuery.data.reason] ??
          notAvailableText)
        : notAvailableText;
      const suggestions = availabilityQuery.data.suggestions?.join(', ');
      slugFeedback = {
        text: suggestions
          ? t(tKeys.shortener.linkCreateForm.slugFeedback.suggestionsHint, {
              reasonText,
              suggestions,
            })
          : reasonText,
        color: 'red.fg',
      };
    }
  } else if (availabilityQuery.isFetching) {
    slugFeedback = {
      text: t(tKeys.shortener.linkCreateForm.slugFeedback.checking),
      color: 'fg.subtle',
    };
  }

  return (
    <form onSubmit={formik.handleSubmit}>
      <Stack gap="3">
        <Text fontFamily="mono" color="fg.muted">
          {t(tKeys.shortener.linkCreateForm.urlLabel)}
        </Text>
        <Stack direction={{ base: 'column', sm: 'row' }} gap="3">
          <Box flex="1">
            <TerminalInput
              name="targetUrl"
              placeholder={t(tKeys.shortener.linkCreateForm.urlPlaceholder)}
              value={formik.values.targetUrl}
              onChange={formik.handleChange}
              required
              type="url"
            />
          </Box>
          <Button
            type="submit"
            colorPalette="brand"
            fontFamily="mono"
            fontWeight="bold"
            loading={mutation.isPending}
          >
            {t(tKeys.shortener.linkCreateForm.submit)}
          </Button>
        </Stack>

        {!showCustomSlug ? (
          <Button
            type="button"
            variant="ghost"
            alignSelf="flex-start"
            fontFamily="mono"
            size="sm"
            onClick={() => setShowCustomSlug(true)}
          >
            {t(tKeys.shortener.linkCreateForm.customizeToggle)}
          </Button>
        ) : (
          <Stack gap="1">
            <Stack direction="row" align="center" gap="2">
              <Text fontFamily="mono" fontSize="sm" color="fg.muted">
                {origin.replace(/^https?:\/\//, '')}/
              </Text>
              <Box flex="1">
                <TerminalInput
                  name="slug"
                  placeholder={t(
                    tKeys.shortener.linkCreateForm.slugPlaceholder,
                  )}
                  value={formik.values.slug}
                  onChange={formik.handleChange}
                  disabled={isCustomSlugDisabled}
                />
              </Box>
            </Stack>
            {slugFeedback && (
              <Text fontFamily="mono" fontSize="xs" color={slugFeedback.color}>
                {slugFeedback.text}
              </Text>
            )}
            {eligibility.isAnonymous && (
              <Link href="/account">
                <Text
                  fontFamily="mono"
                  fontSize="xs"
                  color="brand.fg"
                  textDecoration="underline"
                >
                  {t(tKeys.shortener.linkCreateForm.createAccountCta)}
                </Text>
              </Link>
            )}
            {eligibility.data && !eligibility.data.isAnonymous && (
              <CustomSlugQuotaMeter
                used={eligibility.data.used}
                quota={eligibility.data.quota}
              />
            )}
            <Checkbox.Root
              size="sm"
              checked={formik.values.requiresInterstitial}
              onCheckedChange={(details) =>
                formik.setFieldValue(
                  'requiresInterstitial',
                  Boolean(details.checked),
                )
              }
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label fontFamily="mono" color="fg.muted">
                {t(tKeys.shortener.linkCreateForm.interstitialCheckboxLabel)}
              </Checkbox.Label>
            </Checkbox.Root>
          </Stack>
        )}
      </Stack>
    </form>
  );
}
