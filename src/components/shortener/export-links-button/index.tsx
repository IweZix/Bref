'use client';

import { Button } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { toaster } from '@/components/ui/toaster';
import { tKeys } from '@/localization/tKeys';

export function ExportLinksButton() {
  const t = useTranslations();

  async function handleExport() {
    try {
      const response = await fetch('/api/links/export');
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = t(tKeys.shortener.exportLinksButton.filename);
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toaster.create({
        description: t(tKeys.shortener.exportLinksButton.exportError),
        type: 'error',
      });
    }
  }

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      colorPalette="brand"
      fontFamily="mono"
      size="sm"
    >
      {t(tKeys.shortener.exportLinksButton.button)}
    </Button>
  );
}
