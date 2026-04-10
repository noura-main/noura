'use client';

import { useUserData } from '@/lib/context/user-data';

type TimeField = 'breakfast' | 'lunch' | 'dinner';

interface MealTimeDay {
  field: TimeField;
  className?: string;
}

export default function MealPlan({ field, className }: MealTimeDay) {
  const data = useUserData();

  if (data.loading) return null;

  return (
    <span className={className}>
      {data[field] ?? 'Nothing planned yet !'}
    </span>
  );
}