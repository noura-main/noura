'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type SnackDetail = 'recipe_name' | 'instructions'; 

interface QuickSnackProps {
  field: SnackDetail;
  className?: string;
}

export default function QuickSnackGen({ field, className }: QuickSnackProps) {
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchField() {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('meal_plans')
            .select(field)
            .eq('user_id', user.id)
            .eq('date', new Date().toLocaleDateString('en-CA'))
            .eq('meal_type', 'snack')
            .maybeSingle();

        if (error) throw error;

        if (data) {
          // ✅ Fix: Cast to Record to allow indexing with the 'field' variable
          const record = data as Record<string, any>;
          setValue(record[field]);
        } else {
          setValue(null);
        }
  
      } catch (err) {
        console.error(`Error fetching snack ${field}:`, err);
      } finally {
        setLoading(false);
      }
    }

    fetchField();
  }, [field]);

  if (loading) return null;

  return (
    <span className={className}>
      {value ?? "No snack found"}
    </span>
  );
}