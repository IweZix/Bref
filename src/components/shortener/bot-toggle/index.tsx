'use client';

import { Button, HStack } from '@chakra-ui/react';

export type ClickFilter = 'humans' | 'bots' | 'all';

const OPTIONS: { value: ClickFilter; label: string }[] = [
  { value: 'humans', label: 'Humains' },
  { value: 'bots', label: 'Robots' },
  { value: 'all', label: 'Tout' },
];

export function BotToggle({
  value,
  onChange,
}: {
  value: ClickFilter;
  onChange: (filter: ClickFilter) => void;
}) {
  return (
    <HStack gap="1">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant={value === option.value ? 'solid' : 'ghost'}
          colorPalette="brand"
          fontFamily="mono"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </HStack>
  );
}
