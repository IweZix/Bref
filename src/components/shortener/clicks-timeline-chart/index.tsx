'use client';

import { Box, Text } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { tKeys } from '@/localization/tKeys';

export type TimelinePoint = {
  date: string; // pre-formatted short label, e.g. "8 août"
  clicks: number;
};

const BRAND_LINE_COLOR = '#2f7a4f';
const GRID_COLOR = '#00000014';
const AXIS_COLOR = '#8a8577';

export function ClicksTimelineChart({ points }: { points: TimelinePoint[] }) {
  const t = useTranslations();
  if (points.every((point) => point.clicks === 0)) {
    return (
      <Text fontFamily="mono" fontSize="sm" color="fg.subtle">
        {t(tKeys.shortener.clicksTimelineChart.emptyState)}
      </Text>
    );
  }

  return (
    <Box
      h="56"
      fontFamily="mono"
      aria-label={t(tKeys.shortener.clicksTimelineChart.ariaLabel)}
      role="img"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke={GRID_COLOR} />
          <XAxis
            dataKey="date"
            tick={{
              fontSize: 11,
              fill: AXIS_COLOR,
              fontFamily: 'var(--font-mono)',
            }}
            axisLine={{ stroke: GRID_COLOR }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{
              fontSize: 11,
              fill: AXIS_COLOR,
              fontFamily: 'var(--font-mono)',
            }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #dedad0',
            }}
            labelStyle={{ fontWeight: 'bold' }}
          />
          <Line
            type="monotone"
            dataKey="clicks"
            name={t(tKeys.shortener.clicksTimelineChart.seriesName)}
            stroke={BRAND_LINE_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: BRAND_LINE_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
