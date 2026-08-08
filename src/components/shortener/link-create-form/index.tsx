'use client';

import { Box, Button, Stack, Text } from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/shortener/copy-button';
import { TerminalInput } from '@/components/shortener/terminal-input';
import { toaster } from '@/components/ui/toaster';

type CreatedLink = {
  slug: string;
  targetUrl: string;
};

type CreateLinkResponse = {
  link?: { slug: string; target_url: string };
  error?: string;
};

async function createLink(targetUrl: string): Promise<CreateLinkResponse> {
  const response = await fetch('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUrl }),
  });
  const body: CreateLinkResponse = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? 'Une erreur est survenue');
  }
  return body;
}

export function LinkCreateForm() {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  // Optimistic: the "created" card renders the moment submit fires, before
  // the server confirms — with a rollback to the form on failure.
  const [createdLink, setCreatedLink] = useState<CreatedLink | null>(null);

  const mutation = useMutation({
    mutationFn: (targetUrl: string) => createLink(targetUrl),
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
    initialValues: { targetUrl: '' },
    onSubmit: (values) => {
      // Optimistic placeholder — replaced by the real slug in onSuccess, or
      // cleared by onError above.
      setCreatedLink({ slug: '···', targetUrl: values.targetUrl });
      mutation.mutate(values.targetUrl);
    },
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
            formik.resetForm();
          }}
        >
          Créer un autre lien
        </Button>
      </Stack>
    );
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
      </Stack>
    </form>
  );
}
