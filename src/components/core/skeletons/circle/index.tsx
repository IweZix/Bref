import { SkeletonCircle } from '@chakra-ui/react';
import { CircleSkeletonProps } from './props';

export const CircleSkeleton = ({
  width = '100%',
  height = '100%',
}: CircleSkeletonProps) => {
  return <SkeletonCircle width={width} height={height} borderRadius="full" />;
};
