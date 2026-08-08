import { Box, HStack, Stack, Text } from '@chakra-ui/react';

const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MAX_BAR_HEIGHT_PX = 64;

export function DayOfWeekChart({ countsByDay }: { countsByDay: number[] }) {
  const max = Math.max(1, ...countsByDay);

  return (
    <Stack gap="2">
      <Text fontFamily="mono" fontWeight="bold" fontSize="sm">
        clics par jour, 7 derniers jours
      </Text>
      <HStack align="flex-end" gap="3" h={`${MAX_BAR_HEIGHT_PX + 24}px`}>
        {DAY_LABELS.map((label, index) => {
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
