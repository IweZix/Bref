'use client';

import { Button, HStack, Stack, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/shortener/empty-state';
import { LinkListItem } from '@/components/shortener/link-list-item';
import type { DashboardLink } from '@/lib/shortener/get-dashboard-links';

type SortMode = 'recent' | 'popular';

export function LinkList({ links }: { links: DashboardLink[] }) {
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  const sortedLinks = useMemo(() => {
    const copy = [...links];
    if (sortMode === 'popular') {
      copy.sort((a, b) => b.clicksLast7Days - a.clicksLast7Days);
    } else {
      copy.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return copy;
  }, [links, sortMode]);

  if (links.length === 0) {
    return (
      <EmptyState
        title="Aucun lien pour l'instant"
        description="Les liens que tu crées apparaîtront ici, avec leurs statistiques de clics."
      />
    );
  }

  return (
    <Stack gap="4">
      <HStack justify="space-between">
        <Text fontFamily="mono" color="fg.muted">
          {links.length} lien{links.length > 1 ? 's' : ''}
        </Text>
        <HStack gap="1">
          <Button
            size="sm"
            variant={sortMode === 'recent' ? 'solid' : 'ghost'}
            colorPalette="brand"
            fontFamily="mono"
            onClick={() => setSortMode('recent')}
          >
            Récents
          </Button>
          <Button
            size="sm"
            variant={sortMode === 'popular' ? 'solid' : 'ghost'}
            colorPalette="brand"
            fontFamily="mono"
            onClick={() => setSortMode('popular')}
          >
            Populaires
          </Button>
        </HStack>
      </HStack>

      <Stack gap="3">
        {sortedLinks.map((link) => (
          <LinkListItem key={link.id} link={link} />
        ))}
      </Stack>
    </Stack>
  );
}
