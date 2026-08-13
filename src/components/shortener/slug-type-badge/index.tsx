'use client';

import { Badge } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { tKeys } from '@/localization/tKeys';

export function SlugTypeBadge({ isCustomSlug }: { isCustomSlug: boolean }) {
  const t = useTranslations();
  if (!isCustomSlug) return null; // random is the unlabeled default, mirroring StatusBadge

  return (
    <Badge
      colorPalette="purple"
      variant="subtle"
      borderRadius="full"
      fontFamily="mono"
    >
      {t(tKeys.shortener.slugTypeBadge.custom)}
    </Badge>
  );
}
