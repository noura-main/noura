'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type TimeField = 'breakfast' | 'lunch' | 'dinner'; 

interface MealTimeDay {
  field: TimeField;
  className?: string;
}

export default function MealPlan({ field, className }: MealTimeDay) {
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
            .select('recipe_name')
            .eq('user_id', user.id)
            .eq('date', new Date().toLocaleDateString('en-CA'))
            .eq('meal_type', field)
            .maybeSingle();
        
            if (error) throw error;
        
        console.log(field);
      if (data) {
        setValue(data.recipe_name);
      } else {
        setValue(null);
      }

      } catch (err) {
        console.error(`Error fetching ${field}:`, err);
      } finally {
        setLoading(false);
      }
    }

    fetchField();
  }, [field]);

  if (loading) return;

  return (
    <span className={className}>
      {value ?? "Nothing planned yet !"}
    </span>
  );
}