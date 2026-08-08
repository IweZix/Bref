import { Box, HStack, Stack, Text } from '@chakra-ui/react';

export type PercentageBarItem = {
  label: string;
  count: number;
};

export function PercentageBarList({
  title,
  items,
}: {
  title: string;
  items: PercentageBarItem[];
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (items.length === 0) {
    return (
      <Stack gap="2">
        <Text fontFamily="mono" fontWeight="bold" fontSize="sm">
          {title}
        </Text>
        <Text fontFamily="mono" fontSize="sm" color="fg.subtle">
          Pas encore de données
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="2">
      <Text fontFamily="mono" fontWeight="bold" fontSize="sm">
        {title}
      </Text>
      {items.map((item) => {
        const percentage =
          total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <HStack key={item.label} gap="3">
            <Text fontFamily="mono" fontSize="sm" minW="24" truncate>
              {item.label}
            </Text>
            <Box
              flex="1"
              bg="app-border"
              borderRadius="full"
              h="2"
              overflow="hidden"
            >
              <Box
                bg="brand.solid"
                h="full"
                borderRadius="full"
                width={`${percentage}%`}
              />
            </Box>
            <Text
              fontFamily="mono"
              fontSize="sm"
              color="fg.muted"
              minW="16"
              textAlign="right"
            >
              {item.count} · {percentage}%
            </Text>
          </HStack>
        );
      })}
    </Stack>
  );
}
