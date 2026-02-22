'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Users, Settings, LogOut, BarChart, LayoutDashboard, Target, Grid3X3, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthGuard } from '@/components/auth-guard';
import { useAuthStore } from '@/lib/auth-store';

const navItems = [
  { href: '/admin/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/sessions', label: 'Sessions', icon: FileText },
  { href: '/admin/criteria', label: 'Critères', icon: Target },
  { href: '/admin/fields', label: 'Champs', icon: ClipboardList },
  { href: '/admin/evaluators', label: 'Évaluateurs', icon: Users },
  { href: '/admin/teams', label: 'Équipes', icon: Users },
  { href: '/admin/quadrants', label: 'Quadrants', icon: Grid3X3 },
  { href: '/admin/results', label: 'Résultats', icon: BarChart },
  { href: '/admin/settings', label: 'Paramètres', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <AuthGuard requiredRole="ADMIN">
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/admin/dashboard" className="flex items-center space-x-2">
                <Home className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-lg">Arbitr Admin</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                {user?.name || 'Administrateur'}
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

        <div className="flex">
          <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)]">
            <nav className="p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
