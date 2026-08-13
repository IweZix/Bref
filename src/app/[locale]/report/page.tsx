import { Container, Flex, Heading, Stack } from '@chakra-ui/react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ReportForm } from '@/components/shortener/report-form';
import { tKeys } from '@/localization/tKeys';

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const t = await getTranslations();
  const { slug } = await searchParams;
  if (!slug) notFound();

  return (
    <Flex direction="column" minH="100vh" align="center" justify="center">
      <Container maxW="md">
        <Stack
          gap="4"
          p="6"
          borderWidth="1px"
          borderColor="app-border"
          borderRadius="lg"
          bg="app-bg"
        >
          <Heading fontFamily="mono" fontSize="lg">
            {t(tKeys.shortener.pages.report.heading)}
          </Heading>
          <ReportForm slug={slug} />
        </Stack>
      </Container>
    </Flex>
  );
}
