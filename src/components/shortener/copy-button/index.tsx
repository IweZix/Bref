'use client';

import { Button, type ButtonProps } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toaster } from '@/components/ui/toaster';
import { tKeys } from '@/localization/tKeys';

export function CopyButton({
  value,
  ...props
}: { value: string } & Omit<ButtonProps, 'onClick'>) {
  const t = useTranslations();
  const [justCopied, setJustCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setJustCopied(true);
      toaster.create({
        description: t(tKeys.shortener.copyButton.toastSuccess),
        type: 'success',
        duration: 2000,
      });
      setTimeout(() => setJustCopied(false), 1500);
    } catch {
      toaster.create({
        description: t(tKeys.shortener.copyButton.toastError),
        type: 'error',
      });
    }
  }

  return (
    <Button
      onClick={handleCopy}
      colorPalette="brand"
      fontFamily="mono"
      fontWeight="bold"
      variant={justCopied ? 'outline' : 'solid'}
      {...props}
    >
      {justCopied
        ? t(tKeys.shortener.copyButton.copied)
        : t(tKeys.shortener.copyButton.copy)}
    </Button>
  );
}
