'use client';

import { useUserData } from '@/lib/context/user-data';

type SnackDetail = 'recipe_name' | 'instructions';

interface QuickSnackProps {
  field: SnackDetail;
  className?: string;
}

export default function QuickSnackGen({ field, className }: QuickSnackProps) {
  const data = useUserData();

  if (data.loading) return null;

  const value = field === 'recipe_name' ? data.snack_name : data.snack_instructions;

  return (
    <span className={className}>
      {value ?? 'No snack found'}
    </span>
  );
}