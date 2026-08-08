import { Stack, Text } from '@chakra-ui/react';

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Stack
      gap="2"
      align="center"
      textAlign="center"
      py="16"
      px="6"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="app-border"
      borderRadius="lg"
      color="fg.muted"
    >
      <Text fontFamily="mono" fontWeight="bold" fontSize="lg" color="fg">
        {title}
      </Text>
      <Text fontFamily="mono" fontSize="sm" maxW="sm">
        {description}
      </Text>
    </Stack>
  );
}
