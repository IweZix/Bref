'use client';

import { Box, Button, HStack, Stack, Text } from '@chakra-ui/react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import {
  buildQrTargetUrl,
  getQrRenderOptions,
} from '@/lib/shortener/qr-options';

const QR_DISPLAY_SIZE_PX = 160;

export function LinkQrCode({
  slug,
  shortUrl,
}: {
  slug: string;
  shortUrl: string;
}) {
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(buildQrTargetUrl(shortUrl), {
      type: 'svg',
      width: QR_DISPLAY_SIZE_PX,
      ...getQrRenderOptions(),
    }).then((svg) => {
      if (!cancelled) setSvgMarkup(svg);
    });
    return () => {
      cancelled = true;
    };
  }, [shortUrl]);

  function downloadSvg() {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blip-${slug}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Stack
      gap="3"
      p="4"
      borderWidth="1px"
      borderColor="app-border"
      borderRadius="lg"
      bg="app-bg"
      maxW="fit-content"
    >
      <Box
        role="img"
        aria-label={`Code QR menant vers ${shortUrl}`}
        w={`${QR_DISPLAY_SIZE_PX}px`}
        h={`${QR_DISPLAY_SIZE_PX}px`}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG markup generated locally from a URL we control (buildQrTargetUrl(shortUrl)), never from user input at render time — same trusted-local-markup posture as chakra-cache.tsx's existing use of this prop.
        dangerouslySetInnerHTML={svgMarkup ? { __html: svgMarkup } : undefined}
      />
      <Text fontFamily="mono" fontSize="xs" color="fg.muted">
        {shortUrl}
      </Text>
      <HStack gap="2" wrap="wrap">
        <Button
          onClick={downloadSvg}
          disabled={!svgMarkup}
          size="xs"
          colorPalette="brand"
          fontFamily="mono"
        >
          Télécharger en SVG
        </Button>
        <Button asChild size="xs" variant="outline" fontFamily="mono">
          <a href={`/api/qr/${encodeURIComponent(slug)}?size=screen`}>
            PNG écran
          </a>
        </Button>
        <Button asChild size="xs" variant="outline" fontFamily="mono">
          <a href={`/api/qr/${encodeURIComponent(slug)}?size=print`}>
            PNG impression
          </a>
        </Button>
      </HStack>
    </Stack>
  );
}
