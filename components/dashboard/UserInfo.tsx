'use client';

import { useUserData } from '@/lib/context/user-data';

type UserField = 'full_name' | 'email';

interface UserInfoProps {
  field: UserField;
  className?: string;
}

export default function UserInfo({ field, className }: UserInfoProps) {
  const data = useUserData();

  if (data.loading) return null;

  const value =
    field === 'full_name'
      ? (data.full_name?.split(' ')[0] ?? 'Not found')
      : (data.email ?? 'Not found');

  return <span className={className}>{value}</span>;
}