'use client';

import { Button, HStack } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { tKeys } from '@/localization/tKeys';

export type ClickFilter = 'humans' | 'bots' | 'all';

type Translator = ReturnType<typeof useTranslations>;

function getOptions(t: Translator): { value: ClickFilter; label: string }[] {
  return [
    { value: 'humans', label: t(tKeys.shortener.botToggle.humans) },
    { value: 'bots', label: t(tKeys.shortener.botToggle.bots) },
    { value: 'all', label: t(tKeys.shortener.botToggle.all) },
  ];
}

export function BotToggle({
  value,
  onChange,
}: {
  value: ClickFilter;
  onChange: (filter: ClickFilter) => void;
}) {
  const t = useTranslations();
  const options = getOptions(t);

  return (
    <HStack gap="1">
      {options.map((option) => (
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
