'use client';

import { Badge } from '@chakra-ui/react';

export function SlugTypeBadge({ isCustomSlug }: { isCustomSlug: boolean }) {
  if (!isCustomSlug) return null; // random is the unlabeled default, mirroring StatusBadge

  return (
    <Badge
      colorPalette="purple"
      variant="subtle"
      borderRadius="full"
      fontFamily="mono"
    >
      personnalisé
    </Badge>
  );
}
