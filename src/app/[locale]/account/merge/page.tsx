import {
  Link as ChakraLink,
  Container,
  Flex,
  Heading,
  Stack,
} from '@chakra-ui/react';
import { getTranslations } from 'next-intl/server';
import { AccountMergeConfirmation } from '@/components/account/account-merge-confirmation';
import { ColorModeButton } from '@/components/ui/color-mode';
import { Link } from '@/localization/navigation';
import { tKeys } from '@/localization/tKeys';

export default async function AccountMergePage() {
  const t = await getTranslations();

  return (
    <Flex direction="column" minH="100vh">
      <Flex
        as="header"
        justify="space-between"
        align="center"
        px={{ base: 4, md: 8 }}
        py="5"
      >
        <ChakraLink asChild fontFamily="mono" fontWeight="bold" fontSize="xl">
          <Link href="/">bref.</Link>
        </ChakraLink>
        <ColorModeButton />
      </Flex>

      <Container flex="1" maxW="xl" pb="12">
        <Stack gap="4">
          <Heading fontFamily="mono" fontSize="lg">
            {t(tKeys.shortener.pages.accountMerge.heading)}
          </Heading>
          <AccountMergeConfirmation />
        </Stack>
      </Container>
    </Flex>
  );
}
