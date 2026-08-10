import { Container, Flex, Heading, Stack } from '@chakra-ui/react';
import { notFound } from 'next/navigation';
import { ReportForm } from '@/components/shortener/report-form';

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
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
            Signaler un lien
          </Heading>
          <ReportForm slug={slug} />
        </Stack>
      </Container>
    </Flex>
  );
}
