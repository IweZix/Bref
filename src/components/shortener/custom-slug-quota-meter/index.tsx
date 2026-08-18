import { Box, HStack, Text } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { tKeys } from '@/localization/tKeys';

/**
 * Single-bar variant of percentage-bar-list's hand-rolled meter (app-border
 * track, brand.solid fill) -- not Chakra's Progress component, to match
 * this codebase's consistent preference for small custom primitives.
 */
export function CustomSlugQuotaMeter({
  used,
  quota,
}: {
  used: number;
  quota: number;
}) {
  const t = useTranslations();
  const percentage =
    quota > 0 ? Math.min(Math.round((used / quota) * 100), 100) : 100;

  return (
    <HStack gap="2">
      <Box
        flex="1"
        bg="app-border"
        borderRadius="full"
        h="1.5"
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
        fontSize="xs"
        color="fg.muted"
        whiteSpace="nowrap"
      >
        {t(tKeys.shortener.customSlugQuotaMeter.label, { used, quota })}
      </Text>
    </HStack>
  );
}
