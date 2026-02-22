'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, BarChart3, ExternalLink, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SessionWithCounts {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  _count: {
    projects: number;
    evaluators: number;
    teams: number;
    criteria: number;
  };
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'ACTIVE':
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          Active
        </Badge>
      );
    case 'CLOSED':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          Terminée
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="bg-slate-100 text-slate-700">
          Brouillon
        </Badge>
      );
  }
}

export default function AdminResultsPage() {
  const [sessions, setSessions] = useState<SessionWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const { accessToken } = useAuthStore();

  const fetchSessions = useCallback(async () => {
    try {
      const data = await api.get<SessionWithCounts[]>('/sessions');
      setSessions(data);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Impossible de charger les sessions';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleExport = async (sessionId: string) => {
    if (!accessToken) return;
    setExportingId(sessionId);
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}/results/export`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        toast.error('Erreur lors de l\'export');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = response.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      a.download = filenameMatch?.[1] || `résultats-${sessionId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error('Erreur lors de l\'export');
    } finally {
      setExportingId(null);
    }
  };

  // Show sessions that have results (ACTIVE or CLOSED with projects)
  const sessionsWithResults = sessions.filter(
    (s) => (s.status === 'ACTIVE' || s.status === 'CLOSED') && s._count.projects > 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">
        Résultats des Sessions
      </h1>

      {sessionsWithResults.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 text-lg mb-2">Aucun résultat disponible</p>
            <p className="text-slate-400">
              Les résultats apparaîtront lorsqu&apos;une session active ou clôturée contiendra des projets évalués.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessionsWithResults.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {session.name}
                      </h3>
                      <StatusBadge status={session.status} />
                    </div>
                    {session.description && (
                      <p className="text-sm text-slate-500 mb-3">
                        {session.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>{session._count.projects} projets</span>
                      <span>{session._count.evaluators} évaluateurs</span>
                      <span>{session._count.criteria} critères</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExport(session.id)}
                      disabled={exportingId === session.id}
                    >
                      {exportingId === session.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-1" />
                          CSV
                        </>
                      )}
                    </Button>
                    <Link href={`/results/${session.id}`} target="_blank">
                      <Button size="sm">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Voir la matrice
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
