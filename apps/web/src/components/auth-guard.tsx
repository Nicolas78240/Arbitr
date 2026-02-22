'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole: 'ADMIN' | 'EVALUATOR' | 'TEAM';
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) {
      // Redirect to appropriate login page
      const loginPath = requiredRole === 'ADMIN' ? '/admin' :
                       requiredRole === 'EVALUATOR' ? '/evaluate' :
                       '/submit';
      router.push(loginPath);
    } else if (user.role !== requiredRole) {
      // Wrong role, redirect to home
      router.push('/');
    }
  }, [user, requiredRole, router]);

  // Show loading while checking auth
  if (!user || user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-600" />
          <p className="mt-4 text-slate-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}