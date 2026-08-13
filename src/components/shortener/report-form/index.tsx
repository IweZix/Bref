'use client';

import { Box, Button, Stack, Text, Textarea } from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toaster } from '@/components/ui/toaster';
import { tKeys } from '@/localization/tKeys';

type SubmitReportResponse = {
  success?: boolean;
  error?: string;
};

type Translator = ReturnType<typeof useTranslations>;

async function submitReport(
  slug: string,
  reason: string,
  t: Translator,
): Promise<SubmitReportResponse> {
  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, reason }),
  });
  const body: SubmitReportResponse = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? t(tKeys.common.errors.generic));
  }
  return body;
}

export function ReportForm({ slug }: { slug: string }) {
  const t = useTranslations();
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: (reason: string) => submitReport(slug, reason, t),
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
        {t(tKeys.shortener.reportForm.successMessage)}
      </Text>
    );
  }

  return (
    <form onSubmit={formik.handleSubmit}>
      <Stack gap="3">
        <Text fontFamily="mono" color="fg.muted">
          {t(tKeys.shortener.reportForm.reportedLinkLabel, { slug })}
        </Text>
        <Box>
          <Textarea
            name="reason"
            placeholder={t(tKeys.shortener.reportForm.reasonPlaceholder)}
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
          {t(tKeys.shortener.reportForm.submit)}
        </Button>
      </Stack>
    </form>
  );
}
