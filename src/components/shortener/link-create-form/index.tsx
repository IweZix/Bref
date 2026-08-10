'use client';

import { Box, Button, Checkbox, Stack, Text } from '@chakra-ui/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/shortener/copy-button';
import { TerminalInput } from '@/components/shortener/terminal-input';
import { toaster } from '@/components/ui/toaster';
import { normalizeSlug } from '@/lib/shortener/normalize-slug';
import { validateSlugFormat } from '@/lib/shortener/validate-slug-format';

type CreatedLink = {
  slug: string;
  targetUrl: string;
};

type CreateLinkResponse = {
  link?: { slug: string; target_url: string };
  error?: string;
};

type AvailabilityResponse = {
  available: boolean;
  reason?: string;
  suggestions?: string[];
};

const FORMAT_ERROR_MESSAGES: Record<string, string> = {
  'too-short': 'trop court (3 caractères minimum)',
  'too-long': 'trop long (32 caractères maximum)',
  'invalid-characters':
    'caractères non autorisés (minuscules, chiffres, - et _ uniquement)',
  'edge-hyphen': 'ne peut pas commencer ou finir par un tiret',
  'consecutive-hyphens': 'pas de tirets consécutifs',
  'all-digits': 'ne peut pas être composé uniquement de chiffres',
};

const AVAILABILITY_MESSAGES: Record<string, string> = {
  'invalid-format': 'format invalide',
  reserved: 'ce slug est réservé',
  'too-similar': 'ce slug ressemble trop à un lien existant',
  retired: "ce slug a déjà été utilisé et n'est plus disponible",
  'brand-mismatch':
    'ce slug ressemble à une marque mais ne pointe pas vers son domaine réel',
  taken: 'déjà pris',
};

async function createLink(params: {
  targetUrl: string;
  slug?: string;
  requiresInterstitial: boolean;
}): Promise<CreateLinkResponse> {
  const response = await fetch('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const body: CreateLinkResponse = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? 'Une erreur est survenue');
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
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  // Optimistic: the "created" card renders the moment submit fires, before
  // the server confirms — with a rollback to the form on failure.
  const [createdLink, setCreatedLink] = useState<CreatedLink | null>(null);
  const [showCustomSlug, setShowCustomSlug] = useState(false);
  const [debouncedSlug, setDebouncedSlug] = useState('');

  const mutation = useMutation({
    mutationFn: createLink,
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
      toaster.create({ description: error.message, type: 'error' });
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
          Créer un autre lien
        </Button>
      </Stack>
    );
  }

  // Live-typing feedback, differentiated by cause per case — never a generic
  // "invalid" message.
  let slugFeedback: { text: string; color: string } | null = null;
  if (
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
      slugFeedback = { text: 'disponible', color: 'brand.fg' };
    } else {
      const reasonText = availabilityQuery.data.reason
        ? (AVAILABILITY_MESSAGES[availabilityQuery.data.reason] ??
          'non disponible')
        : 'non disponible';
      const suggestions = availabilityQuery.data.suggestions?.join(', ');
      slugFeedback = {
        text: suggestions
          ? `${reasonText} — essaie : ${suggestions}`
          : reasonText,
        color: 'red.fg',
      };
    }
  } else if (availabilityQuery.isFetching) {
    slugFeedback = { text: 'vérification…', color: 'fg.subtle' };
  }

  return (
    <form onSubmit={formik.handleSubmit}>
      <Stack gap="3">
        <Text fontFamily="mono" color="fg.muted">
          colle une url longue
        </Text>
        <Stack direction={{ base: 'column', sm: 'row' }} gap="3">
          <Box flex="1">
            <TerminalInput
              name="targetUrl"
              placeholder="https://exemple.com/chemin/tres/long"
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
            Raccourcir
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
            Personnaliser le lien
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
                  placeholder="mon-lien"
                  value={formik.values.slug}
                  onChange={formik.handleChange}
                />
              </Box>
            </Stack>
            {slugFeedback && (
              <Text fontFamily="mono" fontSize="xs" color={slugFeedback.color}>
                {slugFeedback.text}
              </Text>
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
                Afficher un avertissement avant la redirection
              </Checkbox.Label>
            </Checkbox.Root>
          </Stack>
        )}
      </Stack>
    </form>
  );
}
