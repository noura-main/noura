'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type UserField = 'full_name' | 'email'; 

interface UserInfoProps {
  field: UserField;
  className?: string;
}

export default function UserInfo({ field, className }: UserInfoProps) {
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchField() {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (field === 'email') {
          setValue(user.email ?? null);
        } else {
          const { data } = await supabase
            .from('profiles')
            .select(field)
            .eq('id', user.id)
            .single();
          
          setValue(data?.[field] ?? null);
        }
      } catch (err) {
        console.error(`Error fetching ${field}:`, err);
      } finally {
        setLoading(false);
      }
    }

    fetchField();
  }, [field]);

  if (loading) return <div className="h-4 w-24 bg-gray-100 animate-pulse rounded" />;

  const displayValue = (field === 'full_name') 
    ? value?.split(' ')[0] 
    : value;

  return (
    <span className={className}>
      {displayValue || 'Not found'}
    </span>
  );
}