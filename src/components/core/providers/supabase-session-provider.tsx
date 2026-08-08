'use client';

import type { Session } from '@supabase/supabase-js';
import { createContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export const SupabaseSessionContext = createContext<{
  session: Session | null;
  isLoading: boolean;
}>({ session: null, isLoading: true });

export default function SupabaseSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (isMounted) {
          setSession(data.session);
          setIsLoading(false);
        }
        return;
      }

      const { data: anonData, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error('Failed to create anonymous session', error);
      }
      if (isMounted) {
        setSession(anonData.session);
        setIsLoading(false);
      }
    }

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SupabaseSessionContext.Provider value={{ session, isLoading }}>
      {children}
    </SupabaseSessionContext.Provider>
  );
}
