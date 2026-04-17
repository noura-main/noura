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
      ? (
          data.first_name ??
          data.full_name?.split(' ')[0] ??
          (data.email ? data.email.split('@')[0] : null) ??
          'there'
        )
      : (data.email ?? ' ');

  return <span className={className}>{value}</span>;
}