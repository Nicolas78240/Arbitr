'use client';

import { usePathname } from 'next/navigation';
import { AdminShell } from './admin-shell';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Don't wrap login page with protected shell
  if (pathname === '/admin') {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
