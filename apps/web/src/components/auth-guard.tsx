'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole: 'ADMIN' | 'EVALUATOR' | 'TEAM';
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [hydrated, setHydrated] = useState(false);

  // Wait for zustand persist to hydrate from localStorage
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // If already hydrated (e.g. navigating between pages)
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      const loginPath = requiredRole === 'ADMIN' ? '/admin' :
                       requiredRole === 'EVALUATOR' ? '/evaluate' :
                       '/submit';
      router.push(loginPath);
    } else if (user.role !== requiredRole) {
      router.push('/');
    }
  }, [user, requiredRole, router, hydrated]);

  // Show loading while hydrating or checking auth
  if (!hydrated || !user || user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-600" />
          <p className="mt-4 text-slate-600">Vérification de l&apos;authentification...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}