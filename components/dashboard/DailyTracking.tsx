'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type DailyStatField = 'calories' | 'protein'; 

interface DailyTrackingProps {
  field: DailyStatField;
  className?: string;
}

export default function DailyTracking({ field, className }: DailyTrackingProps) {
  const [value, setValue] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchField() {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('daily_logs')
            .select(field)
            .eq('user_id', user.id)
            .eq('date', new Date().toLocaleDateString('en-CA'))
            .maybeSingle();
            
        console.log(user.id, new Date().toLocaleDateString('en-CA'))
        console.log("Query Results:", { data, error, field });

        if (error) throw error;
        if (data) {
            setValue((data as Record<string, any>)[field]);
        } else {
            setValue(0);
        }
  
      } catch (err) {
        console.error(`Error fetching ${field}:`, err);
        setValue(0);
      } finally {
        setLoading(false);
      }
    }

    fetchField();
  }, [field]);

  if (loading) return;

  return (
    <span className={className}>
      {value ?? 0}
    </span>
  );
}