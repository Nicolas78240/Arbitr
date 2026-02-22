'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Star, LogOut, ClipboardList, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthGuard } from '@/components/auth-guard';
import { useAuthStore } from '@/lib/auth-store';

function EvaluateSubNav({ sessionId }: { sessionId: string }) {
  const pathname = usePathname();
  const isResults = pathname.endsWith('/results');

  const tabs = [
    {
      label: 'Mes évaluations',
      href: `/evaluate/${sessionId}`,
      active: !isResults,
      icon: ClipboardList,
    },
    {
      label: 'Résultats en direct',
      href: `/evaluate/${sessionId}/results`,
      active: isResults,
      icon: BarChart3,
    },
  ];

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="container mx-auto px-4">
        <nav className="flex space-x-1">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${
                  tab.active
                    ? 'border-green-600 text-green-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function EvaluateShell({ children }: { children: React.ReactNode }) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  // Extract sessionId from pathname: /evaluate/[sessionId] or /evaluate/[sessionId]/results
  const segments = pathname.split('/').filter(Boolean);
  const sessionId = segments.length >= 2 ? segments[1] : null;

  return (
    <AuthGuard requiredRole="EVALUATOR">
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-lg">Arbitr - Évaluation</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                {user?.name || 'Évaluateur'}
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
        {sessionId && <EvaluateSubNav sessionId={sessionId} />}
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}

export default function EvaluateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === '/evaluate') {
    return <>{children}</>;
  }

  return <EvaluateShell>{children}</EvaluateShell>;
}
