import { Container, Flex, Heading, Stack } from '@chakra-ui/react';
import { getTranslations } from 'next-intl/server';
import { AccountMergeConfirmation } from '@/components/account/account-merge-confirmation';
import { SiteHeader } from '@/components/core/site-header';
import { tKeys } from '@/localization/tKeys';

export default async function AccountMergePage() {
  const t = await getTranslations();

  return (
    <Flex direction="column" minH="100vh">
      <SiteHeader />

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
