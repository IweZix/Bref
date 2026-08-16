import { Flex } from '@chakra-ui/react';
import { SiteHeader } from '@/components/core/site-header';

export default function About() {
  return (
    <Flex direction="column" minH="100vh">
      <SiteHeader />
      <h1>about</h1>
    </Flex>
  );
}
