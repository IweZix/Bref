import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { tKeys } from '@/localization/tKeys';

type Translator = ReturnType<typeof useTranslations>;

function getDayLabels(t: Translator): string[] {
  return [
    t(tKeys.shortener.charts.dayOfWeek.short.sun),
    t(tKeys.shortener.charts.dayOfWeek.short.mon),
    t(tKeys.shortener.charts.dayOfWeek.short.tue),
    t(tKeys.shortener.charts.dayOfWeek.short.wed),
    t(tKeys.shortener.charts.dayOfWeek.short.thu),
    t(tKeys.shortener.charts.dayOfWeek.short.fri),
    t(tKeys.shortener.charts.dayOfWeek.short.sat),
  ];
}

const MAX_BAR_HEIGHT_PX = 64;

export function DayOfWeekChart({ countsByDay }: { countsByDay: number[] }) {
  const t = useTranslations();
  const dayLabels = getDayLabels(t);
  const max = Math.max(1, ...countsByDay);

  return (
    <Stack gap="2">
      <Text fontFamily="mono" fontWeight="bold" fontSize="sm">
        {t(tKeys.shortener.dayOfWeekChart.heading)}
      </Text>
      <HStack align="flex-end" gap="3" h={`${MAX_BAR_HEIGHT_PX + 24}px`}>
        {dayLabels.map((label, index) => {
          const count = countsByDay[index] ?? 0;
          const height =
            count === 0
              ? 2
              : Math.max(4, Math.round((count / max) * MAX_BAR_HEIGHT_PX));
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed 7-day week, order never changes
            <Stack key={index} align="center" gap="1" flex="1">
              <Text fontFamily="mono" fontSize="xs" color="fg.muted">
                {count > 0 ? count : ''}
              </Text>
              <Box
                w="full"
                maxW="8"
                h={`${height}px`}
                bg={count > 0 ? 'brand.solid' : 'app-border'}
                borderRadius="sm"
              />
              <Text fontFamily="mono" fontSize="xs" color="fg.subtle">
                {label}
              </Text>
            </Stack>
          );
        })}
      </HStack>
    </Stack>
  );
}
