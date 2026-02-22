'use client';

import { usePathname } from 'next/navigation';
import { Upload, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthGuard } from '@/components/auth-guard';
import { useAuthStore } from '@/lib/auth-store';

function SubmitShell({ children }: { children: React.ReactNode }) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <AuthGuard requiredRole="TEAM">
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-lg">Arbitr - Soumission</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                {user?.name || 'Équipe'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-600 hover:text-slate-900"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}

export default function SubmitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === '/submit') {
    return <>{children}</>;
  }

  return <SubmitShell>{children}</SubmitShell>;
}
