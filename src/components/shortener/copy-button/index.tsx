'use client';

import { Button, type ButtonProps } from '@chakra-ui/react';
import { useState } from 'react';
import { toaster } from '@/components/ui/toaster';

export function CopyButton({
  value,
  ...props
}: { value: string } & Omit<ButtonProps, 'onClick'>) {
  const [justCopied, setJustCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setJustCopied(true);
      toaster.create({
        description: 'Lien copié',
        type: 'success',
        duration: 2000,
      });
      setTimeout(() => setJustCopied(false), 1500);
    } catch {
      toaster.create({
        description: 'Impossible de copier le lien',
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
      {justCopied ? 'Copié !' : 'Copier'}
    </Button>
  );
}
