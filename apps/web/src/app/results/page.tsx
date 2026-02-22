'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PublicSession {
  id: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
}

export default function ResultsLandingPage() {
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const response = await fetch(`${API_URL}/sessions/public`);
        if (!response.ok) {
          setError('Impossible de charger les sessions');
          return;
        }
        const data: PublicSession[] = await response.json();
        setSessions(data);
      } catch {
        setError('Impossible de se connecter au serveur');
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, []);

  const closedSessions = sessions.filter((s) => s.status === 'CLOSED');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Résultats des sessions
          </h1>
          <p className="text-slate-500">
            Consultez les résultats et matrices de positionnement des sessions clôturées.
          </p>
        </div>

        {error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-600">{error}</p>
            </CardContent>
          </Card>
        ) : closedSessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600 text-lg mb-2">Aucune session clôturée</p>
              <p className="text-slate-400">
                Les résultats seront disponibles lorsqu&apos;une session sera clôturée.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {closedSessions.map((session) => (
              <Link key={session.id} href={`/results/${session.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <BarChart3 className="w-8 h-8 text-slate-400" />
                      <Badge className="bg-red-100 text-red-700 border-red-200">
                        Terminée
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {session.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Cliquez pour voir les résultats
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
