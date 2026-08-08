import { Skeleton } from '@chakra-ui/react';
import { RectangleSkeletonProps } from './props';

export const RectangleSkeleton = ({
  width = '100%',
  height = '100%',
  borderRadius = 'md',
}: RectangleSkeletonProps) => {
  return <Skeleton width={width} height={height} borderRadius={borderRadius} />;
};
