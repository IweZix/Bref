'use client';

import { Box, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { BotToggle, type ClickFilter } from '@/components/shortener/bot-toggle';
import {
  ClicksTimelineChart,
  type TimelinePoint,
} from '@/components/shortener/clicks-timeline-chart';
import { DayOfWeekChart } from '@/components/shortener/day-of-week-chart';
import { PercentageBarList } from '@/components/shortener/percentage-bar-list';
import type { ClickRecord } from '@/lib/shortener/get-link-detail';
import { tKeys } from '@/localization/tKeys';

const TIMELINE_DAYS = 14;

function toDayKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD, UTC-based grouping
}

function countBy<T>(
  items: T[],
  keyOf: (item: T) => string | null,
  unknownLabel: string,
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item) ?? unknownLabel;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

type Translator = ReturnType<typeof useTranslations>;

function getDeviceLabels(t: Translator): Record<string, string> {
  return {
    mobile: t(tKeys.shortener.linkDetailStats.deviceLabel.mobile),
    desktop: t(tKeys.shortener.linkDetailStats.deviceLabel.desktop),
    tablet: t(tKeys.shortener.linkDetailStats.deviceLabel.tablet),
  };
}

function getSourceLabels(t: Translator): Record<string, string> {
  return {
    web: t(tKeys.shortener.linkDetailStats.sourceLabel.web),
    qr: t(tKeys.shortener.linkDetailStats.sourceLabel.qr),
  };
}

export function LinkDetailStats({ clicks }: { clicks: ClickRecord[] }) {
  const t = useTranslations();
  const format = useFormatter();
  const unknownLabel = t(tKeys.shortener.linkDetailStats.unknown);
  const directAccessLabel = t(tKeys.shortener.linkDetailStats.directAccess);
  const DEVICE_LABEL = getDeviceLabels(t);
  const SOURCE_LABEL = getSourceLabels(t);
  const [filter, setFilter] = useState<ClickFilter>('humans');

  const humanCount = useMemo(
    () => clicks.filter((click) => !click.isBot).length,
    [clicks],
  );
  const botCount = useMemo(
    () => clicks.filter((click) => click.isBot).length,
    [clicks],
  );

  const filteredClicks = useMemo(() => {
    if (filter === 'all') return clicks;
    if (filter === 'bots') return clicks.filter((click) => click.isBot);
    return clicks.filter((click) => !click.isBot);
  }, [clicks, filter]);

  const timelinePoints: TimelinePoint[] = useMemo(() => {
    const today = new Date();
    const days: { key: string; date: Date }[] = [];
    for (let i = TIMELINE_DAYS - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push({ key: date.toISOString().slice(0, 10), date });
    }

    const countsByDayKey = new Map<string, number>();
    for (const click of filteredClicks) {
      const key = toDayKey(click.clickedAt);
      countsByDayKey.set(key, (countsByDayKey.get(key) ?? 0) + 1);
    }

    return days.map(({ key, date }) => ({
      date: format.dateTime(date, { day: 'numeric', month: 'short' }),
      clicks: countsByDayKey.get(key) ?? 0,
    }));
  }, [filteredClicks, format]);

  const countsByDayOfWeek = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const counts = new Array(7).fill(0);
    for (const click of filteredClicks) {
      const date = new Date(click.clickedAt);
      if (date.getTime() < sevenDaysAgo) continue;
      counts[date.getDay()] += 1;
    }
    return counts;
  }, [filteredClicks]);

  const countryBars = useMemo(
    () => countBy(filteredClicks, (click) => click.country, unknownLabel),
    [filteredClicks, unknownLabel],
  );
  const referrerBars = useMemo(
    () =>
      countBy(
        filteredClicks,
        (click) => click.referrerHost ?? directAccessLabel,
        unknownLabel,
      ),
    [filteredClicks, directAccessLabel, unknownLabel],
  );
  const deviceBars = useMemo(
    () =>
      countBy(
        filteredClicks,
        (click) => DEVICE_LABEL[click.deviceType] ?? click.deviceType,
        unknownLabel,
      ),
    [filteredClicks, DEVICE_LABEL, unknownLabel],
  );
  const sourceBars = useMemo(
    () =>
      countBy(
        filteredClicks,
        (click) => SOURCE_LABEL[click.source] ?? click.source,
        unknownLabel,
      ),
    [filteredClicks, SOURCE_LABEL, unknownLabel],
  );
  // Before any QR has ever been scanned, the split isn't uncertain like a
  // country or referrer can be — it's trivially "100% Web", which tells the
  // owner nothing and wrongly implies a QR campaign was tried and fell flat
  // rather than never having been distributed at all. Hidden entirely
  // (not even the title) until there's an actual scan to report.
  const hasQrScans = useMemo(
    () => filteredClicks.some((click) => click.source === 'qr'),
    [filteredClicks],
  );

  return (
    <Stack gap="8">
      <SimpleGrid columns={2} gap="4">
        <Stack
          gap="0"
          p="4"
          borderWidth="1px"
          borderColor="app-border"
          borderRadius="lg"
          bg="app-bg"
          textAlign="center"
        >
          <Text fontFamily="mono" fontSize="3xl" fontWeight="bold">
            {humanCount}
          </Text>
          <Text fontFamily="mono" fontSize="sm" color="fg.muted">
            {t(tKeys.shortener.linkDetailStats.humanClicks)}
          </Text>
        </Stack>
        <Stack
          gap="0"
          p="4"
          borderWidth="1px"
          borderColor="app-border"
          borderRadius="lg"
          bg="app-bg"
          textAlign="center"
        >
          <Text fontFamily="mono" fontSize="3xl" fontWeight="bold">
            {botCount}
          </Text>
          <Text fontFamily="mono" fontSize="sm" color="fg.muted">
            {t(tKeys.shortener.linkDetailStats.botPreviews)}
          </Text>
        </Stack>
      </SimpleGrid>

      <HStack justify="space-between" wrap="wrap" gap="3">
        <Text fontFamily="mono" fontWeight="bold" fontSize="sm">
          {t(tKeys.shortener.linkDetailStats.timelineHeading)}
        </Text>
        <BotToggle value={filter} onChange={setFilter} />
      </HStack>

      <Box>
        <ClicksTimelineChart points={timelinePoints} />
      </Box>

      <DayOfWeekChart countsByDay={countsByDayOfWeek} />

      <SimpleGrid columns={{ base: 1, md: 2 }} gap="8">
        <PercentageBarList
          title={t(tKeys.shortener.linkDetailStats.countryTitle)}
          items={countryBars}
        />
        <PercentageBarList
          title={t(tKeys.shortener.linkDetailStats.referrerTitle)}
          items={referrerBars}
        />
      </SimpleGrid>

      <PercentageBarList
        title={t(tKeys.shortener.linkDetailStats.deviceTitle)}
        items={deviceBars}
      />

      {hasQrScans && (
        <PercentageBarList
          title={t(tKeys.shortener.linkDetailStats.sourceTitle)}
          items={sourceBars}
        />
      )}
    </Stack>
  );
}
