import { useContext } from 'react';
import { SupabaseSessionContext } from '@/components/core/providers/supabase-session-provider';

export function useSupabaseSession() {
  return useContext(SupabaseSessionContext);
}
