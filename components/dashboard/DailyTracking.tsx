'use client';

import { useUserData } from '@/lib/context/user-data';

type DailyStatField = 'calories' | 'protein';

interface DailyTrackingProps {
  field: DailyStatField;
  className?: string;
}

export default function DailyTracking({ field, className }: DailyTrackingProps) {
  const data = useUserData();

  if (data.loading) return null;

  return <span className={className}>{data[field] ?? 0}</span>;
}