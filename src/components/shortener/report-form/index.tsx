'use client';

import { Box, Button, Stack, Text, Textarea } from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { useState } from 'react';
import { toaster } from '@/components/ui/toaster';

type SubmitReportResponse = {
  success?: boolean;
  error?: string;
};

async function submitReport(
  slug: string,
  reason: string,
): Promise<SubmitReportResponse> {
  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, reason }),
  });
  const body: SubmitReportResponse = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? 'Une erreur est survenue');
  }
  return body;
}

export function ReportForm({ slug }: { slug: string }) {
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: (reason: string) => submitReport(slug, reason),
    onSuccess: () => setSubmitted(true),
    onError: (error: Error) => {
      toaster.create({ description: error.message, type: 'error' });
    },
  });

  const formik = useFormik({
    initialValues: { reason: '' },
    onSubmit: (values) => mutation.mutate(values.reason),
  });

  if (submitted) {
    return (
      <Text fontFamily="mono" color="fg.muted">
        Merci, ton signalement a été transmis.
      </Text>
    );
  }

  return (
    <form onSubmit={formik.handleSubmit}>
      <Stack gap="3">
        <Text fontFamily="mono" color="fg.muted">
          lien signalé : /{slug}
        </Text>
        <Box>
          <Textarea
            name="reason"
            placeholder="Pourquoi ce lien te semble-t-il problématique ?"
            value={formik.values.reason}
            onChange={formik.handleChange}
            fontFamily="mono"
            bg="app-bg"
            borderColor="app-border"
            required
            rows={4}
          />
        </Box>
        <Button
          type="submit"
          colorPalette="brand"
          fontFamily="mono"
          fontWeight="bold"
          alignSelf="flex-start"
          loading={mutation.isPending}
        >
          Signaler
        </Button>
      </Stack>
    </form>
  );
}
