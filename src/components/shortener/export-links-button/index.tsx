'use client';

import { Button } from '@chakra-ui/react';
import { toaster } from '@/components/ui/toaster';

export function ExportLinksButton() {
  async function handleExport() {
    try {
      const response = await fetch('/api/links/export');
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'mes-liens.json';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toaster.create({
        description: "Impossible d'exporter les liens",
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
      Exporter mes liens
    </Button>
  );
}
